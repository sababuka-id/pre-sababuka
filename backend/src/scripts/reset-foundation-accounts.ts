import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";
import { hashPassword } from "../security/password.js";

const password = process.env.DEVELOPER_PASSWORD;
if (!password || password.length < 12) throw new Error("DEVELOPER_PASSWORD minimal 12 karakter.");
if (process.env.CONFIRM_ACCOUNT_RESET !== "RESET_TO_DEVELOPER_ONLY") throw new Error("CONFIRM_ACCOUNT_RESET tidak sesuai.");

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const client = await db.connect();

try {
  const passwordHash = await hashPassword(password);
  await client.query("BEGIN");
  const developer = await client.query<{ id: string }>(
    `INSERT INTO sababuka.users (email,username,full_name,password_hash,status,must_change_password,mfa_required,failed_login_count,locked_until,archived_at)
     VALUES ('developer@sababuka.com','developer','Developer SABABUKA',$1,'active',false,false,0,NULL,NULL)
     ON CONFLICT (email) DO UPDATE SET username='developer',full_name='Developer SABABUKA',password_hash=EXCLUDED.password_hash,
       status='active',must_change_password=false,mfa_required=false,failed_login_count=0,locked_until=NULL,archived_at=NULL,updated_at=now()
     RETURNING id::text`, [passwordHash],
  );
  const developerId = developer.rows[0]!.id;

  const targets = await client.query<{ id: string }>(
    `SELECT DISTINCT u.id::text
     FROM sababuka.users u
     LEFT JOIN sababuka.user_role_assignments ura ON ura.user_id=u.id AND ura.ends_at IS NULL
     LEFT JOIN sababuka.roles r ON r.id=ura.role_id
     LEFT JOIN sababuka.user_registration_requests rr ON rr.user_id=u.id AND rr.status='pending'
     WHERE u.id<>$1 AND u.archived_at IS NULL AND (r.code IN ('opd','bapperida','kominfo') OR rr.user_id IS NOT NULL)`,
    [developerId],
  );
  const targetIds = targets.rows.map((row) => row.id);
  await client.query(`UPDATE sababuka.auth_sessions SET revoked_at=now(),revoke_reason='foundation_account_reset' WHERE revoked_at IS NULL AND (user_id=$1 OR user_id=ANY($2::uuid[]))`, [developerId, targetIds]);
  await client.query(`UPDATE sababuka.user_invitations SET revoked_at=now() WHERE accepted_at IS NULL AND revoked_at IS NULL AND (user_id=$1 OR user_id=ANY($2::uuid[]))`, [developerId, targetIds]);
  await client.query(`UPDATE sababuka.organization_memberships SET ends_at=now(),is_primary=false WHERE ends_at IS NULL AND (user_id=$1 OR user_id=ANY($2::uuid[]))`, [developerId, targetIds]);
  await client.query(`UPDATE sababuka.user_role_assignments SET ends_at=now() WHERE ends_at IS NULL AND (user_id=$1 OR user_id=ANY($2::uuid[]))`, [developerId, targetIds]);
  await client.query(
    `UPDATE sababuka.user_registration_requests SET status='rejected',reviewed_by=$1,reviewed_at=now(),
       review_notes='Akun awal dibersihkan; silakan daftar kembali sebagai PIC resmi OPD.' WHERE status='pending' AND user_id=ANY($2::uuid[])`, [developerId, targetIds],
  );
  await client.query(
    `UPDATE sababuka.users SET status='archived',archived_at=now(),failed_login_count=0,locked_until=NULL,updated_at=now()
     WHERE id=ANY($1::uuid[])`, [targetIds],
  );
  await client.query(
    `INSERT INTO sababuka.organization_memberships (user_id,organization_id,membership_type,is_primary)
     SELECT $1,o.id,'administrator',true FROM sababuka.organizations o WHERE o.code='KAPUAS'
     ON CONFLICT (user_id,organization_id) DO UPDATE SET membership_type='administrator',is_primary=true,ends_at=NULL`, [developerId],
  );
  await client.query(
    `INSERT INTO sababuka.user_role_assignments (user_id,role_id,scope_type,assigned_by)
     SELECT $1,r.id,'global',$1 FROM sababuka.roles r WHERE r.code='superadmin'
     ON CONFLICT ON CONSTRAINT user_role_assignments_unique DO UPDATE
       SET ends_at=NULL,starts_at=now(),assigned_by=EXCLUDED.assigned_by`, [developerId],
  );
  await client.query(
    `INSERT INTO sababuka.audit_events (actor_id,event_type,entity_type,entity_id,after_data,metadata)
     VALUES ($1,'user.foundation_accounts_reset','user',$1,'{"remaining_active_accounts":1}'::jsonb,$2::jsonb)`,
    [developerId, JSON.stringify({ environment: config.nodeEnv })],
  );
  await client.query("COMMIT");
  const active = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM sababuka.users WHERE archived_at IS NULL`);
  console.log(JSON.stringify({ active_accounts: Number(active.rows[0]?.count ?? 0), archived_target_accounts: targetIds.length, developer_email: "developer@sababuka.com", environment: config.nodeEnv }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await db.end();
}
