import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";
import { hashPassword } from "../security/password.js";

const config = loadConfig();
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 16) throw new Error("DEMO_PASSWORD wajib diatur dan minimal 16 karakter.");

const db = createDatabase(config.databaseUrl);
const client = await db.connect();
try {
  await client.query("BEGIN");
  const passwordHash = await hashPassword(password);
  const user = await client.query<{ id: string }>(
    `INSERT INTO sababuka.users (email, full_name, password_hash, status, must_change_password, mfa_required)
     VALUES ('opd.dinkes@sababuka.com', 'Operator OPD Dinas Kesehatan', $1, 'active', true, false)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       status = 'active',
       failed_login_count = 0,
       locked_until = NULL,
       archived_at = NULL,
       password_hash = COALESCE(sababuka.users.password_hash, EXCLUDED.password_hash),
       must_change_password = CASE WHEN sababuka.users.password_hash IS NULL THEN true ELSE sababuka.users.must_change_password END
     RETURNING id::text`, [passwordHash],
  );
  const userId = user.rows[0]!.id;
  await client.query(`DELETE FROM sababuka.user_role_assignments WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM sababuka.organization_memberships WHERE user_id = $1`, [userId]);
  await client.query(
    `INSERT INTO sababuka.organization_memberships (user_id, organization_id, membership_type, is_primary)
     SELECT $1, id, 'operator', true FROM sababuka.organizations WHERE code = 'DINKES'
     ON CONFLICT (user_id, organization_id) DO UPDATE SET membership_type = 'operator', is_primary = true`, [userId],
  );
  await client.query(
    `INSERT INTO sababuka.user_role_assignments (user_id, role_id, organization_id, scope_type, assigned_by)
     SELECT $1, r.id, o.id, 'organization', $1
     FROM sababuka.roles r CROSS JOIN sababuka.organizations o
     WHERE r.code = 'opd' AND o.code = 'DINKES'
     ON CONFLICT (user_id, role_id, organization_id) DO UPDATE SET starts_at = now(), ends_at = NULL`, [userId],
  );
  await client.query("COMMIT");
  console.log("Akun pilot Dinkes siap: opd.dinkes@sababuka.com");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await db.end();
}
