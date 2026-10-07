import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

const stopWords = new Set(["apa", "berapa", "bagaimana", "dan", "atau", "yang", "dari", "untuk", "pada", "di", "ke", "tahun", "data", "capaian", "indikator", "tampilkan", "jelaskan", "nilai"]);
function tokens(value: string) { return [...new Set(value.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/gu, " ").split(/\s+/u).filter((word) => word.length > 1 && !stopWords.has(word)))]; }
function formatValue(row: Record<string, unknown>) {
  if (row.text_value !== null) return String(row.text_value);
  const formatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(Number(row.numeric_value));
  return `${formatted}${row.unit_symbol ? ` ${row.unit_symbol}` : row.unit_name ? ` ${row.unit_name}` : ""}`;
}

export class AssistantService {
  constructor(private readonly db: Database) {}
  private async ensureEnabled() {
    const result = await this.db.query<{ is_enabled: boolean }>(`SELECT is_enabled FROM sababuka.feature_flags WHERE code = 'assistant.enabled'`);
    if (!result.rows[0]?.is_enabled) throw new ApiError(403, "PERMISSION_DENIED", "Asisten AI sedang dinonaktifkan oleh administrator.");
  }
  async createSession(auth: AuthContext, title: string | null, audit: AuditContext) {
    await this.ensureEnabled();
    const organizationId = auth.user.organizations[0]?.id ?? null;
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `INSERT INTO sababuka.assistant_sessions (user_id, organization_id, title) VALUES ($1, $2, $3)
       RETURNING id::text, title, status, started_at::text`, [auth.user.id, organizationId, title],
    );
    await recordAudit(this.db, { ...audit, eventType: "assistant.session_created", entityType: "assistant_session", entityId: result.rows[0]!.id as string, organizationId });
    return result.rows[0];
  }
  async ask(auth: AuthContext, sessionId: string, question: string, audit: AuditContext) {
    await this.ensureEnabled();
    const session = await this.db.query(`SELECT id FROM sababuka.assistant_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'`, [sessionId, auth.user.id]);
    if (!session.rows[0]) throw new ApiError(404, "NOT_FOUND", "Sesi asisten tidak ditemukan atau sudah ditutup.");
    const source = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT pi.id::text AS publication_item_id, i.code AS indicator_code, i.name AS indicator_name,
              c.name AS category_name, per.label AS period_label, per.code AS period_code,
              obs.numeric_value, obs.text_value, u.name AS unit_name, u.symbol AS unit_symbol,
              org.name AS organization_name, COALESCE(obs.source_name, iv.source_reference, d.title) AS source,
              pub.title AS publication_title, pub.effective_at::text
       FROM sababuka.publication_items pi
       JOIN sababuka.publications pub ON pub.id = pi.publication_id AND pub.status = 'active'
       JOIN sababuka.observations obs ON obs.id = pi.observation_id
       JOIN sababuka.indicator_versions iv ON iv.id = obs.indicator_version_id
       JOIN sababuka.indicators i ON i.id = iv.indicator_id JOIN sababuka.categories c ON c.id = i.category_id
       JOIN sababuka.periods per ON per.id = obs.period_id JOIN sababuka.units u ON u.id = iv.unit_id
       JOIN sababuka.data_batches b ON b.id = obs.batch_id AND b.status IN ('approved', 'published')
       JOIN sababuka.organizations org ON org.id = b.organization_id
       JOIN sababuka.dataset_versions dv ON dv.id = pi.dataset_version_id JOIN sababuka.datasets d ON d.id = dv.dataset_id
       ORDER BY pub.effective_at DESC, pi.display_order LIMIT 500`,
    );
    const queryTokens = tokens(question);
    const broad = /ringkasan|semua|terbaru|dashboard/iu.test(question);
    const ranked = source.rows.map((row) => {
      const haystack = tokens([row.indicator_code, row.indicator_name, row.category_name, row.period_code, row.period_label, row.organization_name].join(" "));
      const score = queryTokens.filter((token) => haystack.some((word) => word.includes(token) || token.includes(word))).length;
      return { row, score };
    }).filter((item) => broad || item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    const userMessage = await this.db.query<{ id: string }>(
      `INSERT INTO sababuka.assistant_messages (session_id, message_role, content, structured_data, request_id)
       VALUES ($1, 'user', $2, $3::jsonb, $4) RETURNING id::text`,
      [sessionId, question, JSON.stringify({ token_count: queryTokens.length }), audit.requestId],
    );
    const sufficiency = ranked.length ? (broad || ranked[0]!.score < Math.max(1, queryTokens.length) ? "partial" : "sufficient") : "insufficient";
    const answer = ranked.length
      ? `Berdasarkan publikasi aktif, ${ranked.map(({ row }) => `${row.indicator_name} (${row.period_label}) tercatat ${formatValue(row)} oleh ${row.organization_name}`).join("; ")}.`
      : "Data pada publikasi aktif belum cukup untuk menjawab pertanyaan tersebut. Silakan periksa indikator, periode, atau status publikasinya.";
    const assistantMessage = await this.db.query<{ id: string }>(
      `INSERT INTO sababuka.assistant_messages (session_id, message_role, content, model_name, structured_data, request_id)
       VALUES ($1, 'assistant', $2, 'sababuka-retrieval-v1', $3::jsonb, $4) RETURNING id::text`,
      [sessionId, answer, JSON.stringify({ sufficiency, retrieval: "active_publications_only", user_message_id: userMessage.rows[0]!.id }), audit.requestId],
    );
    const citations = [];
    for (const [index, { row }] of ranked.entries()) {
      const label = `[${index + 1}] ${row.indicator_name} · ${row.period_label}`;
      await this.db.query(
        `INSERT INTO sababuka.assistant_citations (message_id, publication_item_id, citation_label, excerpt_data)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [assistantMessage.rows[0]!.id, row.publication_item_id, label, JSON.stringify({ value: formatValue(row), organization: row.organization_name, source: row.source })],
      );
      citations.push({ publication_item_id: row.publication_item_id, label, indicator: row.indicator_name, period: row.period_label, organization: row.organization_name, source: row.source });
    }
    await recordAudit(this.db, { ...audit, eventType: "assistant.answer_generated", entityType: "assistant_session", entityId: sessionId, metadata: { sufficiency, citation_count: citations.length } });
    return { message_id: assistantMessage.rows[0]!.id, answer, citations, sufficiency };
  }
}
