import { createHash } from "node:crypto";
import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

interface SourceRow extends QueryResultRow { id: string; code: string; name: string; source_type: string; base_url: string | null; connection_config: Record<string, unknown>; credential_reference: string | null; last_checked_at: string | null }
interface MappingRow extends QueryResultRow { id: string; indicator_version_id: string; indicator_code: string; indicator_name: string; source_id: string; source_code: string; source_type: string; external_dataset_id: string; external_resource_id: string | null; resource_url: string | null; geography_field: string | null; geography_code: string; year_field: string; value_field: string; unit_field: string | null; expected_unit: string | null; frequency: string; transform_json: Record<string, unknown>; source_priority: number; relation_type: string; status: string; dataset_version_id: string | null }
type JsonObject = Record<string, unknown>;

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
  constructor(private readonly db: Database) {}

  async listSources() {
    const result = await this.db.query<SourceRow>(`SELECT id::text, code, name, source_type, base_url, connection_config, credential_reference, last_checked_at::text FROM sababuka.data_sources WHERE code IN ('SATUDATA_KAPUAS','BPS_KAPUAS') ORDER BY code`);
    const rows = await Promise.all(result.rows.map(async (source) => {
      if (source.source_type === "bps" && !process.env.BPS_API_KEY) return { ...source, status: "waiting_api_key" };
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

  private async bpsStatus(source: SourceRow) {
    const key = process.env.BPS_API_KEY;
    if (!key) throw new ApiError(409, "CONNECTOR_WAITING_KEY", "BPS_API_KEY belum diatur.");
    const domain = asText(source.connection_config.domain_code) || "6203";
    const url = `${source.base_url!.replace(/\/$/u, "")}/domain/type/adminkab/${encodeURIComponent(domain)}?key=${encodeURIComponent(key)}`;
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
    const indicator = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT iv.id::text, iv.frequency, iv.data_type, iv.unit_id::text, i.code, i.owner_organization_id::text FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id=iv.indicator_id WHERE iv.id=$1`, [input.indicator_version_id]);
    if (!indicator.rows[0]) throw new ApiError(404, "NOT_FOUND", "Versi indikator tidak ditemukan.");
    if (indicator.rows[0].frequency !== "annual") throw new ApiError(400, "VALIDATION_ERROR", "Konektor ini hanya menerima indikator tahunan.");
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
    if (source.source_type === "bps" && !process.env.BPS_API_KEY) throw new ApiError(409, "CONNECTOR_WAITING_KEY", "BPS_API_KEY belum diatur. Status konektor: Menunggu API key.");
    const resource = source.source_type === "ckan"
      ? await this.resolveCkanResource(source, mapping)
      : source.source_type === "bps"
        ? await this.resolveBpsResource(source, mapping)
        : (() => { throw new ApiError(409, "CONNECTOR_NOT_READY", "Jenis sumber belum didukung konektor."); })();
    const response = await fetchText(resource.url);
    const rows = resource.format.toLowerCase() === "json" ? this.parseJson(response.text) : resource.format.toLowerCase() === "csv" ? parseCsv(response.text) : (() => { throw new ApiError(400, "UNSUPPORTED_FORMAT", "Vertical slice hanya menerima CSV atau JSON terstruktur."); })();
    const run = await this.db.query<QueryResultRow & Record<string, unknown>>(`INSERT INTO sababuka.connector_runs (mapping_id, source_id, status, dry_run, source_url, source_identifier, response_checksum, fetched_at, created_by) VALUES ($1,$2,'fetched',true,$3,$4,$5,now(),$6) RETURNING id::text`, [mapping.id, source.id, resource.url, resource.id, response.checksum, auth.user.id]);
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
      await this.db.query(`INSERT INTO sababuka.connector_staging_values (run_id,mapping_id,year,geography_code,numeric_value,text_value,unit_value,raw_data,row_checksum,validation_status,validation_errors,source_url,source_retrieved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,now()) ON CONFLICT (run_id,year,geography_code,row_checksum) DO NOTHING`, [runId, mapping.id, year, geography, numberValue, numberValue === null ? asText(rawValue) : null, unit, JSON.stringify(raw), rowChecksum, status, JSON.stringify(errors), resource.url]);
      if (errors.length) invalid += 1; else valid += 1;
    }
    const status = valid ? "ready" : "failed";
    await this.db.query(`UPDATE sababuka.connector_runs SET status=$2, preview_json=$3::jsonb, updated_at=now() WHERE id=$1`, [runId, status, JSON.stringify({ rows_seen: rows.length, valid_rows: valid, invalid_rows: invalid, years: [...new Set(rows.map((row) => Number.parseInt(asText(row[mapping.year_field]), 10)).filter((year) => YEARS.has(year)))].sort() })]);
    await recordAudit(this.db, { ...audit, eventType: "connector.sync_staged", entityType: "connector_run", entityId: runId, afterData: { status, valid_rows: valid, invalid_rows: invalid }, metadata: { mapping_id: mapping.id, source_url: resource.url, checksum: response.checksum } });
    return this.getRun(runId);
  }

  private parseJson(text: string): JsonObject[] {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value)) return value.filter((item): item is JsonObject => Boolean(item && typeof item === "object"));
    if (value && typeof value === "object" && Array.isArray((value as JsonObject).data)) return (value as JsonObject).data as JsonObject[];
    throw new ApiError(400, "SOURCE_INVALID", "JSON sumber harus berupa array baris atau objek dengan data[].");
  }

  private async resolveCkanResource(source: SourceRow, mapping: MappingRow) {
    if (mapping.resource_url) return { id: mapping.external_resource_id ?? mapping.external_dataset_id, url: mapping.resource_url, format: mapping.resource_url.toLowerCase().includes(".json") ? "json" : "csv" };
    const url = `${source.base_url!.replace(/\/$/u, "")}/api/3/action/package_show?id=${encodeURIComponent(mapping.external_dataset_id)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new ApiError(502, "SOURCE_UNAVAILABLE", `CKAN mengembalikan HTTP ${response.status}.`);
    const payload = await response.json() as { success?: boolean; result?: { resources?: Array<{ id: string; url: string; format?: string }> } };
    const resource = payload.result?.resources?.find((item) => !mapping.external_resource_id || item.id === mapping.external_resource_id);
    if (!payload.success || !resource) throw new ApiError(404, "SOURCE_RESOURCE_NOT_FOUND", "Resource CKAN tidak ditemukan.");
    return { id: resource.id, url: resource.url, format: resource.format ?? "" };
  }

  private async resolveBpsResource(source: SourceRow, mapping: MappingRow) {
    if (!mapping.resource_url) throw new ApiError(409, "CONNECTOR_NOT_READY", "Mapping BPS membutuhkan URL endpoint resource yang eksplisit.");
    const url = new URL(mapping.resource_url);
    url.searchParams.set("key", process.env.BPS_API_KEY!);
    return { id: mapping.external_resource_id ?? mapping.external_dataset_id, url: url.toString(), format: "json" };
  }

  async getRun(id: string) {
    const run = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT r.id::text, r.mapping_id::text, r.status, r.dry_run, r.source_url, r.source_identifier, r.response_checksum, r.fetched_at::text, r.preview_json, r.error_text, r.imported_batch_id::text, r.created_at::text FROM sababuka.connector_runs r WHERE r.id=$1`, [id]);
    if (!run.rows[0]) throw new ApiError(404, "NOT_FOUND", "Riwayat sinkronisasi tidak ditemukan.");
    const values = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT id::text, year, geography_code, numeric_value, text_value, unit_value, validation_status, validation_errors, raw_data, source_url, source_retrieved_at::text FROM sababuka.connector_staging_values WHERE run_id=$1 ORDER BY year, id`, [id]);
    return { ...run.rows[0], values: values.rows };
  }

  async importRun(auth: AuthContext, runId: string, audit: AuditContext) {
    const run = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT r.id::text, r.status, r.mapping_id::text, r.source_url, r.response_checksum, m.dataset_version_id::text, m.indicator_version_id::text, m.source_id::text, m.external_dataset_id, m.external_resource_id, m.status AS mapping_status, i.owner_organization_id::text AS organization_id FROM sababuka.connector_runs r JOIN sababuka.indicator_source_mappings m ON m.id=r.mapping_id JOIN sababuka.indicator_versions iv ON iv.id=m.indicator_version_id JOIN sababuka.indicators i ON i.id=iv.indicator_id WHERE r.id=$1`, [runId]);
    const row = run.rows[0]; if (!row) throw new ApiError(404, "NOT_FOUND", "Riwayat sinkronisasi tidak ditemukan.");
    if (row.status !== "ready" || !["approved", "active"].includes(row.mapping_status as string)) throw new ApiError(409, "CONFLICT", "Preview belum siap diimpor atau mapping belum disetujui.");
    const staging = await this.db.query<QueryResultRow & Record<string, unknown>>(`SELECT year, geography_code, numeric_value, text_value, unit_value, source_url, source_retrieved_at::text FROM sababuka.connector_staging_values WHERE run_id=$1 AND validation_status='valid' ORDER BY year`, [runId]);
    if (!staging.rows.length) throw new ApiError(409, "CONFLICT", "Tidak ada baris valid untuk diimpor.");
    const datasetVersionId = row.dataset_version_id as string ?? await this.ensureDatasetVersion(row, auth.user.id);
    if (!row.dataset_version_id) await this.db.query(`UPDATE sababuka.indicator_source_mappings SET dataset_version_id=$2, updated_at=now() WHERE id=$1`, [row.mapping_id, datasetVersionId]);
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
      for (const item of values) await this.db.query(`INSERT INTO sababuka.observations (batch_id,indicator_version_id,period_id,numeric_value,text_value,quality_status,created_by,source_name,source_url,source_status,source_retrieved_at) VALUES ($1,$2,$3,$4,$5,'valid',$6,'Satu Data Kapuas',$7,'verified_direct',$8) ON CONFLICT (batch_id,indicator_version_id,period_id,geography_id,dimension_hash) DO NOTHING`, [batchId, row.indicator_version_id, period.rows[0].id, item.numeric_value ?? null, item.text_value ?? null, auth.user.id, item.source_url, item.source_retrieved_at]);
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
