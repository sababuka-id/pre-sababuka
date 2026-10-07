import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";
import { notifyOrganization, notifyRole } from "./notification-service.js";

interface CountedRow extends QueryResultRow { total_count: string }
type SubmissionAction = "submit" | "start-review" | "return" | "approve";

export interface SubmissionQuery {
  page: number;
  pageSize: number;
  organizationId?: string | undefined;
  periodId?: string | undefined;
  status?: string | undefined;
}

interface SubmissionDetail extends Record<string, unknown> {
  id: string;
  organization_id: string;
  reporting_period_id: string | null;
  status: string;
  row_count: number;
  observations: Record<string, unknown>[];
}

export interface ObservationInput {
  value: number | string;
  notes?: string | null;
}

export interface EvidenceMetadataInput {
  indicatorVersionId?: string | null | undefined;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
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

function assertOrganizationScope(auth: AuthContext, organizationId: string): void {
  if (!isGlobal(auth) && !organizationScope(auth).includes(organizationId)) {
    throw new ApiError(403, "SCOPE_DENIED", "OPD berada di luar scope pengguna.");
  }
}

function actorRole(auth: AuthContext): string {
  return auth.user.roles[0]?.code ?? "unknown";
}

function pageEnvelope<T>(rows: (T & CountedRow)[], page: number, pageSize: number) {
  const total = Number(rows[0]?.total_count ?? 0);
  return {
    data: rows.map(({ total_count: _total, ...row }) => row),
    meta: { page, page_size: pageSize, total_items: total, total_pages: total ? Math.ceil(total / pageSize) : 0 },
  };
}

export class SubmissionService {
  constructor(private readonly db: Database) {}

  async list(auth: AuthContext, query: SubmissionQuery) {
    const scope = organizationScope(auth);
    const result = await this.db.query<CountedRow & Record<string, unknown>>(
      `SELECT b.id::text, b.dataset_version_id::text, b.organization_id::text,
              o.code AS organization_code, o.name AS organization_name,
              b.reporting_period_id::text, p.code AS period_code, p.label AS period_label,
              b.submission_method, b.status, b.row_count, b.submitted_at::text,
              b.approved_at::text, b.created_at::text, b.updated_at::text,
              count(*) OVER()::text AS total_count
       FROM sababuka.data_batches b
       JOIN sababuka.organizations o ON o.id = b.organization_id
       LEFT JOIN sababuka.periods p ON p.id = b.reporting_period_id
       JOIN sababuka.dataset_versions dv ON dv.id = b.dataset_version_id
       JOIN sababuka.datasets d ON d.id = dv.dataset_id
       WHERE d.code = 'SABABUKA.CAPAIAN_MANUAL'
         AND ($1::boolean OR b.organization_id = ANY($2::uuid[]))
         AND ($3::uuid IS NULL OR b.organization_id = $3)
         AND ($4::uuid IS NULL OR b.reporting_period_id = $4)
         AND ($5::text IS NULL OR b.status = $5)
       ORDER BY b.updated_at DESC LIMIT $6 OFFSET $7`,
      [isGlobal(auth), scope, query.organizationId ?? null, query.periodId ?? null, query.status ?? null,
       query.pageSize, (query.page - 1) * query.pageSize],
    );
    return pageEnvelope(result.rows, query.page, query.pageSize);
  }

  async create(auth: AuthContext, input: { organization_id: string; period_id: string }, audit: AuditContext) {
    assertOrganizationScope(auth, input.organization_id);
    try {
      const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.data_batches
           (dataset_version_id, organization_id, reporting_period_id, submission_method,
            source_metadata, created_by)
         SELECT dv.id, $1, p.id, 'manual',
                jsonb_build_object('input_mode', 'manual_indicator_realization'), $3
         FROM sababuka.dataset_versions dv
         JOIN sababuka.datasets d ON d.id = dv.dataset_id
         JOIN sababuka.periods p ON p.id = $2
         WHERE d.code = 'SABABUKA.CAPAIAN_MANUAL' AND dv.version_number = 1
         RETURNING id::text`,
        [input.organization_id, input.period_id, auth.user.id],
      );
      if (!result.rows[0]) throw new ApiError(400, "VALIDATION_ERROR", "Periode atau dataset sistem tidak tersedia.");
      const detail = await this.get(auth, result.rows[0].id as string);
      await recordAudit(this.db, { ...audit, eventType: "submission.created", entityType: "data_batch",
        entityId: result.rows[0].id as string, organizationId: input.organization_id, afterData: detail });
      return detail;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new ApiError(409, "CONFLICT", "Form capaian OPD untuk periode ini sudah tersedia.");
      if ((error as { code?: string }).code === "23503") throw new ApiError(400, "VALIDATION_ERROR", "OPD atau periode tidak valid.");
      throw error;
    }
  }

  async get(auth: AuthContext, id: string): Promise<SubmissionDetail> {
    const batchResult = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT b.id::text, b.dataset_version_id::text, b.organization_id::text,
              o.code AS organization_code, o.name AS organization_name,
              b.reporting_period_id::text, p.code AS period_code, p.label AS period_label,
              b.submission_method, b.status, b.row_count, b.submitted_at::text,
              b.approved_at::text, b.created_at::text, b.updated_at::text,
              (SELECT wa.notes FROM sababuka.workflow_actions wa
               WHERE wa.batch_id = b.id AND wa.action = 'return'
               ORDER BY wa.created_at DESC LIMIT 1) AS review_notes
       FROM sababuka.data_batches b
       JOIN sababuka.organizations o ON o.id = b.organization_id
       LEFT JOIN sababuka.periods p ON p.id = b.reporting_period_id
       WHERE b.id = $1`, [id],
    );
    const batch = batchResult.rows[0];
    if (!batch) throw new ApiError(404, "NOT_FOUND", "Form capaian tidak ditemukan.");
    assertOrganizationScope(auth, batch.organization_id as string);
    const observations = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT iv.id::text AS indicator_version_id, i.code AS indicator_code, i.name AS indicator_name,
              iv.data_type, u.name AS unit_name, u.symbol AS unit_symbol,
              t.numeric_value AS target_numeric_value, t.text_value AS target_text_value,
              obs.id::text AS observation_id, obs.numeric_value, obs.text_value, obs.notes,
              obs.quality_status, obs.created_at::text
       FROM sababuka.indicator_versions iv
       JOIN sababuka.indicators i ON i.id = iv.indicator_id
       JOIN sababuka.units u ON u.id = iv.unit_id
       JOIN sababuka.data_batches b ON b.id = $1
       LEFT JOIN sababuka.targets t ON t.indicator_version_id = iv.id
         AND t.period_id = b.reporting_period_id AND t.geography_id IS NULL
         AND t.dimension_values = '{}'::jsonb
       LEFT JOIN sababuka.observations obs ON obs.batch_id = b.id
         AND obs.indicator_version_id = iv.id AND obs.period_id = b.reporting_period_id
         AND obs.geography_id IS NULL AND obs.dimension_values = '{}'::jsonb
       WHERE iv.status = 'active'
         AND (i.owner_organization_id = b.organization_id OR EXISTS (
           SELECT 1 FROM sababuka.indicator_organizations io
           WHERE io.indicator_version_id = iv.id AND io.organization_id = b.organization_id
             AND io.responsibility IN ('primary_producer', 'supporter')))
       ORDER BY i.name`, [id],
    );
    return { ...batch, observations: observations.rows } as SubmissionDetail;
  }

  async saveObservation(auth: AuthContext, batchId: string, indicatorVersionId: string, input: ObservationInput, audit: AuditContext) {
    const detail = await this.get(auth, batchId);
    if (!['draft', 'returned'].includes(detail.status as string)) {
      throw new ApiError(409, "CONFLICT", "Capaian hanya dapat diubah saat berstatus draft atau dikembalikan.");
    }
    const assigned = (detail.observations as Record<string, unknown>[]).find((item) => item.indicator_version_id === indicatorVersionId);
    if (!assigned) throw new ApiError(403, "SCOPE_DENIED", "Indikator aktif tidak ditugaskan kepada OPD ini.");
    const dataType = assigned.data_type as string;
    const numeric = dataType !== "text" && dataType !== "boolean";
    if (numeric && (typeof input.value !== "number" || !Number.isFinite(input.value))) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nilai indikator harus berupa angka.");
    }
    if (dataType === "integer" && !Number.isInteger(input.value)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nilai indikator harus berupa bilangan bulat.");
    }
    if (dataType === "percentage" && (Number(input.value) < 0 || Number(input.value) > 100)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nilai persentase harus berada pada rentang 0 sampai 100.");
    }
    if (!numeric && (typeof input.value !== "string" || !input.value.trim())) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nilai teks tidak boleh kosong.");
    }
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `INSERT INTO sababuka.observations
         (batch_id, indicator_version_id, period_id, numeric_value, text_value,
          quality_status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 'valid', $6, $7)
       ON CONFLICT (batch_id, indicator_version_id, period_id, geography_id, dimension_hash)
       DO UPDATE SET numeric_value = EXCLUDED.numeric_value, text_value = EXCLUDED.text_value,
                     quality_status = 'valid', notes = EXCLUDED.notes, created_by = EXCLUDED.created_by,
                     created_at = now()
       RETURNING id::text, indicator_version_id::text, numeric_value, text_value, notes, quality_status, created_at::text`,
      [batchId, indicatorVersionId, detail.reporting_period_id, numeric ? input.value : null,
       numeric ? null : String(input.value).trim(), input.notes ?? null, auth.user.id],
    );
    await this.db.query(
      `UPDATE sababuka.data_batches SET row_count = (SELECT count(*) FROM sababuka.observations WHERE batch_id = $1), updated_at = now() WHERE id = $1`,
      [batchId],
    );
    await recordAudit(this.db, { ...audit, eventType: "submission.observation_saved", entityType: "data_batch",
      entityId: batchId, organizationId: detail.organization_id as string,
      afterData: result.rows[0] as Record<string, unknown>, metadata: { indicator_version_id: indicatorVersionId } });
    return result.rows[0];
  }

  async listEvidence(auth: AuthContext, batchId: string) {
    await this.get(auth, batchId);
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT e.id::text, e.batch_id::text, e.indicator_version_id::text,
              i.code AS indicator_code, i.name AS indicator_name,
              e.original_filename, e.mime_type, e.byte_size::text, e.checksum_sha256,
              e.uploaded_by::text, u.full_name AS uploaded_by_name, e.uploaded_at::text
       FROM sababuka.submission_evidence e
       LEFT JOIN sababuka.indicator_versions iv ON iv.id = e.indicator_version_id
       LEFT JOIN sababuka.indicators i ON i.id = iv.indicator_id
       JOIN sababuka.users u ON u.id = e.uploaded_by
       WHERE e.batch_id = $1 AND e.deleted_at IS NULL
       ORDER BY e.uploaded_at DESC`, [batchId],
    );
    return { data: result.rows };
  }

  async prepareEvidence(auth: AuthContext, batchId: string, indicatorVersionId?: string | null) {
    const detail = await this.get(auth, batchId);
    if (!["draft", "returned"].includes(detail.status)) {
      throw new ApiError(409, "CONFLICT", "Bukti dukung hanya dapat ditambah saat capaian berstatus draft atau dikembalikan.");
    }
    if (indicatorVersionId && !(detail.observations as Record<string, unknown>[]).some((item) => item.indicator_version_id === indicatorVersionId)) {
      throw new ApiError(403, "SCOPE_DENIED", "Indikator aktif tidak ditugaskan kepada OPD ini.");
    }
    return detail;
  }

  async createEvidence(auth: AuthContext, batchId: string, input: EvidenceMetadataInput, audit: AuditContext) {
    const detail = await this.prepareEvidence(auth, batchId, input.indicatorVersionId);
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `INSERT INTO sababuka.submission_evidence
         (batch_id, indicator_version_id, original_filename, storage_key, mime_type,
          byte_size, checksum_sha256, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id::text, batch_id::text, indicator_version_id::text, original_filename,
                 mime_type, byte_size::text, checksum_sha256, uploaded_by::text, uploaded_at::text`,
      [batchId, input.indicatorVersionId ?? null, input.originalFilename, input.storageKey,
       input.mimeType, input.byteSize, input.checksumSha256, auth.user.id],
    );
    const evidence = result.rows[0]!;
    await recordAudit(this.db, { ...audit, eventType: "submission.evidence_uploaded", entityType: "data_batch",
      entityId: batchId, organizationId: detail.organization_id,
      afterData: evidence as Record<string, unknown>, metadata: { evidence_id: evidence.id } });
    return evidence;
  }

  async getEvidence(auth: AuthContext, batchId: string, evidenceId: string) {
    await this.get(auth, batchId);
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT id::text, batch_id::text, indicator_version_id::text, original_filename,
              storage_key, mime_type, byte_size::text, checksum_sha256, uploaded_at::text
       FROM sababuka.submission_evidence
       WHERE id = $1 AND batch_id = $2 AND deleted_at IS NULL`, [evidenceId, batchId],
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Bukti dukung tidak ditemukan.");
    return result.rows[0];
  }

  async deleteEvidence(auth: AuthContext, batchId: string, evidenceId: string, audit: AuditContext) {
    const detail = await this.prepareEvidence(auth, batchId);
    const evidence = await this.getEvidence(auth, batchId, evidenceId);
    const result = await this.db.query(
      `UPDATE sababuka.submission_evidence SET deleted_by = $3, deleted_at = now()
       WHERE id = $1 AND batch_id = $2 AND deleted_at IS NULL`, [evidenceId, batchId, auth.user.id],
    );
    if (result.rowCount !== 1) throw new ApiError(404, "NOT_FOUND", "Bukti dukung tidak ditemukan.");
    await recordAudit(this.db, { ...audit, eventType: "submission.evidence_deleted", entityType: "data_batch",
      entityId: batchId, organizationId: detail.organization_id,
      beforeData: evidence as Record<string, unknown>, metadata: { evidence_id: evidenceId } });
    return evidence;
  }

  async transition(auth: AuthContext, id: string, action: SubmissionAction, notes: string | null, audit: AuditContext) {
    const detail = await this.get(auth, id);
    const from = detail.status as string;
    const transitions: Record<SubmissionAction, { from: string[]; to: string }> = {
      submit: { from: ["draft", "returned"], to: "submitted" },
      "start-review": { from: ["submitted"], to: "under_review" },
      return: { from: ["under_review"], to: "returned" },
      approve: { from: ["under_review"], to: "approved" },
    };
    const transition = transitions[action];
    if (!transition.from.includes(from)) throw new ApiError(409, "CONFLICT", `Aksi ${action} tidak berlaku dari status ${from}.`);
    if (action === "return" && !notes?.trim()) throw new ApiError(400, "VALIDATION_ERROR", "Catatan koreksi wajib diisi saat mengembalikan data.");
    if (action === "submit" && Number(detail.row_count) < 1) throw new ApiError(409, "CONFLICT", "Isi minimal satu capaian sebelum dikirim.");
    const timestampSql = action === "submit" ? ", submitted_by = $4, submitted_at = now()"
      : action === "approve" ? ", approved_by = $4, approved_at = now()" : "";
    await this.db.query(
      `UPDATE sababuka.data_batches SET status = $2, updated_at = now()${timestampSql} WHERE id = $1 AND status = $3`,
      timestampSql ? [id, transition.to, from, auth.user.id] : [id, transition.to, from],
    );
    await this.db.query(
      `INSERT INTO sababuka.workflow_actions
         (entity_type, entity_id, batch_id, action, from_status, to_status, actor_id,
          actor_role_code, organization_id, notes, request_id)
       VALUES ('data_batch', $1, $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, action, from, transition.to, auth.user.id, actorRole(auth), detail.organization_id, notes, audit.requestId],
    );
    await recordAudit(this.db, { ...audit, eventType: `submission.${action}`, entityType: "data_batch",
      entityId: id, organizationId: detail.organization_id as string,
      beforeData: { status: from }, afterData: { status: transition.to }, metadata: { notes } });
    const entity = { entityType: "data_batch", entityId: id };
    if (action === "submit") {
      await notifyRole(this.db, "bapperida", { ...entity, type: "submission.submitted", title: "Pengiriman capaian baru",
        message: `${detail.organization_name} mengirim capaian ${detail.period_label} untuk ditinjau.` }, auth.user.id);
    } else if (action === "return") {
      await notifyOrganization(this.db, detail.organization_id, { ...entity, type: "submission.returned", title: "Capaian perlu diperbaiki",
        message: `Capaian ${detail.period_label} dikembalikan. Catatan: ${notes}` }, auth.user.id);
    } else if (action === "approve") {
      await notifyOrganization(this.db, detail.organization_id, { ...entity, type: "submission.approved", title: "Capaian disetujui",
        message: `Capaian ${detail.period_label} telah disetujui Bapperida.` }, auth.user.id);
    }
    return this.get(auth, id);
  }
}
