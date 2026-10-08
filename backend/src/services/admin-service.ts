import type { AppConfig } from "../config.js";
import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import { hashToken, randomToken } from "../security/tokens.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

interface CountedRow extends QueryResultRow {
  total_count: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

export interface PageQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
}

export interface OrganizationInput {
  code: string;
  name: string;
  short_name?: string | null;
  organization_type: string;
  parent_id?: string | null;
}

export interface UserCreateInput {
  email: string;
  username?: string | null;
  full_name: string;
  organization_id: string;
}

export interface UserUpdateInput {
  username?: string | null;
  full_name?: string;
  status?: "invited" | "active" | "suspended" | "locked" | "archived";
  mfa_required?: boolean;
}

export interface RoleAssignmentInput {
  role_id: string;
  scope_type: "global" | "organization" | "self" | "published";
  organization_id?: string | null;
  ends_at?: string | null;
}

export type RoleScope = RoleAssignmentInput["scope_type"];

export const ROLE_SCOPE_RULES: Readonly<Record<string, readonly RoleScope[]>> = {
  superadmin: ["global"],
  bapperida: ["global"],
  kominfo: ["global"],
  opd: ["organization"],
  pimpinan: ["published"],
};

export function allowedScopesForRole(roleCode: string): readonly RoleScope[] {
  return ROLE_SCOPE_RULES[roleCode] ?? [];
}

export function assertRoleScope(roleCode: string, scopeType: RoleScope, organizationId?: string | null): void {
  const allowed = allowedScopesForRole(roleCode);
  if (!allowed.length || !allowed.includes(scopeType)) {
    throw new ApiError(400, "INVALID_ROLE_SCOPE", `Scope ${scopeType} tidak sah untuk role ${roleCode}.`);
  }
  if ((scopeType === "organization") !== Boolean(organizationId)) {
    throw new ApiError(400, "VALIDATION_ERROR", "organization_id wajib hanya untuk scope organization.");
  }
}

const PROTECTED_SUPERADMIN_PERMISSIONS = [
  "system.configure",
  "organization.manage",
  "user.view",
  "user.create",
  "user.update",
  "user.activate",
  "user.assign_role",
  "role.view",
  "role.manage",
  "menu.manage",
] as const;

const PROTECTED_SUPERADMIN_MENUS = [
  "administration",
  "organizations",
  "users",
  "roles",
  "menus",
  "system-settings",
] as const;

function pageEnvelope<T>(rows: (T & CountedRow)[], page: number, pageSize: number) {
  const total = Number(rows[0]?.total_count ?? 0);
  return {
    data: rows.map(({ total_count: _total, ...row }) => row),
    meta: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  };
}

function isGlobal(auth: AuthContext): boolean {
  return auth.user.roles.some((role) => role.scope_type === "global");
}

function organizationScope(auth: AuthContext): string[] {
  return [...new Set([
    ...auth.user.organizations.map((organization) => organization.id),
    ...auth.user.roles.flatMap((role) => role.organization_id ? [role.organization_id] : []),
  ])];
}

function requireGlobal(auth: AuthContext): void {
  if (!isGlobal(auth)) {
    throw new ApiError(403, "SCOPE_DENIED", "Tindakan ini memerlukan scope global.");
  }
}

function translateDatabaseError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === "23505") throw new ApiError(409, "CONFLICT", "Data dengan identitas yang sama sudah ada.");
  if (code === "23503") throw new ApiError(400, "VALIDATION_ERROR", "Referensi data tidak valid.");
  if (code === "23514" || code === "22P02") {
    throw new ApiError(400, "VALIDATION_ERROR", "Nilai tidak memenuhi aturan data.");
  }
  throw error;
}

export class AdminService {
  constructor(
    private readonly db: Database,
    private readonly config: AppConfig,
  ) {}

  async listOrganizations(auth: AuthContext, query: PageQuery & { active?: boolean | undefined }) {
    const offset = (query.page - 1) * query.pageSize;
    const scope = organizationScope(auth);
    const result = await this.db.query<CountedRow & Record<string, unknown>>(
      `SELECT o.id::text, o.code, o.name, o.short_name, o.organization_type,
              o.parent_id::text, o.is_active, o.created_at::text, o.updated_at::text,
              count(*) OVER()::text AS total_count
       FROM sababuka.organizations o
       WHERE o.archived_at IS NULL
         AND ($1::text IS NULL OR o.code ILIKE '%' || $1 || '%' OR o.name ILIKE '%' || $1 || '%')
         AND ($2::boolean IS NULL OR o.is_active = $2)
         AND ($3::boolean OR o.id = ANY($4::uuid[]))
       ORDER BY o.name, o.code
       LIMIT $5 OFFSET $6`,
      [query.search?.trim() || null, query.active ?? null, isGlobal(auth), scope, query.pageSize, offset],
    );
    return pageEnvelope(result.rows, query.page, query.pageSize);
  }

  async createOrganization(auth: AuthContext, input: OrganizationInput, audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.organizations
           (code, name, short_name, organization_type, parent_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text, code, name, short_name, organization_type, parent_id::text,
                   is_active, created_at::text, updated_at::text`,
        [input.code, input.name, input.short_name ?? null, input.organization_type, input.parent_id ?? null],
      );
      const organization = result.rows[0]!;
      await recordAudit(client, {
        ...audit,
        eventType: "organization.created",
        entityType: "organization",
        entityId: organization.id as string,
        organizationId: organization.id as string,
        afterData: organization,
      });
      await client.query("COMMIT");
      return organization;
    } catch (error) {
      await client.query("ROLLBACK");
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async listUsers(auth: AuthContext, query: PageQuery & { organizationId?: string | undefined }) {
    const offset = (query.page - 1) * query.pageSize;
    const scope = organizationScope(auth);
    const result = await this.db.query<CountedRow & Record<string, unknown>>(
      `SELECT u.id::text, u.email::text, u.username::text, u.full_name, u.status,
              u.mfa_required, (u.password_hash IS NOT NULL) AS has_password,
              u.last_login_at::text, u.created_at::text,
              po.id::text AS organization_id, po.code AS organization_code,
              po.name AS organization_name, count(*) OVER()::text AS total_count
       FROM sababuka.users u
       LEFT JOIN LATERAL (
         SELECT o.id, o.code, o.name
         FROM sababuka.organization_memberships om
         JOIN sababuka.organizations o ON o.id = om.organization_id
         WHERE om.user_id = u.id AND om.ends_at IS NULL
         ORDER BY om.is_primary DESC, om.created_at
         LIMIT 1
       ) po ON true
       WHERE u.archived_at IS NULL
         AND ($1::text IS NULL OR u.email::text ILIKE '%' || $1 || '%'
              OR u.full_name ILIKE '%' || $1 || '%' OR u.username::text ILIKE '%' || $1 || '%')
         AND ($2::uuid IS NULL OR po.id = $2)
         AND ($3::boolean OR po.id = ANY($4::uuid[]))
       ORDER BY u.full_name, u.email
       LIMIT $5 OFFSET $6`,
      [query.search?.trim() || null, query.organizationId ?? null, isGlobal(auth), scope, query.pageSize, offset],
    );
    return pageEnvelope(result.rows, query.page, query.pageSize);
  }

  async createUser(auth: AuthContext, input: UserCreateInput, audit: AuditContext) {
    requireGlobal(auth);
    const invitationToken = randomToken(32);
    const invitationExpiresAt = new Date(Date.now() + this.config.invitationTtlSeconds * 1000);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const organization = await client.query<IdRow>(
        `SELECT id::text FROM sababuka.organizations
         WHERE id = $1 AND is_active = true AND archived_at IS NULL`,
        [input.organization_id],
      );
      if (!organization.rowCount) throw new ApiError(404, "NOT_FOUND", "Organisasi tidak ditemukan.");

      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.users (email, username, full_name, status, mfa_required)
         VALUES ($1, $2, $3, 'invited', true)
         RETURNING id::text, email::text, username::text, full_name, status,
                   mfa_required, created_at::text`,
        [input.email.trim().toLowerCase(), input.username?.trim() || null, input.full_name.trim()],
      );
      const user = result.rows[0]!;
      await client.query(
        `INSERT INTO sababuka.organization_memberships
           (user_id, organization_id, membership_type, is_primary)
         VALUES ($1, $2, 'member', true)`,
        [user.id, input.organization_id],
      );
      await client.query(
        `INSERT INTO sababuka.user_invitations
           (user_id, token_hash, expires_at, created_by)
         VALUES ($1, $2, $3, $4)`,
        [user.id, hashToken(invitationToken), invitationExpiresAt, auth.user.id],
      );
      const afterData = { ...user, organization_id: input.organization_id };
      await recordAudit(client, {
        ...audit,
        eventType: "user.invited",
        entityType: "user",
        entityId: user.id as string,
        organizationId: input.organization_id,
        afterData,
      });
      await client.query("COMMIT");
      return {
        ...afterData,
        invitation_token: invitationToken,
        invitation_expires_at: invitationExpiresAt.toISOString(),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async updateUser(auth: AuthContext, userId: string, input: UserUpdateInput, audit: AuditContext) {
    requireGlobal(auth);
    if (userId === auth.user.id && input.status && input.status !== "active") {
      throw new ApiError(409, "CONFLICT", "Developer tidak dapat menonaktifkan akunnya sendiri.");
    }
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query<QueryResultRow & Record<string, unknown>>(
        `SELECT id::text, username::text, full_name, status, mfa_required,
                (password_hash IS NOT NULL) AS has_password
         FROM sababuka.users WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
        [userId],
      );
      if (!before.rowCount) throw new ApiError(404, "NOT_FOUND", "Pengguna tidak ditemukan.");
      if (input.status === "active" && before.rows[0]!.has_password !== true) {
        throw new ApiError(409, "CONFLICT", "Pengguna harus menerima undangan dan membuat password sebelum diaktifkan.");
      }
      if (input.mfa_required === true) {
        const verifiedMfa = await client.query(
          `SELECT 1 FROM sababuka.user_mfa_methods
           WHERE user_id = $1 AND method_type = 'totp'
             AND verified_at IS NOT NULL AND disabled_at IS NULL`,
          [userId],
        );
        if (!verifiedMfa.rowCount) {
          throw new ApiError(409, "CONFLICT", "MFA hanya dapat diwajibkan setelah Authenticator diverifikasi.");
        }
      }
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `UPDATE sababuka.users
         SET username = CASE WHEN $2::boolean THEN $3::citext ELSE username END,
             full_name = COALESCE($4, full_name),
             status = COALESCE($5, status),
             mfa_required = COALESCE($6, mfa_required),
             archived_at = CASE WHEN $5 = 'archived' THEN now() ELSE archived_at END
         WHERE id = $1
         RETURNING id::text, email::text, username::text, full_name, status,
                   mfa_required, last_login_at::text, created_at::text, updated_at::text`,
        [
          userId,
          Object.hasOwn(input, "username"),
          input.username?.trim() || null,
          input.full_name?.trim() || null,
          input.status ?? null,
          input.mfa_required ?? null,
        ],
      );
      const user = result.rows[0]!;
      if (input.status && input.status !== "active") {
        await client.query(
          `UPDATE sababuka.auth_sessions
           SET revoked_at = now(), revoke_reason = 'account_status_changed'
           WHERE user_id = $1 AND revoked_at IS NULL`,
          [userId],
        );
      }
      await recordAudit(client, {
        ...audit,
        eventType: "user.updated",
        entityType: "user",
        entityId: userId,
        beforeData: before.rows[0]!,
        afterData: user,
      });
      await client.query("COMMIT");
      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async approveRegistration(auth: AuthContext, userId: string, input: RoleAssignmentInput, audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query<QueryResultRow & { status: string; has_password: boolean }>(
        `SELECT status, (password_hash IS NOT NULL) AS has_password
         FROM sababuka.users
         WHERE id = $1 AND archived_at IS NULL
         FOR UPDATE`,
        [userId],
      );
      if (!user.rowCount) throw new ApiError(404, "NOT_FOUND", "Pengguna tidak ditemukan.");
      if (user.rows[0]!.status !== "invited" || !user.rows[0]!.has_password) {
        throw new ApiError(409, "CONFLICT", "Hanya pendaftaran mandiri yang masih menunggu verifikasi yang dapat disetujui.");
      }
      const role = await client.query<{ code: string } & QueryResultRow>(
        "SELECT code FROM sababuka.roles WHERE id = $1 AND is_active = true",
        [input.role_id],
      );
      if (!role.rows[0]) throw new ApiError(404, "NOT_FOUND", "Peran tidak ditemukan.");
      assertRoleScope(role.rows[0].code, input.scope_type, input.organization_id);

      const assignment = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.user_role_assignments
           (user_id, role_id, organization_id, scope_type, ends_at, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id::text, role_id::text, organization_id::text, scope_type`,
        [userId, input.role_id, input.organization_id ?? null, input.scope_type, input.ends_at ?? null, auth.user.id],
      );
      await client.query(
        `UPDATE sababuka.users
         SET status = 'active', failed_login_count = 0, locked_until = NULL, updated_at = now()
         WHERE id = $1`,
        [userId],
      );
      await client.query(
        `UPDATE sababuka.organization_memberships
         SET membership_type = CASE WHEN $2 = 'opd' THEN 'operator' ELSE 'member' END
         WHERE user_id = $1 AND ends_at IS NULL`,
        [userId, role.rows[0].code],
      );
      await recordAudit(client, {
        ...audit,
        eventType: "user.registration_approved",
        entityType: "user",
        entityId: userId,
        organizationId: input.organization_id ?? null,
        beforeData: { status: "invited" },
        afterData: { status: "active", role_code: role.rows[0].code, assignment: assignment.rows[0]! },
      });
      await client.query("COMMIT");
      return { id: userId, status: "active", role_code: role.rows[0].code };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async assignRole(auth: AuthContext, userId: string, input: RoleAssignmentInput, audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const role = await client.query<{ code: string }>("SELECT code FROM sababuka.roles WHERE id = $1 AND is_active = true", [input.role_id]);
      if (!role.rows[0]) throw new ApiError(404, "NOT_FOUND", "Role tidak ditemukan.");
      assertRoleScope(role.rows[0].code, input.scope_type, input.organization_id);
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.user_role_assignments
           (user_id, role_id, organization_id, scope_type, ends_at, assigned_by)
         SELECT $1, r.id, $3, $4, $5, $6
         FROM sababuka.roles r
         WHERE r.id = $2 AND r.is_active = true
           AND EXISTS (SELECT 1 FROM sababuka.users u WHERE u.id = $1 AND u.archived_at IS NULL)
           AND ($3::uuid IS NULL OR EXISTS (
             SELECT 1 FROM sababuka.organizations o
             WHERE o.id = $3 AND o.is_active = true AND o.archived_at IS NULL
           ))
         RETURNING id::text, user_id::text, role_id::text, organization_id::text,
                   scope_type, starts_at::text, ends_at::text`,
        [userId, input.role_id, input.organization_id ?? null, input.scope_type, input.ends_at ?? null, auth.user.id],
      );
      if (!result.rowCount) throw new ApiError(404, "NOT_FOUND", "Pengguna, role, atau organisasi tidak ditemukan.");
      const assignment = result.rows[0]!;
      await recordAudit(client, {
        ...audit,
        eventType: "user.role_assigned",
        entityType: "user_role_assignment",
        entityId: assignment.id as string,
        organizationId: input.organization_id ?? null,
        afterData: assignment,
      });
      await client.query("COMMIT");
      return assignment;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async listRoles() {
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT r.id::text, r.code, r.name, r.description, r.is_system, r.is_active,
              COALESCE(array_agg(p.code ORDER BY p.code) FILTER (WHERE p.id IS NOT NULL), '{}') AS permissions
       FROM sababuka.roles r
       LEFT JOIN sababuka.role_permissions rp ON rp.role_id = r.id
       LEFT JOIN sababuka.permissions p ON p.id = rp.permission_id
       GROUP BY r.id
       ORDER BY r.is_system DESC, r.name`,
    );
    return { data: result.rows };
  }

  async listPermissions() {
    const result = await this.db.query(
      `SELECT id::text, code, name, description, risk_level
       FROM sababuka.permissions ORDER BY code`,
    );
    return { data: result.rows };
  }

  async replaceRolePermissions(auth: AuthContext, roleId: string, permissionIds: string[], audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const role = await client.query<QueryResultRow & { id: string; code: string }>(
        `SELECT id::text, code FROM sababuka.roles WHERE id = $1 FOR UPDATE`,
        [roleId],
      );
      if (!role.rowCount) throw new ApiError(404, "NOT_FOUND", "Role tidak ditemukan.");
      const permissions = await client.query<QueryResultRow & { id: string; code: string }>(
        `SELECT id::text, code FROM sababuka.permissions WHERE id = ANY($1::uuid[]) ORDER BY code`,
        [permissionIds],
      );
      if (permissions.rowCount !== new Set(permissionIds).size) {
        throw new ApiError(400, "VALIDATION_ERROR", "Satu atau lebih permission tidak valid.");
      }
      const codes = permissions.rows.map((permission) => permission.code);
      if (role.rows[0]!.code === "superadmin") {
        const missing = PROTECTED_SUPERADMIN_PERMISSIONS.filter((code) => !codes.includes(code));
        if (missing.length) {
          throw new ApiError(409, "CONFLICT", `Hak akses inti Developer wajib dipertahankan: ${missing.join(", ")}.`);
        }
      }
      const before = await client.query<QueryResultRow & { code: string }>(
        `SELECT p.code FROM sababuka.role_permissions rp
         JOIN sababuka.permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1 ORDER BY p.code`,
        [roleId],
      );
      await client.query(`DELETE FROM sababuka.role_permissions WHERE role_id = $1`, [roleId]);
      if (permissionIds.length) {
        await client.query(
          `INSERT INTO sababuka.role_permissions (role_id, permission_id, granted_by)
           SELECT $1, unnest($2::uuid[]), $3`,
          [roleId, permissionIds, auth.user.id],
        );
      }
      await recordAudit(client, {
        ...audit,
        eventType: "role.permissions_replaced",
        entityType: "role",
        entityId: roleId,
        beforeData: { permissions: before.rows.map((row) => row.code) },
        afterData: { permissions: codes },
      });
      await client.query("COMMIT");
      return { role_id: roleId, permissions: codes };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async listMenus() {
    const result = await this.db.query(
      `SELECT m.id::text, m.code, m.parent_id::text, parent.code AS parent_code,
              m.label, m.icon, m.route_name, m.required_permission,
              m.display_order, m.is_active
       FROM sababuka.menu_items m
       LEFT JOIN sababuka.menu_items parent ON parent.id = m.parent_id
       ORDER BY COALESCE(parent.display_order, m.display_order), m.parent_id NULLS FIRST, m.display_order, m.label`,
    );
    return { data: result.rows };
  }

  async getRoleMenus(roleId: string) {
    const role = await this.db.query<IdRow>(`SELECT id::text FROM sababuka.roles WHERE id = $1`, [roleId]);
    if (!role.rowCount) throw new ApiError(404, "NOT_FOUND", "Role tidak ditemukan.");
    const result = await this.db.query<QueryResultRow & { id: string; code: string }>(
      `SELECT m.id::text, m.code
       FROM sababuka.role_menu_items rmi
       JOIN sababuka.menu_items m ON m.id = rmi.menu_item_id
       WHERE rmi.role_id = $1 AND rmi.is_visible = true
       ORDER BY m.code`,
      [roleId],
    );
    return { role_id: roleId, menu_ids: result.rows.map((item) => item.id), menu_codes: result.rows.map((item) => item.code) };
  }

  async replaceRoleMenus(auth: AuthContext, roleId: string, menuIds: string[], audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const role = await client.query<QueryResultRow & { id: string; code: string }>(
        `SELECT id::text, code FROM sababuka.roles WHERE id = $1 FOR UPDATE`,
        [roleId],
      );
      if (!role.rowCount) throw new ApiError(404, "NOT_FOUND", "Role tidak ditemukan.");
      const menus = await client.query<QueryResultRow & { id: string; code: string; parent_id: string | null }>(
        `SELECT id::text, code, parent_id::text FROM sababuka.menu_items
         WHERE id = ANY($1::uuid[]) AND is_active = true`,
        [menuIds],
      );
      if (menus.rowCount !== new Set(menuIds).size) {
        throw new ApiError(400, "VALIDATION_ERROR", "Satu atau lebih menu tidak valid atau tidak aktif.");
      }
      const resolvedIds = new Set(menuIds);
      for (const menu of menus.rows) if (menu.parent_id) resolvedIds.add(menu.parent_id);
      const resolved = await client.query<QueryResultRow & { id: string; code: string }>(
        `SELECT id::text, code FROM sababuka.menu_items WHERE id = ANY($1::uuid[]) ORDER BY code`,
        [[...resolvedIds]],
      );
      const codes = resolved.rows.map((menu) => menu.code);
      if (role.rows[0]!.code === "superadmin") {
        const missing = PROTECTED_SUPERADMIN_MENUS.filter((code) => !codes.includes(code));
        if (missing.length) {
          throw new ApiError(409, "CONFLICT", `Menu inti Developer wajib dipertahankan: ${missing.join(", ")}.`);
        }
      }
      const before = await client.query<QueryResultRow & { code: string }>(
        `SELECT m.code FROM sababuka.role_menu_items rmi
         JOIN sababuka.menu_items m ON m.id = rmi.menu_item_id
         WHERE rmi.role_id = $1 AND rmi.is_visible = true ORDER BY m.code`,
        [roleId],
      );
      await client.query(`DELETE FROM sababuka.role_menu_items WHERE role_id = $1`, [roleId]);
      if (resolvedIds.size) {
        await client.query(
          `INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible)
           SELECT $1, unnest($2::uuid[]), true`,
          [roleId, [...resolvedIds]],
        );
      }
      await recordAudit(client, {
        ...audit,
        eventType: "role.menus_replaced",
        entityType: "role",
        entityId: roleId,
        beforeData: { menus: before.rows.map((row) => row.code) },
        afterData: { menus: codes },
      });
      await client.query("COMMIT");
      return { role_id: roleId, menus: codes };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async listSystemConfiguration() {
    const [settings, features] = await Promise.all([
      this.db.query(
        `SELECT key, value, description, updated_at::text
         FROM sababuka.system_settings WHERE is_secret = false ORDER BY key`,
      ),
      this.db.query(
        `SELECT id::text, code, name, description, is_enabled, configuration, updated_at::text
         FROM sababuka.feature_flags ORDER BY code`,
      ),
    ]);
    return { settings: settings.rows, feature_flags: features.rows };
  }

  async upsertSetting(auth: AuthContext, key: string, value: unknown, description: string | null, audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query<QueryResultRow & Record<string, unknown>>(
        `SELECT key, value, description FROM sababuka.system_settings WHERE key = $1 FOR UPDATE`,
        [key],
      );
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.system_settings (key, value, description, updated_by)
         VALUES ($1, $2::jsonb, $3, $4)
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, description = EXCLUDED.description, updated_by = EXCLUDED.updated_by
         RETURNING key, value, description, updated_at::text`,
        [key, JSON.stringify(value), description, auth.user.id],
      );
      await recordAudit(client, {
        ...audit,
        eventType: "system.setting_updated",
        entityType: "system_setting",
        entityId: null,
        beforeData: before.rows[0] ?? null,
        afterData: result.rows[0]!,
        metadata: { key },
      });
      await client.query("COMMIT");
      return result.rows[0]!;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async updateFeatureFlag(auth: AuthContext, code: string, enabled: boolean, configuration: Record<string, unknown>, audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query<QueryResultRow & Record<string, unknown>>(
        `SELECT id::text, code, is_enabled, configuration
         FROM sababuka.feature_flags WHERE code = $1 FOR UPDATE`,
        [code],
      );
      if (!before.rowCount) throw new ApiError(404, "NOT_FOUND", "Feature flag tidak ditemukan.");
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `UPDATE sababuka.feature_flags
         SET is_enabled = $2, configuration = $3::jsonb, updated_by = $4
         WHERE code = $1
         RETURNING id::text, code, name, description, is_enabled, configuration, updated_at::text`,
        [code, enabled, JSON.stringify(configuration), auth.user.id],
      );
      await recordAudit(client, {
        ...audit,
        eventType: "system.feature_flag_updated",
        entityType: "feature_flag",
        entityId: result.rows[0]!.id as string,
        beforeData: before.rows[0]!,
        afterData: result.rows[0]!,
      });
      await client.query("COMMIT");
      return result.rows[0]!;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally {
      client.release();
    }
  }
}
