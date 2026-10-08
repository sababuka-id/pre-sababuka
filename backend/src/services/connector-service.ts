import { createHash } from "node:crypto";
import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import type { AppConfig } from "../config.js";
import { decryptSecret, encryptSecret, maskSecret } from "../security/secrets.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

interface SourceRow extends QueryResultRow { id: string; code: string; name: string; source_type: string; base_url: string | null; connection_config: Record<string, unknown>; credential_reference: string | null; last_checked_at: string | null }
interface MappingRow extends QueryResultRow { id: string; indicator_version_id: string; indicator_code: string; indicator_name: string; source_id: string; source_code: string; source_type: string; external_dataset_id: string; external_resource_id: string | null; resource_url: string | null; geography_field: string | null; geography_code: string; year_field: string; value_field: string; unit_field: string | null; expected_unit: string | null; frequency: string; transform_json: Record<string, unknown>; source_priority: number; relation_type: string; status: string; dataset_version_id: string | null }
type JsonObject = Record<string, unknown>;

export interface ConnectionProfile {
  source_code: string;
  reachable: boolean;
  response_ms: number | null;
  platform: string | null;
  dataset_count: number | null;
  resource_count: number | null;
  publishers: string[];
  years: number[];
  checked_at: string;
  error: string | null;
  candidate_summary: CandidateSummary;
}

interface CandidateSummary {
  candidate_count: number;
  mapped_count: number;
  unmapped_count: number;
  ambiguous_count: number;
  candidates: Array<{ type: "category" | "indicator"; code: string; name: string; source_title: string; score: number; reason: string; status: "mapped" | "unmapped" | "ambiguous" }>;
}

interface BpsSecretRow extends QueryResultRow { encrypted_secret: string; masked_hint: string | null; last_tested_at: string | null; last_test_status: string; last_test_error: string | null }

const YEARS = new Set([2025, 2026, 2027, 2028, 2029]);

function hash(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }
function asText(value: unknown): string { return value === null || value === undefined ? "" : String(value).trim(); }
function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = asText(value).replace(/\s+/gu, "").replace(/\.(?=\d{3}(?:\D|$))/gu, "").replace(",", ".");
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

export function parseCsv(text: string): JsonObject[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); cell = ""; if (row.some((item) => item.trim())) rows.push(row); row = []; continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = (rows.shift() ?? []).map((item) => item.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function fetchText(url: string, options?: RequestInit): Promise<{ text: string; checksum: string }> {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new ApiError(502, "SOURCE_UNAVAILABLE", `Sumber eksternal mengembalikan HTTP ${response.status}.`);
  const text = await response.text();
  return { text, checksum: hash(text) };
}

export interface MappingInput {
  indicator_version_id: string; source_code: string; external_dataset_id: string; external_resource_id?: string | null;
  resource_url?: string | null; geography_field?: string | null; geography_code?: string; year_field: string;
  value_field: string; unit_field?: string | null; expected_unit?: string | null; source_priority?: number;
  relation_type?: "primary" | "supporting" | "comparison"; effective_from?: string;
}

export class ConnectorService {
  constructor(private readonly db: Database, private readonly config?: AppConfig) {}

  async listSources() {
    const result = await this.db.query<SourceRow>(`SELECT id::text, code, name, source_type, base_url, connection_config, credential_reference, last_checked_at::text FROM sababuka.data_sources WHERE code IN ('SATUDATA_KAPUAS','BPS_KAPUAS') ORDER BY code`);
    const rows = await Promise.all(result.rows.map(async (source) => {
      if (source.source_type === "bps" && !(await this.resolveBpsSecret())) return { ...source, status: "waiting_api_key" };
      try {
        if (source.source_type === "ckan") await this.ckanStatus(source);
        else if (source.source_type === "bps") await this.bpsStatus(source);
        return { ...source, status: "connected" };
      } catch (error) { return { ...source, status: "error", status_message: error instanceof Error ? error.message : "Koneksi gagal." }; }
    }));
    return { data: rows };
  }

  private async source(code: string): Promise<SourceRow> {
    const result = await this.db.query<SourceRow>(`SELECT id::text, code, name, source_type, base_url, connection_config, credential_reference, last_checked_at::text FROM sababuka.data_sources WHERE code = $1 AND is_active = true`, [code]);
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Sumber data tidak ditemukan.");
    return result.rows[0];
  }

  private async ckanStatus(source: SourceRow) {
    const base = `${source.base_url!.replace(/\/$/u, "")}/api/3/action/status_show`;
    const response = await fetch(base, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`CKAN HTTP ${response.status}`);
    const payload = await response.json() as { success?: boolean; result?: JsonObject };
    if (!payload.success) throw new Error("CKAN status tidak valid.");
    await this.db.query(`UPDATE sababuka.data_sources SET last_checked_at = now(), updated_at = now() WHERE id = $1`, [source.id]);
    return payload.result ?? {};
  }

  private async resolveBpsSecret(): Promise<{ value: string; storage: "database" | "environment" } | null> {
    const result = await this.db.query<BpsSecretRow>(`SELECT encrypted_secret, masked_hint, last_tested_at::text, last_test_status, last_test_error FROM sababuka.connector_secrets cs JOIN sababuka.data_sources s ON s.id=cs.source_id WHERE s.code='BPS_KAPUAS'`);
    if (result.rows[0]) {
      if (!this.config?.connectorEncryptionKey) throw new ApiError(503, "CONFIGURATION_ERROR", "Master key konektor belum dikonfigurasi.");
      try {
        return { value: decryptSecret(result.rows[0].encrypted_secret, this.config.connectorEncryptionKey), storage: "database" };
      } catch {
        throw new ApiError(503, "CONFIGURATION_ERROR", "Secret konektor tidak dapat dibuka dengan master key saat ini.");
      }
    }
    const legacy = process.env.BPS_API_KEY?.trim();
    return legacy ? { value: legacy, storage: "environment" } : null;
  }

  private async bpsStatus(source: SourceRow) {
    const secret = await this.resolveBpsSecret();
    if (!secret) throw new ApiError(409, "CONNECTOR_WAITING_KEY", "API key BPS belum dikonfigurasi.");
    const domain = asText(source.connection_config.domain_code) || "6203";
    const url = `${source.base_url!.replace(/\/$/u, "")}/domain/type/adminkab/${encodeURIComponent(domain)}?key=${encodeURIComponent(secret.value)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`BPS HTTP ${response.status}`);
    await this.db.query(`UPDATE sababuka.data_sources SET last_checked_at = now(), updated_at = now() WHERE id = $1`, [source.id]);
    return await response.json() as JsonObject;
  }

  async searchCkan(query: string | undefined, rows: number) {
    const source = await this.source("SATUDATA_KAPUAS");
    const url = new URL(`${source.base_url!.replace(/\/$/u, "")}/api/3/action/package_search`);
    url.searchParams.set("rows", String(Math.min(rows, 50))); if (query) url.searchParams.set("q", query);
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new ApiError(502, "SOURCE_UNAVAILABLE", `CKAN mengembalikan HTTP ${response.status}.`);
    const payload = await response.json() as { success?: boolean; result?: { count?: number; results?: JsonObject[] } };
    if (!payload.success || !payload.result) throw new ApiError(502, "SOURCE_INVALID", "Respons CKAN tidak valid.");
    return { source: { code: source.code, name: source.name, base_url: source.base_url }, count: payload.result.count ?? 0, results: (payload.result.results ?? []).map((item) => ({ id: item.id, name: item.name, title: item.title, notes: item.notes, organization: item.organization, resources: item.resources })) };
  }

  async getBpsSecretStatus() {
    const result = await this.db.query<BpsSecretRow>(`SELECT cs.encrypted_secret, cs.masked_hint, cs.last_tested_at::text, cs.last_test_status, cs.last_test_error FROM sababuka.connector_secrets cs JOIN sababuka.data_sources s ON s.id=cs.source_id WHERE s.code='BPS_KAPUAS'`);
    const row = result.rows[0];
    const legacy = !row && process.env.BPS_API_KEY?.trim();
    return {
      source_code: "BPS_KAPUAS",
      configured: Boolean(row || legacy),
      storage: row ? "encrypted_database" : legacy ? "environment_compatibility" : "none",
      masked: row?.masked_hint ?? maskSecret(process.env.BPS_API_KEY),
      master_key_configured: Boolean(this.config?.connectorEncryptionKey),
      last_tested_at: row?.last_tested_at ?? null,
      last_test_status: row?.last_test_status ?? (legacy ? "not_tested" : "not_configured"),
      last_test_error: row?.last_test_error ?? null,
      domain_code: "6203",
    };
  }

  async saveBpsSecret(auth: AuthContext, value: string, audit: AuditContext) {
    if (!this.config?.connectorEncryptionKey) throw new ApiError(503, "CONFIGURATION_ERROR", "Master key konektor belum dikonfigurasi. Secret tidak disimpan.");
    const secret = value.trim();
    if (secret.length < 8 || secret.length > 512) throw new ApiError(400, "VALIDATION_ERROR", "API key BPS harus berisi 8-512 karakter.");
    const source = await this.source("BPS_KAPUAS");
    const profile = await this.buildBpsProfile(source, secret);
    if (!profile.reachable) throw new ApiError(502, "SOURCE_UNAVAILABLE", profile.error ?? "Uji koneksi BPS gagal.");
    const encrypted = encryptSecret(secret, this.config.connectorEncryptionKey);
    await this.db.query(`INSERT INTO sababuka.connector_secrets (source_id, encrypted_secret, masked_hint, last_tested_at, last_test_status, last_test_error, updated_by) VALUES ($1,$2,$3,now(),'connected',NULL,$4) ON CONFLICT (source_id) DO UPDATE SET encrypted_secret=EXCLUDED.encrypted_secret, masked_hint=EXCLUDED.masked_hint, last_tested_at=now(), last_test_status='connected', last_test_error=NULL, updated_by=EXCLUDED.updated_by, updated_at=now()`, [source.id, encrypted, maskSecret(secret), auth.user.id]);
    await recordAudit(this.db, { ...audit, eventType: "connector.bps_secret_saved", entityType: "data_source", entityId: source.id, afterData: { configured: true, test_status: "connected" }, metadata: { source_code: source.code } });
    await this.persistProfile(source, profile);
    return { status: await this.getBpsSecretStatus(), profile };
  }

  async clearBpsSecret(auth: AuthContext, audit: AuditContext) {
    const source = await this.source("BPS_KAPUAS");
    await this.db.query(`DELETE FROM sababuka.connector_secrets WHERE source_id=$1`, [source.id]);
    await recordAudit(this.db, { ...audit, eventType: "connector.bps_secret_removed", entityType: "data_source", entityId: source.id, afterData: { configured: false }, metadata: { source_code: source.code } });
    return this.getBpsSecretStatus();
  }

  async testSource(sourceCode: "SATUDATA_KAPUAS" | "BPS_KAPUAS", audit: AuditContext) {
    const source = await this.source(sourceCode);
    const profile = source.source_type === "ckan" ? await this.buildCkanProfile(source) : await this.buildBpsProfile(source);
    await this.persistProfile(source, profile);
    if (sourceCode === "BPS_KAPUAS") await this.db.query(`UPDATE sababuka.connector_secrets SET last_tested_at=$2, last_test_status=$3, last_test_error=$4, updated_at=now() WHERE source_id=$1`, [source.id, profile.checked_at, profile.reachable ? "connected" : "failed", profile.error]);
    await recordAudit(this.db, { ...audit, eventType: "connector.connection_tested", entityType: "data_source", entityId: source.id, afterData: { reachable: profile.reachable, response_ms: profile.response_ms, candidate_summary: profile.candidate_summary }, metadata: { source_code: source.code } });
    return profile;
  }

  private async buildCkanProfile(source: SourceRow): Promise<ConnectionProfile> {
    const started = Date.now();
    try {
      const base = source.base_url!.replace(/\/$/u, "");
      const statusResponse = await fetch(`${base}/api/3/action/status_show`, { signal: AbortSignal.timeout(15_000) });
      if (!statusResponse.ok) throw new Error(`HTTP ${statusResponse.status}`);
      const status = await statusResponse.json() as { success?: boolean; result?: JsonObject };
      if (!status.success) throw new Error("status invalid");
      const catalogResponse = await fetch(`${base}/api/3/action/package_search?rows=50`, { signal: AbortSignal.timeout(20_000) });
      if (!catalogResponse.ok) throw new Error(`HTTP ${catalogResponse.status}`);
      const catalog = await catalogResponse.json() as { success?: boolean; result?: { count?: number; results?: JsonObject[] } };
      if (!catalog.success || !catalog.result) throw new Error("catalog invalid");
      const packages = catalog.result.results ?? [];
      const publishers = [...new Set(packages.map((item) => typeof item.organization === "object" && item.organization ? asText((item.organization as JsonObject).title ?? (item.organization as JsonObject).name) : "").filter(Boolean))].slice(0, 25);
      const years = [...new Set(packages.flatMap((item) => `${asText(item.title)} ${asText(item.notes)}`.match(/20\d{2}/gu) ?? []).map(Number).filter((year) => year >= 2000 && year <= 2100))].sort();
      const resources = packages.flatMap((item) => Array.isArray(item.resources) ? item.resources : []).filter((item) => typeof item === "object" && item).filter((item) => ["csv", "json", "api"].includes(asText((item as JsonObject).format).toLowerCase()) || /\.(csv|json)(\?|$)/iu.test(asText((item as JsonObject).url)));
      const titles = packages.map((item) => asText(item.title)).filter(Boolean);
      return { source_code: source.code, reachable: true, response_ms: Date.now() - started, platform: `CKAN ${asText(status.result?.version) || "catalog"}`, dataset_count: catalog.result.count ?? packages.length, resource_count: resources.length, publishers, years, checked_at: new Date().toISOString(), error: null, candidate_summary: await this.matchCandidates(titles, source.id) };
    } catch (error) {
      return this.failedProfile(source.code, started, error);
    }
  }

  private async buildBpsProfile(source: SourceRow, override?: string): Promise<ConnectionProfile> {
    const started = Date.now();
    try {
      const secret = override ? { value: override } : await this.resolveBpsSecret();
      if (!secret) return this.failedProfile(source.code, started, new Error("API key BPS belum dikonfigurasi."));
      const domain = asText(source.connection_config.domain_code) || "6203";
      const url = `${source.base_url!.replace(/\/$/u, "")}/domain/type/adminkab/${encodeURIComponent(domain)}?key=${encodeURIComponent(secret.value)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as JsonObject;
      const values = Array.isArray(payload.data) ? payload.data : [];
      const titles = values.map((item) => typeof item === "object" && item ? asText((item as JsonObject).name ?? (item as JsonObject).title ?? (item as JsonObject).var) : "").filter(Boolean);
      return { source_code: source.code, reachable: true, response_ms: Date.now() - started, platform: "BPS WebAPI", dataset_count: values.length || 1, resource_count: values.length, publishers: ["BPS Kabupaten Kapuas"], years: [2025, 2026, 2027, 2028, 2029], checked_at: new Date().toISOString(), error: null, candidate_summary: await this.matchCandidates(titles, source.id) };
    } catch (error) {
      return this.failedProfile(source.code, started, error);
    }
  }

  private failedProfile(sourceCode: string, started: number, error: unknown): ConnectionProfile {
    const message = error instanceof Error && error.message.startsWith("API key") ? error.message : "Sumber tidak dapat dijangkau atau responsnya tidak valid.";
    return { source_code: sourceCode, reachable: false, response_ms: Date.now() - started, platform: null, dataset_count: null, resource_count: null, publishers: [], years: [], checked_at: new Date().toISOString(), error: message, candidate_summary: { candidate_count: 0, mapped_count: 0, unmapped_count: 0, ambiguous_count: 0, candidates: [] } };
  }

  private async persistProfile(source: SourceRow, profile: ConnectionProfile): Promise<void> {
    await this.db.query(`INSERT INTO sababuka.connector_connection_checks (source_id,checked_at,reachable,response_ms,platform,dataset_count,resource_count,publishers,years,error_text,candidate_summary) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb) ON CONFLICT (source_id) DO UPDATE SET checked_at=EXCLUDED.checked_at, reachable=EXCLUDED.reachable, response_ms=EXCLUDED.response_ms, platform=EXCLUDED.platform, dataset_count=EXCLUDED.dataset_count, resource_count=EXCLUDED.resource_count, publishers=EXCLUDED.publishers, years=EXCLUDED.years, error_text=EXCLUDED.error_text, candidate_summary=EXCLUDED.candidate_summary`, [source.id, profile.checked_at, profile.reachable, profile.response_ms, profile.platform, profile.dataset_count, profile.resource_count, JSON.stringify(profile.publishers), JSON.stringify(profile.years), profile.error, JSON.stringify(profile.candidate_summary)]);
  }

  private async matchCandidates(titles: string[], sourceId: string): Promise<CandidateSummary> {
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT 'category' AS type, c.code, c.name, NULL::text AS indicator_version_id FROM sababuka.categories c WHERE c.is_active=true AND c.review_status='approved' UNION ALL SELECT 'indicator' AS type, i.code, i.name, iv.id::text AS indicator_version_id FROM sababuka.indicators i JOIN sababuka.categories c ON c.id=i.category_id JOIN sababuka.indicator_versions iv ON iv.indicator_id=i.id WHERE i.is_active=true AND c.is_active=true AND c.review_status='approved' AND iv.status IN ('approved','active')`);
    const mapped = await this.db.query<{ indicator_code: string }>(`SELECT i.code AS indicator_code FROM sababuka.indicator_source_mappings m JOIN sababuka.indicator_versions iv ON iv.id=m.indicator_version_id JOIN sababuka.indicators i ON i.id=iv.indicator_id WHERE m.source_id=$1 AND m.status IN ('approved','active')`, [sourceId]);
    const mappedCodes = new Set(mapped.rows.map((row) => row.indicator_code));
    const candidates: CandidateSummary["candidates"] = [];
    for (const title of titles.slice(0, 100)) {
      const tokens = new Set(title.toLowerCase().split(/[^a-z0-9]+/u).filter((token) => token.length >= 3));
      const scored = result.rows.map((row) => {
        const target = asText(row.name).toLowerCase();
        const targetTokens = [...new Set(target.split(/[^a-z0-9]+/u).filter((token) => token.length >= 3))];
        const overlap = targetTokens.filter((token) => tokens.has(token));
        const score = targetTokens.length ? overlap.length / targetTokens.length : 0;
        return { row, score, overlap };
      }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
      if (!scored[0]) continue;
      const ambiguous = Boolean(scored[1] && Math.abs(scored[0].score - scored[1].score) < 0.1);
      const item = scored[0]; const code = asText(item.row.code);
      candidates.push({ type: item.row.type as "category" | "indicator", code, name: asText(item.row.name), source_title: title, score: Number(item.score.toFixed(2)), reason: `Kata kunci cocok: ${item.overlap.slice(0, 4).join(", ")}`, status: ambiguous ? "ambiguous" : item.row.type === "indicator" && mappedCodes.has(code) ? "mapped" : "unmapped" });
    }
    return { candidate_count: candidates.length, mapped_count: candidates.filter((item) => item.status === "mapped").length, unmapped_count: candidates.filter((item) => item.status === "unmapped").length, ambiguous_count: candidates.filter((item) => item.status === "ambiguous").length, candidates };
  }

  async listMappings() {
    const result = await this.db.query<MappingRow>(`SELECT m.id::text, m.indicator_version_id::text, i.code AS indicator_code, i.name AS indicator_name,
      m.source_id::text, s.code AS source_code, s.source_type, m.external_dataset_id, m.external_resource_id, m.resource_url,
      m.geography_field, m.geography_code, m.year_field, m.value_field, m.unit_field, m.expected_unit, m.frequency,
      m.transform_json, m.source_priority, m.relation_type, m.status, m.dataset_version_id::text
      FROM sababuka.indicator_source_mappings m JOIN sababuka.indicator_versions iv ON iv.id=m.indicator_version_id
      JOIN sababuka.indicators i ON i.id=iv.indicator_id JOIN sababuka.data_sources s ON s.id=m.source_id
      ORDER BY m.status, i.name, m.created_at DESC`);
    return { data: result.rows };
  }

  async createMapping(auth: AuthContext, input: MappingInput, audit: AuditContext) {
    const source = await this.source(input.source_code);
    const indicator = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT iv.id::text, iv.frequency, iv.data_type, iv.status, i.code, i.owner_organization_id::text, i.is_active AS indicator_is_active, c.review_status, c.is_active AS category_is_active FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id=iv.indicator_id JOIN sababuka.categories c ON c.id=i.category_id WHERE iv.id=$1`, [input.indicator_version_id]);
    if (!indicator.rows[0]) throw new ApiError(404, "NOT_FOUND", "Versi indikator tidak ditemukan.");
    if (indicator.rows[0].frequency !== "annual") throw new ApiError(400, "VALIDATION_ERROR", "Konektor ini hanya menerima indikator tahunan.");
    if (!indicator.rows[0].indicator_is_active || !indicator.rows[0].category_is_active || indicator.rows[0].review_status !== "approved" || !["approved", "active"].includes(String(indicator.rows[0].status))) throw new ApiError(409, "CONFLICT", "Mapping hanya dapat dibuat untuk indikator dan kategori yang telah disetujui/aktif.");
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(`INSERT INTO sababuka.indicator_source_mappings
      (indicator_version_id, source_id, external_dataset_id, external_resource_id, resource_url, geography_field, geography_code,
       year_field, value_field, unit_field, expected_unit, frequency, source_priority, relation_type, effective_from, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'annual',$12,$13,$14,$15) RETURNING id::text`,
      [input.indicator_version_id, source.id, input.external_dataset_id, input.external_resource_id ?? null, input.resource_url ?? null,
       input.geography_field ?? null, input.geography_code ?? "6203", input.year_field, input.value_field, input.unit_field ?? null,
       input.expected_unit ?? null, input.source_priority ?? 100, input.relation_type ?? "primary", input.effective_from ?? "2025-01-01", auth.user.id]);
    await recordAudit(this.db, { ...audit, eventType: "connector.mapping_created", entityType: "indicator_source_mapping", entityId: result.rows[0]!.id as string, afterData: input as unknown as JsonObject, metadata: { source_code: input.source_code } });
    return this.getMapping(result.rows[0]!.id as string);
  }

  async transitionMapping(auth: AuthContext, id: string, action: "approve" | "activate" | "retire", audit: AuditContext) {
    const current = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT id::text, status FROM sababuka.indicator_source_mappings WHERE id=$1`, [id]);
    if (!current.rows[0]) throw new ApiError(404, "NOT_FOUND", "Mapping sumber tidak ditemukan.");
    const next = action === "approve" ? "approved" : action === "activate" ? "active" : "retired";
    if (action === "approve" && current.rows[0].status !== "draft") throw new ApiError(409, "CONFLICT", "Mapping hanya dapat disetujui dari draf.");
    if (action === "activate" && !["approved", "active"].includes(current.rows[0].status as string)) throw new ApiError(409, "CONFLICT", "Mapping harus disetujui sebelum diaktifkan.");
    await this.db.query(`UPDATE sababuka.indicator_source_mappings SET status=$2, approved_by=CASE WHEN $2 IN ('approved','active') THEN $3 ELSE approved_by END, approved_at=CASE WHEN $2 IN ('approved','active') THEN now() ELSE approved_at END, updated_at=now() WHERE id=$1`, [id, next, auth.user.id]);
    await recordAudit(this.db, { ...audit, eventType: `connector.mapping_${action}d`, entityType: "indicator_source_mapping", entityId: id, afterData: { status: next } });
    return this.getMapping(id);
  }

  private async getMapping(id: string): Promise<MappingRow> {
    const result = await this.db.query<MappingRow>(`SELECT m.id::text, m.indicator_version_id::text, i.code AS indicator_code, i.name AS indicator_name,
      m.source_id::text, s.code AS source_code, s.source_type, m.external_dataset_id, m.external_resource_id, m.resource_url,
      m.geography_field, m.geography_code, m.year_field, m.value_field, m.unit_field, m.expected_unit, m.frequency,
      m.transform_json, m.source_priority, m.relation_type, m.status, m.dataset_version_id::text
      FROM sababuka.indicator_source_mappings m JOIN sababuka.indicator_versions iv ON iv.id=m.indicator_version_id
      JOIN sababuka.indicators i ON i.id=iv.indicator_id JOIN sababuka.data_sources s ON s.id=m.source_id WHERE m.id=$1`, [id]);
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Mapping sumber tidak ditemukan.");
    return result.rows[0];
  }

  async sync(auth: AuthContext, mappingId: string, audit: AuditContext) {
    const mapping = await this.getMapping(mappingId);
    if (!['approved', 'active'].includes(mapping.status)) throw new ApiError(409, "CONFLICT", "Mapping harus disetujui sebelum sinkronisasi.");
    const source = await this.source(mapping.source_code);
    if (source.source_type === "bps" && !(await this.resolveBpsSecret())) throw new ApiError(409, "CONNECTOR_WAITING_KEY", "API key BPS belum dikonfigurasi.");
    const resource = source.source_type === "ckan"
      ? await this.resolveCkanResource(source, mapping)
      : source.source_type === "bps"
        ? await this.resolveBpsResource(source, mapping)
        : (() => { throw new ApiError(409, "CONNECTOR_NOT_READY", "Jenis sumber belum didukung konektor."); })();
    const response = await fetchText(resource.url);
    const rows = resource.format.toLowerCase() === "json" ? this.parseJson(response.text) : resource.format.toLowerCase() === "csv" ? parseCsv(response.text) : (() => { throw new ApiError(400, "UNSUPPORTED_FORMAT", "Vertical slice hanya menerima CSV atau JSON terstruktur."); })();
    const run = await this.db.query<QueryResultRow & Record<string, unknown>>(`INSERT INTO sababuka.connector_runs (mapping_id, source_id, status, dry_run, source_url, source_identifier, response_checksum, fetched_at, created_by) VALUES ($1,$2,'fetched',true,$3,$4,$5,now(),$6) RETURNING id::text`, [mapping.id, source.id, resource.public_url, resource.id, response.checksum, auth.user.id]);
    const runId = run.rows[0]!.id as string;
    let valid = 0; let invalid = 0;
    for (const raw of rows) {
      const year = Number.parseInt(asText(raw[mapping.year_field]), 10);
      const geography = mapping.geography_field ? asText(raw[mapping.geography_field]) : mapping.geography_code;
      const rawValue = raw[mapping.value_field]; const numberValue = asNumber(rawValue);
      const errors: string[] = [];
      if (!YEARS.has(year)) errors.push("Tahun harus berada dalam rentang 2025-2029.");
      if (mapping.geography_field && geography !== mapping.geography_code) errors.push("Wilayah bukan Kabupaten Kapuas (6203).");
      if (numberValue === null && !asText(rawValue)) errors.push("Nilai kosong atau bukan angka.");
      const unit = mapping.unit_field ? asText(raw[mapping.unit_field]) : null;
      if (mapping.expected_unit && unit && unit !== mapping.expected_unit) errors.push("Satuan tidak sesuai mapping.");
      const rowChecksum = hash(JSON.stringify(raw)); const status = errors.length ? "invalid" : "valid";
      await this.db.query(`INSERT INTO sababuka.connector_staging_values (run_id,mapping_id,year,geography_code,numeric_value,text_value,unit_value,raw_data,row_checksum,validation_status,validation_errors,source_url,source_retrieved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,now()) ON CONFLICT (run_id,year,geography_code,row_checksum) DO NOTHING`, [runId, mapping.id, year, geography, numberValue, numberValue === null ? asText(rawValue) : null, unit, JSON.stringify(raw), rowChecksum, status, JSON.stringify(errors), resource.public_url]);
      if (errors.length) invalid += 1; else valid += 1;
    }
    const status = valid ? "ready" : "failed";
    await this.db.query(`UPDATE sababuka.connector_runs SET status=$2, preview_json=$3::jsonb, updated_at=now() WHERE id=$1`, [runId, status, JSON.stringify({ rows_seen: rows.length, valid_rows: valid, invalid_rows: invalid, years: [...new Set(rows.map((row) => Number.parseInt(asText(row[mapping.year_field]), 10)).filter((year) => YEARS.has(year)))].sort() })]);
    await recordAudit(this.db, { ...audit, eventType: "connector.sync_staged", entityType: "connector_run", entityId: runId, afterData: { status, valid_rows: valid, invalid_rows: invalid }, metadata: { mapping_id: mapping.id, source_url: resource.public_url, checksum: response.checksum } });
    return this.getRun(runId);
  }

  private parseJson(text: string): JsonObject[] {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value)) return value.filter((item): item is JsonObject => Boolean(item && typeof item === "object"));
    if (value && typeof value === "object" && Array.isArray((value as JsonObject).data)) return (value as JsonObject).data as JsonObject[];
    throw new ApiError(400, "SOURCE_INVALID", "JSON sumber harus berupa array baris atau objek dengan data[].");
  }

  private async resolveCkanResource(source: SourceRow, mapping: MappingRow) {
    if (mapping.resource_url) {
      this.assertResourceUrlAllowed(source, mapping.resource_url);
      return { id: mapping.external_resource_id ?? mapping.external_dataset_id, url: mapping.resource_url, public_url: mapping.resource_url, format: mapping.resource_url.toLowerCase().includes(".json") ? "json" : "csv" };
    }
    const url = `${source.base_url!.replace(/\/$/u, "")}/api/3/action/package_show?id=${encodeURIComponent(mapping.external_dataset_id)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new ApiError(502, "SOURCE_UNAVAILABLE", `CKAN mengembalikan HTTP ${response.status}.`);
    const payload = await response.json() as { success?: boolean; result?: { resources?: Array<{ id: string; url: string; format?: string }> } };
    const resource = payload.result?.resources?.find((item) => !mapping.external_resource_id || item.id === mapping.external_resource_id);
    if (!payload.success || !resource) throw new ApiError(404, "SOURCE_RESOURCE_NOT_FOUND", "Resource CKAN tidak ditemukan.");
    return { id: resource.id, url: resource.url, public_url: resource.url, format: resource.format ?? "" };
  }

  private async resolveBpsResource(source: SourceRow, mapping: MappingRow) {
    if (!mapping.resource_url) throw new ApiError(409, "CONNECTOR_NOT_READY", "Mapping BPS membutuhkan URL endpoint resource yang eksplisit.");
    this.assertResourceUrlAllowed(source, mapping.resource_url);
    const secret = await this.resolveBpsSecret();
    if (!secret) throw new ApiError(409, "CONNECTOR_WAITING_KEY", "API key BPS belum dikonfigurasi.");
    const url = new URL(mapping.resource_url);
    url.searchParams.set("key", secret.value);
    return { id: mapping.external_resource_id ?? mapping.external_dataset_id, url: url.toString(), public_url: mapping.resource_url, format: "json" };
  }

  private assertResourceUrlAllowed(source: SourceRow, raw: string): void {
    try {
      const base = new URL(source.base_url!); const target = new URL(raw);
      if (target.protocol !== "https:" || target.hostname !== base.hostname) throw new Error("host mismatch");
    } catch {
      throw new ApiError(400, "SOURCE_INVALID", "URL resource harus HTTPS dan berasal dari host sumber yang terdaftar.");
    }
  }

  async getRun(id: string) {
    const run = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT r.id::text, r.mapping_id::text, r.status, r.dry_run, r.source_url, r.source_identifier, r.response_checksum, r.fetched_at::text, r.preview_json, r.error_text, r.imported_batch_id::text, r.created_at::text FROM sababuka.connector_runs r WHERE r.id=$1`, [id]);
    if (!run.rows[0]) throw new ApiError(404, "NOT_FOUND", "Riwayat sinkronisasi tidak ditemukan.");
    const values = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT id::text, year, geography_code, numeric_value, text_value, unit_value, validation_status, validation_errors, raw_data, source_url, source_retrieved_at::text FROM sababuka.connector_staging_values WHERE run_id=$1 ORDER BY year, id`, [id]);
    return { ...run.rows[0], values: values.rows };
  }

  async importRun(auth: AuthContext, runId: string, audit: AuditContext) {
    const run = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT r.id::text, r.status, r.mapping_id::text, r.source_url, r.response_checksum, m.dataset_version_id::text, m.indicator_version_id::text, m.source_id::text, m.external_dataset_id, m.external_resource_id, m.status AS mapping_status, s.name AS source_name, i.owner_organization_id::text AS organization_id FROM sababuka.connector_runs r JOIN sababuka.indicator_source_mappings m ON m.id=r.mapping_id JOIN sababuka.data_sources s ON s.id=m.source_id JOIN sababuka.indicator_versions iv ON iv.id=m.indicator_version_id JOIN sababuka.indicators i ON i.id=iv.indicator_id WHERE r.id=$1`, [runId]);
    const row = run.rows[0]; if (!row) throw new ApiError(404, "NOT_FOUND", "Riwayat sinkronisasi tidak ditemukan.");
    if (row.status !== "ready" || !["approved", "active"].includes(row.mapping_status as string)) throw new ApiError(409, "CONFLICT", "Preview belum siap diimpor atau mapping belum disetujui.");
    const staging = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT year, geography_code, numeric_value, text_value, unit_value, source_url, source_retrieved_at::text FROM sababuka.connector_staging_values WHERE run_id=$1 AND validation_status='valid' ORDER BY year`, [runId]);
    if (!staging.rows.length) throw new ApiError(409, "CONFLICT", "Tidak ada baris valid untuk diimpor.");
    const datasetVersionId = row.dataset_version_id as string ?? await this.ensureDatasetVersion(row, auth.user.id);
    if (!row.dataset_version_id) await this.db.query(`UPDATE sababuka.indicator_source_mappings SET dataset_version_id=$2, updated_at=now() WHERE id=$1`, [row.mapping_id, datasetVersionId]);
    const geographyIds = new Map<string, string>();
    for (const item of staging.rows) {
      const code = String(item.geography_code);
      if (!geographyIds.has(code)) {
        const geography = await this.db.query<{ id: string }>(`SELECT id::text FROM sababuka.geographies WHERE code=$1 AND is_active=true`, [code]);
        if (!geography.rows[0]) throw new ApiError(400, "VALIDATION_ERROR", `Wilayah ${code} belum terdaftar di master geografi.`);
        geographyIds.set(code, geography.rows[0].id);
      }
    }
    let firstBatch: string | null = null;
    for (const year of [...new Set(staging.rows.map((item) => Number(item.year)))]) {
      const period = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT id::text FROM sababuka.periods WHERE code=$1`, [String(year)]);
      if (!period.rows[0]) throw new ApiError(400, "VALIDATION_ERROR", `Periode ${year} belum tersedia.`);
      const existing = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT id::text FROM sababuka.data_batches WHERE source_metadata->>'connector_run_id'=$1 AND reporting_period_id=$2`, [runId, period.rows[0].id]);
      let batchId = existing.rows[0]?.id as string | undefined;
      if (!batchId) {
        const batch = await this.db.query<QueryResultRow & Record<string, unknown>>(`INSERT INTO sababuka.data_batches (dataset_version_id,organization_id,reporting_period_id,submission_method,source_metadata,row_count,status,submitted_by,submitted_at,approved_by,approved_at,created_by) VALUES ($1,$2,$3,'api_import',$4::jsonb,0,'approved',$5,now(),$5,now(),$5) RETURNING id::text`, [datasetVersionId, row.organization_id, period.rows[0].id, JSON.stringify({ connector_run_id: runId, mapping_id: row.mapping_id, source_url: row.source_url, response_checksum: row.response_checksum, source_system: row.source_id }), auth.user.id]);
        batchId = batch.rows[0]!.id as string;
      }
      if (!firstBatch) firstBatch = batchId;
      const values = staging.rows.filter((item) => Number(item.year) === year);
      for (const item of values) await this.db.query(`INSERT INTO sababuka.observations (batch_id,indicator_version_id,period_id,geography_id,numeric_value,text_value,quality_status,created_by,source_name,source_url,source_status,source_retrieved_at) VALUES ($1,$2,$3,$4,$5,$6,'valid',$7,$8,$9,'verified_direct',$10) ON CONFLICT (batch_id,indicator_version_id,period_id,geography_id,dimension_hash) DO NOTHING`, [batchId, row.indicator_version_id, period.rows[0].id, geographyIds.get(String(item.geography_code)), item.numeric_value ?? null, item.text_value ?? null, auth.user.id, row.source_name, item.source_url, item.source_retrieved_at]);
      await this.db.query(`UPDATE sababuka.data_batches SET row_count=(SELECT count(*) FROM sababuka.observations WHERE batch_id=$1), updated_at=now() WHERE id=$1`, [batchId]);
    }
    await this.db.query(`UPDATE sababuka.connector_runs SET status='imported', dry_run=false, approved_by=$2, approved_at=now(), imported_batch_id=$3, updated_at=now() WHERE id=$1`, [runId, auth.user.id, firstBatch]);
    await recordAudit(this.db, { ...audit, eventType: "connector.import_approved", entityType: "connector_run", entityId: runId, afterData: { imported_batch_id: firstBatch, status: "imported" }, metadata: { mapping_id: row.mapping_id } });
    return this.getRun(runId);
  }

  private async ensureDatasetVersion(row: QueryResultRow & Record<string, unknown>, actorId: string): Promise<string> {
    const source = await this.db.query<SourceRow>(`SELECT id::text, code, name, source_type, base_url, connection_config, credential_reference, last_checked_at::text FROM sababuka.data_sources WHERE id=$1`, [row.source_id]);
    const sourceCode = source.rows[0]!.code; const datasetCode = `EXT.${sourceCode}.${String(row.external_dataset_id).replace(/[^A-Za-z0-9_-]/gu, "_").slice(0, 45)}`.toUpperCase();
    const owner = await this.db.query<{ id: string }>(`SELECT id::text FROM sababuka.organizations WHERE code='KAPUAS'`); const profile = await this.db.query<{ id: string }>(`SELECT id::text FROM sababuka.metadata_profiles WHERE code='CONNECTOR_TABULAR_ANNUAL' AND version_number=1`);
    if (!owner.rows[0] || !profile.rows[0]) throw new ApiError(500, "CONFIGURATION_ERROR", "Profil metadata connector belum tersedia.");
    const dataset = await this.db.query<{ id: string }>(`INSERT INTO sababuka.datasets (code,title,owner_organization_id,source_id,created_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, source_id=EXCLUDED.source_id, updated_at=now() RETURNING id::text`, [datasetCode, `Dataset eksternal ${row.external_dataset_id}`, owner.rows[0]!.id, source.rows[0]!.id, actorId]);
    const version = await this.db.query<{ id: string }>(`INSERT INTO sababuka.dataset_versions (dataset_id,version_number,name,title,organization_id,metadata_profile_id,effective_from,status,approved_by,approved_at,created_by,ckan_package_id) VALUES ($1,1,$2,$3,$4,$5,DATE '2025-01-01','active',$6,now(),$6,$7) ON CONFLICT (dataset_id,version_number) DO UPDATE SET status='active', approved_by=EXCLUDED.approved_by, approved_at=now(), updated_at=now() RETURNING id::text`, [dataset.rows[0]!.id, datasetCode, `Dataset eksternal ${row.external_dataset_id}`, owner.rows[0]!.id, profile.rows[0]!.id, actorId, row.external_dataset_id]);
    return version.rows[0]!.id;
  }
}
