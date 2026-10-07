import type { AppConfig } from "../config.js";
import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import { decryptMfaSecret, hashRecoveryCode, verifyTotp } from "../security/mfa.js";
import { hashPassword, verifyPassword } from "../security/password.js";
import { hashToken, randomToken } from "../security/tokens.js";
import type {
  AuthContext,
  AuthOrganization,
  CurrentUser,
  EffectiveRole,
} from "../types/auth.js";
import { recordAudit } from "./audit-service.js";

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  full_name: string;
  mfa_required: boolean;
  password_hash: string | null;
  status: string;
  failed_login_count: number;
  locked_until: Date | null;
}

interface SessionRow extends QueryResultRow {
  session_id: string;
  csrf_token_hash: Buffer;
  user_id: string;
  email: string;
  full_name: string;
  mfa_required: boolean;
}

interface PermissionRow extends QueryResultRow {
  code: string;
}

interface MenuRow extends QueryResultRow {
  code: string;
  parent_code: string | null;
  label: string;
  icon: string | null;
  route_name: string | null;
  display_order: number;
}

export interface LoginInput {
  identifier: string;
  password: string;
  mfaCode?: string | undefined;
  recoveryCode?: string | undefined;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string;
}

export interface LoginResult {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  user: CurrentUser;
}

export interface EffectiveMenuItem {
  code: string;
  label: string;
  icon: string | null;
  route_name: string | null;
  display_order: number;
  children: EffectiveMenuItem[];
}

const dummyPasswordHash = hashPassword(randomToken(24));

export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly config: AppConfig,
  ) {}

  async login(input: LoginInput): Promise<LoginResult | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, email::text, full_name, password_hash, status,
              failed_login_count, locked_until, mfa_required
       FROM sababuka.users
       WHERE email = $1::citext OR username = $1::citext
       LIMIT 1`,
      [input.identifier],
    );
    const user = result.rows[0];

    if (!user) {
      await verifyPassword(await dummyPasswordHash, input.password);
      await this.auditFailedLogin(null, input, "unknown_identifier");
      return null;
    }

    if (
      user.status !== "active" ||
      (user.locked_until !== null && user.locked_until.getTime() > Date.now()) ||
      !user.password_hash
    ) {
      await verifyPassword(await dummyPasswordHash, input.password);
      await this.auditFailedLogin(user.id, input, "account_unavailable");
      return null;
    }

    const passwordValid = await verifyPassword(user.password_hash, input.password);
    if (!passwordValid) {
      await this.recordLoginFailure(user, input, "invalid_password");
      return null;
    }

    if (user.mfa_required) {
      if (!input.mfaCode && !input.recoveryCode) {
        await this.auditFailedLogin(user.id, input, "mfa_required");
        throw new ApiError(401, "MFA_REQUIRED", "Kode MFA diperlukan.");
      }
      const mfaValid = await this.verifyLoginMfa(user.id, input.mfaCode, input.recoveryCode);
      if (!mfaValid) {
        await this.recordLoginFailure(user, input, "invalid_mfa");
        throw new ApiError(401, "MFA_INVALID", "Kode MFA tidak valid.");
      }
    }

    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(Date.now() + this.config.sessionTtlSeconds * 1000);
    const client = await this.db.connect();
    let sessionId: string;

    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE sababuka.users
         SET failed_login_count = 0, locked_until = NULL, last_login_at = now()
         WHERE id = $1`,
        [user.id],
      );
      const session = await client.query<{ id: string }>(
        `INSERT INTO sababuka.auth_sessions
           (user_id, token_hash, csrf_token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4::inet, $5, $6)
         RETURNING id`,
        [user.id, hashToken(sessionToken), hashToken(csrfToken), input.ipAddress, input.userAgent, expiresAt],
      );
      sessionId = session.rows[0]!.id;
      await recordAudit(client, {
        actorId: user.id,
        eventType: "auth.login_succeeded",
        entityType: "auth_session",
        entityId: sessionId,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const auth = await this.getAuthContext(hashToken(sessionToken));
    if (!auth) throw new Error("Sesi yang baru dibuat tidak dapat dimuat.");

    return { sessionToken, csrfToken, expiresAt, user: auth.user };
  }

  async getAuthContext(tokenHash: Buffer): Promise<AuthContext | null> {
    const result = await this.db.query<SessionRow>(
      `SELECT s.id AS session_id, s.csrf_token_hash, u.id AS user_id,
              u.email::text, u.full_name, u.mfa_required
       FROM sababuka.auth_sessions s
       JOIN sababuka.users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
         AND u.status = 'active'
         AND (u.locked_until IS NULL OR u.locked_until <= now())
       LIMIT 1`,
      [tokenHash],
    );
    const session = result.rows[0];
    if (!session) return null;

    const [rolesResult, permissionsResult, organizationsResult] = await Promise.all([
      this.db.query<EffectiveRole & QueryResultRow>(
        `SELECT r.code, ura.scope_type, ura.organization_id::text
         FROM sababuka.user_role_assignments ura
         JOIN sababuka.roles r ON r.id = ura.role_id AND r.is_active = true
         WHERE ura.user_id = $1
           AND ura.starts_at <= now()
           AND (ura.ends_at IS NULL OR ura.ends_at > now())
         ORDER BY r.code, ura.scope_type, ura.organization_id`,
        [session.user_id],
      ),
      this.db.query<PermissionRow>(
        `SELECT DISTINCT p.code
         FROM sababuka.user_role_assignments ura
         JOIN sababuka.roles r ON r.id = ura.role_id AND r.is_active = true
         JOIN sababuka.role_permissions rp ON rp.role_id = r.id
         JOIN sababuka.permissions p ON p.id = rp.permission_id
         WHERE ura.user_id = $1
           AND ura.starts_at <= now()
           AND (ura.ends_at IS NULL OR ura.ends_at > now())
         ORDER BY p.code`,
        [session.user_id],
      ),
      this.db.query<AuthOrganization & QueryResultRow>(
        `SELECT DISTINCT o.id::text, o.code, o.name, o.short_name,
                o.organization_type, o.parent_id::text, o.is_active,
                o.created_at::text, o.updated_at::text
         FROM sababuka.organizations o
         WHERE o.id IN (
           SELECT om.organization_id
           FROM sababuka.organization_memberships om
           WHERE om.user_id = $1
             AND om.starts_at <= now()
             AND (om.ends_at IS NULL OR om.ends_at > now())
           UNION
           SELECT ura.organization_id
           FROM sababuka.user_role_assignments ura
           WHERE ura.user_id = $1
             AND ura.organization_id IS NOT NULL
             AND ura.starts_at <= now()
             AND (ura.ends_at IS NULL OR ura.ends_at > now())
         )
         ORDER BY o.name`,
        [session.user_id],
      ),
    ]);

    await this.db.query(
      `UPDATE sababuka.auth_sessions
       SET last_seen_at = now()
       WHERE id = $1 AND last_seen_at < now() - interval '5 minutes'`,
      [session.session_id],
    );

    return {
      sessionId: session.session_id,
      csrfTokenHash: session.csrf_token_hash,
      user: {
        id: session.user_id,
        email: session.email,
        full_name: session.full_name,
        mfa_required: session.mfa_required,
        roles: rolesResult.rows,
        permissions: permissionsResult.rows.map((row) => row.code),
        organizations: organizationsResult.rows,
      },
    };
  }

  async logout(
    auth: AuthContext,
    request: { requestId: string; ipAddress: string | null; userAgent: string | null },
  ): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE sababuka.auth_sessions
         SET revoked_at = now(), revoke_reason = 'user_logout'
         WHERE id = $1 AND revoked_at IS NULL`,
        [auth.sessionId],
      );
      await recordAudit(client, {
        actorId: auth.user.id,
        eventType: "auth.logout",
        entityType: "auth_session",
        entityId: auth.sessionId,
        requestId: request.requestId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getMenu(userId: string): Promise<EffectiveMenuItem[]> {
    const result = await this.db.query<MenuRow>(
      `SELECT DISTINCT m.code, parent.code AS parent_code, m.label, m.icon,
              m.route_name, COALESCE(rmi.display_order, m.display_order) AS display_order
       FROM sababuka.user_role_assignments ura
       JOIN sababuka.roles r ON r.id = ura.role_id AND r.is_active = true
       JOIN sababuka.role_menu_items rmi ON rmi.role_id = r.id AND rmi.is_visible = true
       JOIN sababuka.menu_items m ON m.id = rmi.menu_item_id AND m.is_active = true
       LEFT JOIN sababuka.menu_items parent ON parent.id = m.parent_id
       WHERE ura.user_id = $1
         AND ura.starts_at <= now()
         AND (ura.ends_at IS NULL OR ura.ends_at > now())
         AND (
           m.required_permission IS NULL
           OR EXISTS (
             SELECT 1
             FROM sababuka.role_permissions rp
             JOIN sababuka.permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = r.id AND p.code = m.required_permission
           )
         )
       ORDER BY display_order, m.label`,
      [userId],
    );

    const items = new Map<string, EffectiveMenuItem>();
    for (const row of result.rows) {
      items.set(row.code, {
        code: row.code,
        label: row.label,
        icon: row.icon,
        route_name: row.route_name,
        display_order: row.display_order,
        children: [],
      });
    }

    const roots: EffectiveMenuItem[] = [];
    for (const row of result.rows) {
      const item = items.get(row.code)!;
      const parent = row.parent_code ? items.get(row.parent_code) : undefined;
      if (parent) parent.children.push(item);
      else roots.push(item);
    }

    const sortItems = (entries: EffectiveMenuItem[]): void => {
      entries.sort((a, b) => a.display_order - b.display_order || a.label.localeCompare(b.label, "id"));
      for (const entry of entries) sortItems(entry.children);
    };
    sortItems(roots);
    return roots;
  }

  private async verifyLoginMfa(
    userId: string,
    mfaCode?: string,
    recoveryCode?: string,
  ): Promise<boolean> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      if (mfaCode) {
        if (!this.config.mfaEncryptionKey) {
          throw new ApiError(503, "INTERNAL_ERROR", "Konfigurasi enkripsi MFA belum tersedia.");
        }
        const result = await client.query<{
          id: string;
          encrypted_secret: Buffer;
          last_used_counter: string | null;
        }>(
          `SELECT id::text, encrypted_secret, last_used_counter::text
           FROM sababuka.user_mfa_methods
           WHERE user_id = $1 AND method_type = 'totp'
             AND verified_at IS NOT NULL AND disabled_at IS NULL
           ORDER BY is_primary DESC, verified_at DESC LIMIT 1 FOR UPDATE`,
          [userId],
        );
        const method = result.rows[0];
        if (!method) {
          await client.query("ROLLBACK");
          return false;
        }
        const counter = verifyTotp(
          decryptMfaSecret(method.encrypted_secret, this.config.mfaEncryptionKey),
          mfaCode,
          { afterCounter: method.last_used_counter === null ? null : Number(method.last_used_counter) },
        );
        if (counter === null) {
          await client.query("ROLLBACK");
          return false;
        }
        await client.query(
          `UPDATE sababuka.user_mfa_methods SET last_used_counter = $2 WHERE id = $1`,
          [method.id, counter],
        );
        await client.query("COMMIT");
        return true;
      }

      if (recoveryCode) {
        const result = await client.query<{
          id: string;
          credential_data: { hashes?: string[] };
        }>(
          `SELECT id::text, credential_data
           FROM sababuka.user_mfa_methods
           WHERE user_id = $1 AND method_type = 'recovery_codes'
             AND verified_at IS NOT NULL AND disabled_at IS NULL
           ORDER BY verified_at DESC LIMIT 1 FOR UPDATE`,
          [userId],
        );
        const method = result.rows[0];
        const hashes = method?.credential_data.hashes ?? [];
        const submittedHash = hashRecoveryCode(recoveryCode);
        const index = hashes.indexOf(submittedHash);
        if (!method || index < 0) {
          await client.query("ROLLBACK");
          return false;
        }
        const remaining = hashes.filter((_, currentIndex) => currentIndex !== index);
        await client.query(
          `UPDATE sababuka.user_mfa_methods
           SET credential_data = $2::jsonb,
               disabled_at = CASE WHEN cardinality($3::text[]) = 0 THEN now() ELSE disabled_at END
           WHERE id = $1`,
          [method.id, JSON.stringify({ hashes: remaining }), remaining],
        );
        await client.query("COMMIT");
        return true;
      }

      await client.query("ROLLBACK");
      return false;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async recordLoginFailure(user: UserRow, input: LoginInput, reason: string): Promise<void> {
    const nextCount = user.failed_login_count + 1;
    const lockAccount = nextCount >= this.config.loginMaxFailures;
    await this.db.query(
      `UPDATE sababuka.users
       SET failed_login_count = $2,
           locked_until = CASE WHEN $3 THEN now() + ($4 * interval '1 second') ELSE locked_until END
       WHERE id = $1`,
      [user.id, nextCount, lockAccount, this.config.loginLockSeconds],
    );
    await this.auditFailedLogin(user.id, input, lockAccount ? "locked" : reason);
  }

  private async auditFailedLogin(
    actorId: string | null,
    input: LoginInput,
    reason: string,
  ): Promise<void> {
    await recordAudit(this.db, {
      actorId,
      eventType: "auth.login_failed",
      entityType: "user",
      entityId: actorId,
      requestId: input.requestId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason },
    });
  }
}
