import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";
import { hashPassword } from "../security/password.js";

const config = loadConfig();
if (config.nodeEnv !== "development") {
  throw new Error("Akun demo hanya boleh dibuat pada NODE_ENV=development.");
}

const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 16) {
  throw new Error("DEMO_PASSWORD wajib diatur dan minimal 16 karakter.");
}

const demoUsers = [
  { email: "developer@sababuka.com", name: "Developer SABABUKA", role: "superadmin", organization: "KAPUAS", scope: "global" },
  { email: "bapperida@sababuka.com", name: "Admin BAPPERIDA", role: "bapperida", organization: "BAPPERIDA", scope: "global" },
  { email: "kominfo@sababuka.com", name: "Admin KOMINFO", role: "kominfo", organization: "KAPUAS", scope: "global" },
  { email: "opd.dkpp@sababuka.com", name: "Operator OPD DKPP", role: "opd", organization: "DKPP", scope: "organization" },
  { email: "pimpinan@sababuka.com", name: "Pimpinan Daerah", role: "pimpinan", organization: "KAPUAS", scope: "published" },
] as const;

const db = createDatabase(config.databaseUrl);
const client = await db.connect();

try {
  const passwordHash = await hashPassword(password);
  await client.query("BEGIN");

  for (const demo of demoUsers) {
    const result = await client.query<{ id: string }>(
      `INSERT INTO sababuka.users
         (email, full_name, password_hash, status, must_change_password, mfa_required)
       VALUES ($1, $2, $3, 'active', false, false)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         status = 'active',
         must_change_password = false,
         mfa_required = false,
         failed_login_count = 0,
         locked_until = NULL,
         archived_at = NULL
       RETURNING id`,
      [demo.email, demo.name, passwordHash],
    );
    const userId = result.rows[0]!.id;

    await client.query(`DELETE FROM sababuka.user_role_assignments WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM sababuka.organization_memberships WHERE user_id = $1`, [userId]);
    await client.query(
      `INSERT INTO sababuka.organization_memberships
         (user_id, organization_id, membership_type, is_primary)
       SELECT $1, o.id, $2, true FROM sababuka.organizations o WHERE o.code = $3`,
      [userId, demo.role === "opd" ? "operator" : "administrator", demo.organization],
    );
    await client.query(
      `INSERT INTO sababuka.user_role_assignments
         (user_id, role_id, organization_id, scope_type, assigned_by)
       SELECT $1, r.id,
              CASE WHEN $3 = 'organization' THEN o.id ELSE NULL END,
              $3, $1
       FROM sababuka.roles r
       JOIN sababuka.organizations o ON o.code = $4
       WHERE r.code = $2`,
      [userId, demo.role, demo.scope, demo.organization],
    );
    await client.query(
      `INSERT INTO sababuka.audit_events
         (actor_id, event_type, entity_type, entity_id, metadata)
       VALUES ($1, 'user.demo_seeded', 'user', $1, $2::jsonb)`,
      [userId, JSON.stringify({ role: demo.role, environment: "development" })],
    );
  }

  await client.query("COMMIT");
  console.log("Akun demo development siap:");
  for (const demo of demoUsers) console.log(`- ${demo.role}: ${demo.email}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await db.end();
}
