import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";
import { notifyRole } from "./notification-service.js";

interface CountedRow extends QueryResultRow { total_count: string }
export interface PublicationInput { publication_key: string; publication_number: string; title: string; description?: string | null; effective_at?: string | null; change_notes?: string | null }

function actorRole(auth: AuthContext) { return auth.user.roles[0]?.code ?? "unknown"; }
function isPimpinanOnly(auth: AuthContext) { return auth.user.roles.some((role) => role.code === "pimpinan") && !auth.user.roles.some((role) => role.scope_type === "global"); }

export class PublicationService {
  constructor(private readonly db: Database) {}

  async list(auth: AuthContext, page: number, pageSize: number, status?: string) {
    const effectiveStatus = isPimpinanOnly(auth) ? "active" : status ?? null;
    const result = await this.db.query<CountedRow & Record<string, unknown>>(
      `SELECT p.id::text, p.publication_key, p.version_number, p.publication_number, p.title,
              p.description, p.status, p.effective_at::text, p.change_notes,
              p.created_at::text, p.updated_at::text, count(pi.id)::int AS item_count,
              count(*) OVER()::text AS total_count
       FROM sababuka.publications p LEFT JOIN sababuka.publication_items pi ON pi.publication_id = p.id
       WHERE ($1::text IS NULL OR p.status = $1)
       GROUP BY p.id ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [effectiveStatus, pageSize, (page - 1) * pageSize],
    );
    const total = Number(result.rows[0]?.total_count ?? 0);
    return { data: result.rows.map(({ total_count: _, ...row }) => row), meta: { page, page_size: pageSize, total_items: total, total_pages: total ? Math.ceil(total / pageSize) : 0 } };
  }

  async get(auth: AuthContext, id: string): Promise<Record<string, unknown> & { status: string; items: Record<string, unknown>[] }> {
    const publication = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT id::text, publication_key, version_number, publication_number, title, description,
              status, effective_at::text, change_notes, created_at::text, updated_at::text
       FROM sababuka.publications WHERE id = $1 AND ($2::boolean = false OR status = 'active')`, [id, isPimpinanOnly(auth)],
    );
    if (!publication.rows[0]) throw new ApiError(404, "NOT_FOUND", "Publikasi tidak ditemukan.");
    const items = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT pi.id::text, pi.observation_id::text, pi.dataset_version_id::text, pi.display_order,
              i.code AS indicator_code, i.name AS indicator_name, per.label AS period_label,
              obs.numeric_value, obs.text_value, u.name AS unit_name, u.symbol AS unit_symbol,
              org.name AS organization_name
       FROM sababuka.publication_items pi
       JOIN sababuka.observations obs ON obs.id = pi.observation_id
       JOIN sababuka.indicator_versions iv ON iv.id = obs.indicator_version_id
       JOIN sababuka.indicators i ON i.id = iv.indicator_id JOIN sababuka.units u ON u.id = iv.unit_id
       JOIN sababuka.periods per ON per.id = obs.period_id
       JOIN sababuka.data_batches b ON b.id = obs.batch_id JOIN sababuka.organizations org ON org.id = b.organization_id
       WHERE pi.publication_id = $1 ORDER BY pi.display_order, i.name`, [id],
    );
    return { ...publication.rows[0], items: items.rows } as Record<string, unknown> & { status: string; items: Record<string, unknown>[] };
  }

  async candidates(periodId?: string) {
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT obs.id::text AS observation_id, b.dataset_version_id::text, i.code AS indicator_code,
              i.name AS indicator_name, per.id::text AS period_id, per.label AS period_label,
              obs.numeric_value, obs.text_value, u.name AS unit_name, u.symbol AS unit_symbol,
              org.name AS organization_name, b.approved_at::text
       FROM sababuka.observations obs JOIN sababuka.data_batches b ON b.id = obs.batch_id AND b.status = 'approved'
       JOIN sababuka.indicator_versions iv ON iv.id = obs.indicator_version_id
       JOIN sababuka.indicators i ON i.id = iv.indicator_id JOIN sababuka.units u ON u.id = iv.unit_id
       JOIN sababuka.periods per ON per.id = obs.period_id JOIN sababuka.organizations org ON org.id = b.organization_id
       WHERE ($1::uuid IS NULL OR per.id = $1)
         AND NOT EXISTS (SELECT 1 FROM sababuka.publication_items pi JOIN sababuka.publications p ON p.id = pi.publication_id WHERE pi.observation_id = obs.id AND p.status = 'active')
       ORDER BY per.starts_on DESC, i.name`, [periodId ?? null],
    );
    return { data: result.rows };
  }

  async create(auth: AuthContext, input: PublicationInput, audit: AuditContext) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.publication_key]);
      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.publications
           (publication_key, version_number, publication_number, title, description, effective_at, change_notes, created_by)
         SELECT $1::varchar, COALESCE(max(version_number), 0) + 1, $2, $3, $4, $5, $6, $7
         FROM sababuka.publications WHERE publication_key = $1::varchar
         RETURNING id::text`,
        [input.publication_key, input.publication_number, input.title, input.description ?? null, input.effective_at ?? null, input.change_notes ?? null, auth.user.id],
      );
      await recordAudit(client, { ...audit, eventType: "publication.created", entityType: "publication", entityId: result.rows[0]!.id as string });
      await client.query("COMMIT");
      return this.get(auth, result.rows[0]!.id as string);
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") throw new ApiError(409, "CONFLICT", "Nomor publikasi sudah digunakan.");
      throw error;
    } finally { client.release(); }
  }

  async addItems(auth: AuthContext, id: string, observationIds: string[], audit: AuditContext) {
    const before = await this.get(auth, id);
    if (before.status !== "draft") throw new ApiError(409, "CONFLICT", "Item hanya dapat ditambahkan pada publikasi draft.");
    try {
      const result = await this.db.query(
        `INSERT INTO sababuka.publication_items (publication_id, observation_id, dataset_version_id, display_order)
         SELECT $1, obs.id, b.dataset_version_id,
                COALESCE((SELECT max(display_order) FROM sababuka.publication_items WHERE publication_id = $1), 0) + row_number() OVER()
         FROM sababuka.observations obs JOIN sababuka.data_batches b ON b.id = obs.batch_id
         WHERE obs.id = ANY($2::uuid[]) AND b.status = 'approved'
         ON CONFLICT DO NOTHING`, [id, observationIds],
      );
      if (result.rowCount !== observationIds.length) throw new ApiError(422, "VALIDATION_ERROR", "Sebagian capaian tidak ditemukan, belum disetujui, atau sudah ditambahkan.");
      const detail = await this.get(auth, id);
      await recordAudit(this.db, { ...audit, eventType: "publication.items_added", entityType: "publication", entityId: id, metadata: { observation_ids: observationIds } });
      return detail;
    } catch (error) { if ((error as { code?: string }).code === "23514") throw new ApiError(422, "VALIDATION_ERROR", "Hanya capaian yang telah disetujui dapat dipublikasikan."); throw error; }
  }

  async activate(auth: AuthContext, id: string, notes: string | null, audit: AuditContext) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<QueryResultRow & Record<string, unknown>>(`SELECT * FROM sababuka.publications WHERE id = $1 FOR UPDATE`, [id]);
      const publication = current.rows[0];
      if (!publication) throw new ApiError(404, "NOT_FOUND", "Publikasi tidak ditemukan.");
      if (publication.status !== "draft") throw new ApiError(409, "CONFLICT", "Hanya publikasi draft yang dapat diaktifkan.");
      const count = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM sababuka.publication_items WHERE publication_id = $1`, [id]);
      if (Number(count.rows[0]!.count) < 1) throw new ApiError(422, "VALIDATION_ERROR", "Tambahkan minimal satu capaian sebelum publikasi diaktifkan.");
      await client.query(`UPDATE sababuka.publications SET status = 'replaced', replaced_by_id = $2, updated_at = now() WHERE publication_key = $1 AND status = 'active'`, [publication.publication_key, id]);
      await client.query(`UPDATE sababuka.publications SET status = 'active', activated_by = $2, activated_at = now(), effective_at = COALESCE(effective_at, now()), updated_at = now() WHERE id = $1`, [id, auth.user.id]);
      await client.query(`INSERT INTO sababuka.workflow_actions (entity_type, entity_id, action, from_status, to_status, actor_id, actor_role_code, notes, request_id) VALUES ('publication', $1, 'activate', 'draft', 'active', $2, $3, $4, $5)`, [id, auth.user.id, actorRole(auth), notes, audit.requestId]);
      await recordAudit(client, { ...audit, eventType: "publication.activated", entityType: "publication", entityId: id, beforeData: { status: "draft" }, afterData: { status: "active" }, metadata: { notes } });
      await client.query("COMMIT");
      await notifyRole(this.db, "pimpinan", { type: "publication.activated", title: "Publikasi baru tersedia",
        message: `${publication.title} telah aktif pada dashboard pimpinan.`, entityType: "publication", entityId: id }, auth.user.id);
      return this.get(auth, id);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
