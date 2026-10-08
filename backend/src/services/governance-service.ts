import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

interface CountedRow extends QueryResultRow { total_count: string }

export interface GovernancePageQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
}

export interface PolicyFocusInput {
  code: string;
  name: string;
  description?: string | null;
  display_order?: number;
}

export interface CategoryInput {
  code: string;
  name: string;
  description?: string | null;
  policy_focus_id?: string | null;
  parent_id?: string | null;
  display_order?: number;
}

export interface IndicatorOrganizationInput {
  organization_id: string;
  responsibility: "primary_producer" | "supporter" | "validator" | "curator";
  is_primary?: boolean;
}

export interface IndicatorTargetInput {
  period_id: string;
  numeric_value?: number | null;
  text_value?: string | null;
  notes?: string | null;
}

export interface IndicatorInput {
  code: string;
  name: string;
  category_id: string;
  owner_organization_id?: string | null;
  definition: string;
  formula?: string | null;
  unit_id: string;
  frequency: "annual" | "semester" | "quarter" | "monthly" | "event" | "custom";
  data_type: "number" | "integer" | "percentage" | "currency" | "text" | "boolean";
  direction?: "increase" | "decrease" | "maintain" | null;
  source_reference?: string | null;
  access_level?: "public" | "internal" | "restricted";
  effective_from: string;
  change_notes?: string | null;
  organizations?: IndicatorOrganizationInput[];
  targets?: IndicatorTargetInput[];
}

function pageEnvelope<T>(rows: (T & CountedRow)[], page: number, pageSize: number) {
  const total = Number(rows[0]?.total_count ?? 0);
  return {
    data: rows.map(({ total_count: _total, ...row }) => row),
    meta: { page, page_size: pageSize, total_items: total, total_pages: total ? Math.ceil(total / pageSize) : 0 },
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
  if (!isGlobal(auth)) throw new ApiError(403, "SCOPE_DENIED", "Pengelolaan master indikator memerlukan scope global.");
}

const INDICATOR_DRAFTER_ROLES = new Set(["superadmin", "indicator_author"]);

function requireIndicatorDrafter(auth: AuthContext): void {
  if (!auth.user.roles.some((role) => INDICATOR_DRAFTER_ROLES.has(role.code))) {
    throw new ApiError(403, "PERMISSION_DENIED", "Hanya role penyusun indikator yang dapat mengajukan definisi ke BAPPERIDA.");
  }
}

function translateDatabaseError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === "23505") throw new ApiError(409, "CONFLICT", "Kode atau identitas data sudah digunakan.");
  if (code === "23503") throw new ApiError(400, "VALIDATION_ERROR", "Referensi kategori, unit, OPD, atau periode tidak valid.");
  if (code === "23514" || code === "22P02") throw new ApiError(400, "VALIDATION_ERROR", "Nilai tidak memenuhi aturan data.");
  throw error;
}

export class GovernanceService {
  constructor(private readonly db: Database) {}

  async listPolicyFocuses(query: GovernancePageQuery) {
    const result = await this.db.query<CountedRow & Record<string, unknown>>(
      `SELECT id::text, code, name, description, display_order, is_active,
              created_at::text, updated_at::text, count(*) OVER()::text AS total_count
       FROM sababuka.policy_focuses
       WHERE archived_at IS NULL
         AND ($1::text IS NULL OR code ILIKE '%' || $1 || '%' OR name ILIKE '%' || $1 || '%')
       ORDER BY display_order, name, code LIMIT $2 OFFSET $3`,
      [query.search?.trim() || null, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return pageEnvelope(result.rows, query.page, query.pageSize);
  }

  async createPolicyFocus(auth: AuthContext, input: PolicyFocusInput, audit: AuditContext) {
    requireGlobal(auth);
    try {
      const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.policy_focuses (code, name, description, display_order, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text, code, name, description, display_order, is_active, created_at::text, updated_at::text`,
        [input.code, input.name, input.description ?? null, input.display_order ?? 0, auth.user.id],
      );
      const focus = result.rows[0]!;
      await recordAudit(this.db, { ...audit, eventType: "policy_focus.created", entityType: "policy_focus", entityId: focus.id as string, afterData: focus });
      return focus;
    } catch (error) { translateDatabaseError(error); }
  }

  async listCategories(query: GovernancePageQuery & { policyFocusId?: string | undefined }) {
    const result = await this.db.query<CountedRow & Record<string, unknown>>(
      `SELECT c.id::text, c.code, c.name, c.description, c.policy_focus_id::text,
              pf.name AS policy_focus_name, c.parent_id::text, c.display_order, c.is_active,
              c.review_status, c.submitted_by::text, c.submitted_at::text,
              c.decided_by::text, c.decided_at::text, c.decision_notes,
              count(i.id)::int AS indicator_count, count(*) OVER()::text AS total_count
       FROM sababuka.categories c
       LEFT JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id
       LEFT JOIN sababuka.indicators i ON i.category_id = c.id AND i.archived_at IS NULL
       WHERE c.archived_at IS NULL
         AND ($1::text IS NULL OR c.code ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%')
         AND ($2::uuid IS NULL OR c.policy_focus_id = $2)
       GROUP BY c.id, pf.name
       ORDER BY c.display_order, c.code, c.name LIMIT $3 OFFSET $4`,
      [query.search?.trim() || null, query.policyFocusId ?? null, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return pageEnvelope(result.rows, query.page, query.pageSize);
  }

  async createCategory(auth: AuthContext, input: CategoryInput, audit: AuditContext) {
    requireGlobal(auth);
    try {
      const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.categories
           (code, name, description, policy_focus_id, parent_id, display_order, review_status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
         RETURNING id::text, code, name, description, policy_focus_id::text, parent_id::text,
                   display_order, is_active, review_status, submitted_at::text,
                   decided_at::text, decision_notes, created_at::text, updated_at::text`,
        [input.code, input.name, input.description ?? null, input.policy_focus_id ?? null, input.parent_id ?? null, input.display_order ?? 0, auth.user.id],
      );
      const category = result.rows[0]!;
      await recordAudit(this.db, { ...audit, eventType: "category.created", entityType: "category", entityId: category.id as string, afterData: category });
      return category;
    } catch (error) { translateDatabaseError(error); }
  }

  async transitionCategory(
    auth: AuthContext,
    categoryId: string,
    action: "submit" | "approve" | "reject" | "reopen",
    audit: AuditContext,
  ) {
    requireGlobal(auth);
    const transitions = {
      submit: { from: "draft", to: "in_review" },
      approve: { from: "in_review", to: "approved" },
      reject: { from: "in_review", to: "rejected" },
      reopen: { from: "rejected", to: "draft" },
    } as const;
    const transition = transitions[action];
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<QueryResultRow & { id: string; review_status: string }>(
        `SELECT id::text, review_status FROM sababuka.categories
         WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
        [categoryId],
      );
      if (!current.rowCount) throw new ApiError(404, "NOT_FOUND", "Kategori tidak ditemukan.");
      if (current.rows[0]!.review_status !== transition.from) {
        throw new ApiError(409, "CONFLICT", `Aksi ${action} hanya dapat dijalankan dari status ${transition.from}.`);
      }
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `UPDATE sababuka.categories
         SET review_status = $2,
             submitted_by = CASE WHEN $3 = 'submit' THEN $4 ELSE submitted_by END,
             submitted_at = CASE WHEN $3 = 'submit' THEN now() ELSE submitted_at END,
             decided_by = CASE WHEN $3 IN ('approve', 'reject') THEN $4 WHEN $3 = 'reopen' THEN NULL ELSE decided_by END,
             decided_at = CASE WHEN $3 IN ('approve', 'reject') THEN now() WHEN $3 = 'reopen' THEN NULL ELSE decided_at END,
             decision_notes = CASE WHEN $3 = 'reject' THEN 'Kategori dikembalikan untuk perbaikan.' WHEN $3 = 'reopen' THEN NULL ELSE decision_notes END
         WHERE id = $1
         RETURNING id::text, code, name, review_status, submitted_by::text, submitted_at::text,
                   decided_by::text, decided_at::text, decision_notes, updated_at::text`,
        [categoryId, transition.to, action, auth.user.id],
      );
      await recordAudit(client, {
        ...audit, eventType: `category.${action}`, entityType: "category", entityId: categoryId,
        beforeData: { review_status: transition.from }, afterData: result.rows[0]!,
      });
      await client.query("COMMIT");
      return result.rows[0]!;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally { client.release(); }
  }

  async listUnits() {
    const result = await this.db.query(`SELECT id::text, code, name, symbol, decimal_places FROM sababuka.units WHERE is_active = true ORDER BY name`);
    return { data: result.rows };
  }

  async listPeriods() {
    const result = await this.db.query(`SELECT id::text, code, label, period_type, starts_on::text, ends_on::text FROM sababuka.periods ORDER BY starts_on DESC`);
    return { data: result.rows };
  }

  async listIndicators(auth: AuthContext, query: GovernancePageQuery & { categoryId?: string | undefined; organizationId?: string | undefined; status?: string | undefined }) {
    const scope = organizationScope(auth);
    const result = await this.db.query<CountedRow & Record<string, unknown>>(
      `SELECT i.id::text, i.code, i.name, i.category_id::text, c.code AS category_code, c.name AS category_name,
              c.review_status AS category_review_status,
              i.owner_organization_id::text, owner.name AS owner_organization_name, i.is_active,
              iv.id::text AS version_id, iv.version_number, iv.definition, iv.formula,
              iv.frequency, iv.data_type, iv.direction, iv.source_reference,
              iv.access_level, iv.effective_from::text, iv.status,
              u.id::text AS unit_id, u.name AS unit_name, u.symbol AS unit_symbol,
              COALESCE(orgs.items, '[]'::json) AS organizations,
              COALESCE(targets.items, '[]'::json) AS targets,
              count(*) OVER()::text AS total_count
       FROM sababuka.indicators i
       JOIN sababuka.categories c ON c.id = i.category_id
       LEFT JOIN sababuka.organizations owner ON owner.id = i.owner_organization_id
       JOIN LATERAL (
         SELECT v.* FROM sababuka.indicator_versions v
         WHERE v.indicator_id = i.id ORDER BY v.version_number DESC LIMIT 1
       ) iv ON true
       JOIN sababuka.units u ON u.id = iv.unit_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('organization_id', io.organization_id::text, 'organization_name', o.name,
                  'responsibility', io.responsibility, 'is_primary', io.is_primary) ORDER BY io.is_primary DESC, o.name) AS items
         FROM sababuka.indicator_organizations io JOIN sababuka.organizations o ON o.id = io.organization_id
         WHERE io.indicator_version_id = iv.id
       ) orgs ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('id', t.id::text, 'period_id', p.id::text, 'period_code', p.code,
                  'period_label', p.label, 'numeric_value', t.numeric_value, 'text_value', t.text_value, 'notes', t.notes)
                  ORDER BY p.starts_on) AS items
         FROM sababuka.targets t JOIN sababuka.periods p ON p.id = t.period_id
         WHERE t.indicator_version_id = iv.id AND t.geography_id IS NULL AND t.dimension_values = '{}'::jsonb
       ) targets ON true
       WHERE i.archived_at IS NULL
         AND ($1::text IS NULL OR i.code ILIKE '%' || $1 || '%' OR i.name ILIKE '%' || $1 || '%')
         AND ($2::uuid IS NULL OR i.category_id = $2)
         AND ($3::uuid IS NULL OR i.owner_organization_id = $3 OR EXISTS (
           SELECT 1 FROM sababuka.indicator_organizations x WHERE x.indicator_version_id = iv.id AND x.organization_id = $3))
         AND ($4::text IS NULL OR iv.status = $4)
         AND ($5::boolean OR i.owner_organization_id = ANY($6::uuid[]) OR EXISTS (
           SELECT 1 FROM sababuka.indicator_organizations x WHERE x.indicator_version_id = iv.id AND x.organization_id = ANY($6::uuid[])))
       ORDER BY c.display_order, c.code, i.name, i.code LIMIT $7 OFFSET $8`,
      [query.search?.trim() || null, query.categoryId ?? null, query.organizationId ?? null, query.status ?? null,
       isGlobal(auth), scope, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return pageEnvelope(result.rows, query.page, query.pageSize);
  }

  async createIndicator(auth: AuthContext, input: IndicatorInput, audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const indicatorResult = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.indicators (code, name, category_id, owner_organization_id, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text, code, name, category_id::text, owner_organization_id::text, is_active`,
        [input.code, input.name, input.category_id, input.owner_organization_id ?? null, auth.user.id],
      );
      const indicator = indicatorResult.rows[0]!;
      const versionResult = await client.query<QueryResultRow & { id: string }>(
        `INSERT INTO sababuka.indicator_versions
           (indicator_id, version_number, definition, formula, unit_id, frequency, data_type,
            direction, source_reference, access_level, effective_from, status, change_notes, created_by)
         VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12)
         RETURNING id::text`,
        [indicator.id, input.definition, input.formula ?? null, input.unit_id, input.frequency, input.data_type,
         input.direction ?? null, input.source_reference ?? null, input.access_level ?? "internal",
         input.effective_from, input.change_notes ?? null, auth.user.id],
      );
      const versionId = versionResult.rows[0]!.id;
      for (const organization of input.organizations ?? []) {
        await client.query(
          `INSERT INTO sababuka.indicator_organizations
             (indicator_version_id, organization_id, responsibility, is_primary) VALUES ($1, $2, $3, $4)`,
          [versionId, organization.organization_id, organization.responsibility, organization.is_primary ?? false],
        );
      }
      for (const target of input.targets ?? []) {
        if ((target.numeric_value == null) === (target.text_value == null || target.text_value === "")) {
          throw new ApiError(400, "VALIDATION_ERROR", "Setiap target harus memiliki tepat satu nilai numerik atau teks.");
        }
        await client.query(
          `INSERT INTO sababuka.targets
             (indicator_version_id, period_id, numeric_value, text_value, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [versionId, target.period_id, target.numeric_value ?? null, target.text_value || null, target.notes ?? null, auth.user.id],
        );
      }
      await recordAudit(client, {
        ...audit, eventType: "indicator.created", entityType: "indicator", entityId: indicator.id as string,
        organizationId: input.owner_organization_id ?? null,
        afterData: { ...indicator, version_id: versionId, status: "draft", organizations: input.organizations ?? [], targets: input.targets ?? [] },
      });
      await client.query("COMMIT");
      return { ...indicator, version_id: versionId, version_number: 1, status: "draft" };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally { client.release(); }
  }

  async updateIndicatorDraft(auth: AuthContext, indicatorId: string, input: IndicatorInput, audit: AuditContext) {
    requireGlobal(auth);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<QueryResultRow & Record<string, unknown>>(
        `SELECT i.id::text, i.code, i.name, i.category_id::text, i.owner_organization_id::text,
                iv.id::text AS version_id, iv.version_number, iv.definition, iv.formula,
                iv.unit_id::text, iv.frequency, iv.data_type, iv.direction, iv.source_reference,
                iv.access_level, iv.effective_from::text, iv.status, iv.change_notes
         FROM sababuka.indicators i
         JOIN LATERAL (
           SELECT v.* FROM sababuka.indicator_versions v
           WHERE v.indicator_id = i.id ORDER BY v.version_number DESC LIMIT 1
         ) iv ON true
         WHERE i.id = $1 AND i.archived_at IS NULL
         FOR UPDATE OF i`,
        [indicatorId],
      );
      if (!current.rowCount) throw new ApiError(404, "NOT_FOUND", "Indikator tidak ditemukan.");
      if (current.rows[0]!.status !== "draft") {
        throw new ApiError(409, "CONFLICT", "Hanya versi indikator berstatus draft yang dapat diubah langsung.");
      }
      const versionId = current.rows[0]!.version_id as string;
      await client.query(
        `UPDATE sababuka.indicators
         SET code = $2, name = $3, category_id = $4, owner_organization_id = $5
         WHERE id = $1`,
        [indicatorId, input.code, input.name, input.category_id, input.owner_organization_id ?? null],
      );
      await client.query(
        `UPDATE sababuka.indicator_versions
         SET definition = $2, formula = $3, unit_id = $4, frequency = $5, data_type = $6,
             direction = $7, source_reference = $8, access_level = $9, effective_from = $10,
             change_notes = $11
         WHERE id = $1`,
        [versionId, input.definition, input.formula ?? null, input.unit_id, input.frequency, input.data_type,
         input.direction ?? null, input.source_reference ?? null, input.access_level ?? "internal",
         input.effective_from, input.change_notes ?? null],
      );
      await client.query(`DELETE FROM sababuka.indicator_organizations WHERE indicator_version_id = $1`, [versionId]);
      for (const organization of input.organizations ?? []) {
        await client.query(
          `INSERT INTO sababuka.indicator_organizations
             (indicator_version_id, organization_id, responsibility, is_primary) VALUES ($1, $2, $3, $4)`,
          [versionId, organization.organization_id, organization.responsibility, organization.is_primary ?? false],
        );
      }
      await client.query(`DELETE FROM sababuka.targets WHERE indicator_version_id = $1`, [versionId]);
      for (const target of input.targets ?? []) {
        if ((target.numeric_value == null) === (target.text_value == null || target.text_value === "")) {
          throw new ApiError(400, "VALIDATION_ERROR", "Setiap target harus memiliki tepat satu nilai numerik atau teks.");
        }
        await client.query(
          `INSERT INTO sababuka.targets
             (indicator_version_id, period_id, numeric_value, text_value, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [versionId, target.period_id, target.numeric_value ?? null, target.text_value || null, target.notes ?? null, auth.user.id],
        );
      }
      const afterData = { ...input, id: indicatorId, version_id: versionId, status: "draft" };
      await recordAudit(client, {
        ...audit, eventType: "indicator.draft_updated", entityType: "indicator", entityId: indicatorId,
        organizationId: input.owner_organization_id ?? null, beforeData: current.rows[0]!, afterData,
      });
      await client.query("COMMIT");
      return afterData;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally { client.release(); }
  }

  async transitionIndicatorVersion(
    auth: AuthContext,
    versionId: string,
    action: "submit" | "approve" | "verify" | "activate" | "retire",
    audit: AuditContext,
  ) {
    const transitions = {
      submit: { from: "draft", to: "in_review" },
      approve: { from: "in_review", to: "opd_verification" },
      verify: { from: "opd_verification", to: "approved" },
      activate: { from: "approved", to: "active" },
      retire: { from: "active", to: "retired" },
    } as const;
    const transition = transitions[action];
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<QueryResultRow & {
        id: string; indicator_id: string; status: string; owner_organization_id: string | null; category_review_status: string;
      }>(
        `SELECT iv.id::text, iv.indicator_id::text, iv.status,
                i.owner_organization_id::text, c.review_status AS category_review_status
         FROM sababuka.indicator_versions iv
         JOIN sababuka.indicators i ON i.id = iv.indicator_id
         JOIN sababuka.categories c ON c.id = i.category_id
         WHERE iv.id = $1 FOR UPDATE OF iv`,
        [versionId],
      );
      if (!current.rowCount) throw new ApiError(404, "NOT_FOUND", "Versi indikator tidak ditemukan.");
      const currentVersion = current.rows[0]!;
      if (action === "submit") {
        requireIndicatorDrafter(auth);
      } else if (action === "verify") {
        const scope = organizationScope(auth);
        if (!isGlobal(auth) && (!currentVersion.owner_organization_id || !scope.includes(currentVersion.owner_organization_id))) {
          throw new ApiError(403, "SCOPE_DENIED", "Verifikasi hanya dapat dilakukan oleh OPD pemilik indikator.");
        }
      } else {
        requireGlobal(auth);
      }
      if (currentVersion.status !== transition.from) {
        throw new ApiError(409, "CONFLICT", `Aksi ${action} hanya dapat dijalankan dari status ${transition.from}.`);
      }
      if (action === "submit" && currentVersion.category_review_status !== "approved") {
        throw new ApiError(409, "CONFLICT", "Kategori harus disetujui BAPPERIDA sebelum indikator diajukan.");
      }
      if (action === "approve" && !currentVersion.owner_organization_id) {
        throw new ApiError(409, "CONFLICT", "OPD pemilik harus ditetapkan sebelum indikator dikirim untuk verifikasi teknis.");
      }
      if (action === "activate") {
        await client.query(
          `UPDATE sababuka.indicator_versions
           SET status = 'retired'
           WHERE indicator_id = $1 AND status = 'active' AND id <> $2`,
          [current.rows[0]!.indicator_id, versionId],
        );
      }
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `UPDATE sababuka.indicator_versions
         SET status = $2,
             submitted_by = CASE WHEN $3 = 'submit' THEN $4 ELSE submitted_by END,
             submitted_at = CASE WHEN $3 = 'submit' THEN now() ELSE submitted_at END,
             bapperida_reviewed_by = CASE WHEN $3 = 'approve' THEN $4 ELSE bapperida_reviewed_by END,
             bapperida_reviewed_at = CASE WHEN $3 = 'approve' THEN now() ELSE bapperida_reviewed_at END,
             opd_verified_by = CASE WHEN $3 = 'verify' THEN $4 ELSE opd_verified_by END,
             opd_verified_at = CASE WHEN $3 = 'verify' THEN now() ELSE opd_verified_at END,
             approved_by = CASE WHEN $3 = 'verify' THEN $4 ELSE approved_by END,
             approved_at = CASE WHEN $3 = 'verify' THEN now() ELSE approved_at END
         WHERE id = $1
         RETURNING id::text, indicator_id::text, version_number, status,
                   submitted_by::text, submitted_at::text,
                   bapperida_reviewed_by::text, bapperida_reviewed_at::text,
                   opd_verified_by::text, opd_verified_at::text,
                   approved_by::text, approved_at::text, updated_at::text`,
        [versionId, transition.to, action, auth.user.id],
      );
      await recordAudit(client, {
        ...audit, eventType: `indicator.${action}`, entityType: "indicator_version", entityId: versionId,
        beforeData: { status: transition.from }, afterData: result.rows[0]!,
      });
      await client.query("COMMIT");
      return result.rows[0]!;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      translateDatabaseError(error);
    } finally { client.release(); }
  }
}
