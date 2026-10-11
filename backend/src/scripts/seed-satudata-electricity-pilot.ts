import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";
import { ConnectorService } from "../services/connector-service.js";
import type { AuthContext } from "../types/auth.js";

const CONFIRMATION = "SATUDATA_ELECTRICITY_MANTANGAI";
if (process.env.CONFIRM_OFFICIAL_PILOT !== CONFIRMATION) {
  throw new Error(`Set CONFIRM_OFFICIAL_PILOT=${CONFIRMATION} untuk menjalankan impor resmi ini.`);
}

const DATASET_ID = "602c41bc-6a75-4d21-9c8c-8d062051c02d";
const RESOURCE_ID = "4b0baa6f-41f3-424f-aec6-2714f077d099";
const RESOURCE_URL = "https://satudata.kapuaskab.go.id/dataset/602c41bc-6a75-4d21-9c8c-8d062051c02d/resource/4b0baa6f-41f3-424f-aec6-2714f077d099/download/001.-data-rumah-tangga-berlistrik-non-pln-dan-rumah-tangga-belum-berlistrik-kec.-mantangai.xlsx";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);

async function actorFor(roleCodes: string[], fallbackEmail?: string) {
  const result = await db.query<{ id: string; email: string; full_name: string; role_code: string }>(
    `SELECT u.id::text, u.email, u.full_name, r.code AS role_code
     FROM sababuka.users u
     JOIN sababuka.user_role_assignments ura ON ura.user_id=u.id AND ura.starts_at<=now() AND (ura.ends_at IS NULL OR ura.ends_at>now())
     JOIN sababuka.roles r ON r.id=ura.role_id
     WHERE u.status='active' AND (r.code=ANY($1::text[]) OR ($2::text IS NOT NULL AND u.email=$2))
     ORDER BY array_position($1::text[],r.code) NULLS LAST, u.email LIMIT 1`,
    [roleCodes, fallbackEmail ?? null],
  );
  if (!result.rows[0]) throw new Error(`Akun aktif untuk ${roleCodes.join("/")} tidak tersedia.`);
  return result.rows[0];
}

try {
  const creator = await actorFor(["superadmin", "developer"], "developer@sababuka.com");
  const bapperida = await actorFor(["bapperida"], "bapperida@sababuka.com");
  const walidata = await actorFor(["walidata", "kominfo_walidata", "superadmin"], "developer@sababuka.com");
  const requestId = randomUUID();

  const category = await db.query<{ id: string }>(
    `INSERT INTO sababuka.categories
       (code,name,description,display_order,is_active,created_by,review_status,submitted_by,submitted_at,decided_by,decided_at,decision_notes)
     VALUES ('SATUDATA_LAYANAN_DASAR','Layanan Dasar — Data Operasional',
       'Indikator operasional dari portal Satu Data. Kategori ini terpisah dari 29 kategori RPJMD.',900,true,$1,'approved',$1,now(),$2,now(),
       'Pilot sumber resmi untuk membuktikan alur integrasi, pemeriksaan Walidata, publikasi, dan analisis pimpinan.')
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,is_active=true,
       review_status='approved',decided_by=EXCLUDED.decided_by,decided_at=now(),decision_notes=EXCLUDED.decision_notes,updated_at=now()
     RETURNING id::text`, [creator.id, bapperida.id]);
  const owner = await db.query<{ id: string }>("SELECT id::text FROM sababuka.organizations WHERE code='KEC_MANTANGAI'");
  const unit = await db.query<{ id: string }>("SELECT id::text FROM sababuka.units WHERE code='PERCENT'");
  if (!owner.rows[0] || !unit.rows[0]) throw new Error("Master Kecamatan Mantangai atau satuan persen belum tersedia.");

  const indicator = await db.query<{ id: string }>(
    `INSERT INTO sababuka.indicators (code,name,category_id,owner_organization_id,is_active,created_by)
     VALUES ('SATUDATA_RASIO_ELEKTRIFIKASI_MANTANGAI','Rasio Elektrifikasi Kecamatan Mantangai',$1,$2,true,$3)
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,category_id=EXCLUDED.category_id,
       owner_organization_id=EXCLUDED.owner_organization_id,is_active=true,updated_at=now()
     RETURNING id::text`, [category.rows[0]!.id, owner.rows[0].id, creator.id]);
  const version = await db.query<{ id: string }>(
    `INSERT INTO sababuka.indicator_versions
       (indicator_id,version_number,definition,formula,unit_id,frequency,data_type,dimension_schema,direction,source_reference,
        access_level,effective_from,status,change_notes,submitted_by,submitted_at,bapperida_reviewed_by,bapperida_reviewed_at,
        approved_by,approved_at,created_by)
     VALUES ($1,1,
       'Persentase rumah tangga berlistrik PLN dan non-PLN terhadap jumlah rumah tangga yang dicatat Kecamatan Mantangai.',
       '((Rumah tangga berlistrik PLN + rumah tangga berlistrik non-PLN) / jumlah rumah tangga) × 100',$2,'annual','percentage',
       '{"geography_level":"district","operational_source":"Satu Data Kabupaten Kapuas","rpjmd_indicator":false}'::jsonb,
       'increase','Satu Data Kabupaten Kapuas — Data Rasio Kelistrikan Triwulan I Tahun 2026','public',DATE '2026-01-01','active',
       'Indikator operasional resmi; terpisah dari katalog indikator RPJMD. Nilai sumber masih memerlukan rekonsiliasi aritmetika.',$3,now(),$4,now(),$4,now(),$3)
     ON CONFLICT (indicator_id,version_number) DO UPDATE SET definition=EXCLUDED.definition,formula=EXCLUDED.formula,
       unit_id=EXCLUDED.unit_id,dimension_schema=EXCLUDED.dimension_schema,direction=EXCLUDED.direction,
       source_reference=EXCLUDED.source_reference,access_level='public',status='active',approved_by=EXCLUDED.approved_by,
       approved_at=now(),change_notes=EXCLUDED.change_notes,updated_at=now()
     RETURNING id::text`, [indicator.rows[0]!.id, unit.rows[0].id, creator.id, bapperida.id]);

  await db.query(
    `INSERT INTO sababuka.indicator_organizations (indicator_version_id,organization_id,responsibility,is_primary)
     VALUES ($1,$2,'primary_producer',true)
     ON CONFLICT (indicator_version_id,organization_id,responsibility) DO UPDATE SET is_primary=true`,
    [version.rows[0]!.id, owner.rows[0].id],
  );
  const supportingOrganizations = await db.query<{ id: string; code: string }>("SELECT id::text,code FROM sababuka.organizations WHERE code IN ('DISKOMINFOSANTIK','BAPPERIDA')");
  for (const organization of supportingOrganizations.rows) await db.query(
    `INSERT INTO sababuka.indicator_organizations (indicator_version_id,organization_id,responsibility,is_primary)
     VALUES ($1,$2,$3,false) ON CONFLICT DO NOTHING`,
    [version.rows[0]!.id, organization.id, organization.code === "DISKOMINFOSANTIK" ? "validator" : "curator"],
  );

  const source = await db.query<{ id: string }>("SELECT id::text FROM sababuka.data_sources WHERE code='SATUDATA_KAPUAS'");
  if (!source.rows[0]) throw new Error("Sumber SATUDATA_KAPUAS belum tersedia.");
  await db.query(
    `INSERT INTO sababuka.metadata_profiles
       (code,name,version_number,description,schema_json,mapping_json,status,created_by,approved_by,approved_at)
     VALUES ('CONNECTOR_TABULAR_ANNUAL','Connector tabel tahunan',1,
       'Profil internal untuk data tahunan dari konektor eksternal.',
       '{"year":"integer","geography":"string","value":"number|string","unit":"string"}'::jsonb,
       '{"frequency":"annual","allowed_years":[2025,2026,2027,2028,2029]}'::jsonb,
       'active',$1,$1,now())
     ON CONFLICT (code,version_number) DO UPDATE SET status='active',approved_by=EXCLUDED.approved_by,
       approved_at=now(),schema_json=EXCLUDED.schema_json,mapping_json=EXCLUDED.mapping_json,updated_at=now()`,
    [creator.id],
  );
  const transform = {
    mode: "ratio_percent_total_row", sheet_name: "DATA 02", label_column: 1, total_label: "JUMLAH",
    denominator_column: 3, numerator_columns: [5, 6], static_year: 2026, decimal_places: 2,
    quality_checks: [{ type: "sum_equals", total_column: 3, component_columns: [4, 5], tolerance: 0,
      message: "Total rumah tangga 9.318 berbeda dengan rumah tangga belum berlistrik PLN + berlistrik PLN (9.412)." }],
  };
  const mapping = await db.query<{ id: string }>(
    `INSERT INTO sababuka.indicator_source_mappings
       (indicator_version_id,source_id,external_dataset_id,external_resource_id,resource_url,geography_code,year_field,value_field,
        unit_field,expected_unit,transform_json,relation_type,effective_from,status,created_by,approved_by,approved_at)
     VALUES ($1,$2,$3,$4,$5,'KEC_MANTANGAI','tahun','nilai','satuan','%',$6::jsonb,'primary',DATE '2026-01-01','active',$7,$8,now())
     ON CONFLICT (indicator_version_id,source_id,external_dataset_id,(COALESCE(external_resource_id,'')),effective_from)
     DO UPDATE SET resource_url=EXCLUDED.resource_url,geography_code=EXCLUDED.geography_code,year_field=EXCLUDED.year_field,
       value_field=EXCLUDED.value_field,unit_field=EXCLUDED.unit_field,expected_unit=EXCLUDED.expected_unit,
       transform_json=EXCLUDED.transform_json,status='active',approved_by=EXCLUDED.approved_by,approved_at=now(),updated_at=now()
     RETURNING id::text`, [version.rows[0]!.id, source.rows[0].id, DATASET_ID, RESOURCE_ID, RESOURCE_URL, JSON.stringify(transform), creator.id, walidata.id]);

  const auth: AuthContext = { sessionId: "official-pilot", csrfTokenHash: Buffer.alloc(0), user: {
    id: walidata.id, email: walidata.email, full_name: walidata.full_name, mfa_required: false, must_change_password: false,
    roles: [{ code: walidata.role_code, scope_type: "global", organization_id: null }], permissions: [], organizations: [],
  } };
  const connector = new ConnectorService(db, config);
  const run = await connector.sync(auth, mapping.rows[0]!.id, { actorId: walidata.id, requestId, ipAddress: null, userAgent: "SABABUKA official Satu Data pilot" }) as unknown as { id: string; status: string; preview_json: Record<string, unknown> };
  if (run.status !== "ready") throw new Error(`Preview konektor tidak siap: ${JSON.stringify(run.preview_json)}`);
  const imported = await connector.importRun(auth, run.id, { actorId: walidata.id, requestId, ipAddress: null, userAgent: "SABABUKA official Satu Data pilot" }) as unknown as { imported_batch_id: string };
  const observations = await db.query<{ id: string; dataset_version_id: string }>(
    `SELECT obs.id::text, b.dataset_version_id::text FROM sababuka.observations obs
     JOIN sababuka.data_batches b ON b.id=obs.batch_id
     WHERE b.id=$1 AND obs.indicator_version_id=$2`, [imported.imported_batch_id, version.rows[0]!.id]);
  if (!observations.rows[0]) throw new Error("Observasi hasil impor tidak ditemukan.");

  const previous = await db.query<{ id: string; version_number: number; status: string }>(
    `SELECT id::text,version_number,status FROM sababuka.publications WHERE publication_key='SATUDATA_OPERASIONAL_MANTANGAI' ORDER BY version_number DESC LIMIT 1`);
  const nextVersion = (previous.rows[0]?.version_number ?? 0) + 1;
  const publication = await db.query<{ id: string }>(
    `INSERT INTO sababuka.publications
       (publication_key,version_number,publication_number,title,description,status,effective_at,change_notes,created_by,activated_by,activated_at)
     VALUES ('SATUDATA_OPERASIONAL_MANTANGAI',$1::integer,'SATUDATA-MANTANGAI-'||lpad(($1::integer)::text,3,'0'),
       'Rasio Elektrifikasi Kecamatan Mantangai — Triwulan I 2026',
       'Pilot resmi alur Satu Data ke SABABUKA. Nilai ditampilkan dengan penanda rekonsiliasi karena total pada file sumber belum konsisten.','draft',now(),
       'Dihitung otomatis dari lembar DATA 02; sumber asli, checksum, dan hasil validasi dipertahankan.',$2,NULL,NULL) RETURNING id::text`,
    [nextVersion, creator.id]);
  await db.query(
    `INSERT INTO sababuka.publication_items (publication_id,observation_id,dataset_version_id,display_order) VALUES ($1,$2,$3,1)`,
    [publication.rows[0]!.id, observations.rows[0].id, observations.rows[0].dataset_version_id]);
  if (previous.rows[0]?.status === "active") await db.query(
    "UPDATE sababuka.publications SET status='replaced',replaced_by_id=$2,updated_at=now() WHERE id=$1",
    [previous.rows[0].id, publication.rows[0]!.id]);
  await db.query(
    "UPDATE sababuka.publications SET status='active',activated_by=$2,activated_at=now(),updated_at=now() WHERE id=$1",
    [publication.rows[0]!.id, bapperida.id]);
  await db.query(
    `INSERT INTO sababuka.workflow_actions (entity_type,entity_id,action,from_status,to_status,actor_id,actor_role_code,notes,request_id)
     VALUES ('publication',$1,'activate','draft','active',$2,'bapperida',
       'Pilot resmi diterbitkan dengan peringatan rekonsiliasi; bukan indikator RPJMD.',$3)`,
    [publication.rows[0]!.id, bapperida.id, requestId]);
  await db.query(
    `INSERT INTO sababuka.audit_events (actor_id,event_type,entity_type,entity_id,metadata,request_id)
     VALUES ($1,'official.satudata_electricity_pilot_published','publication',$2,$3::jsonb,$4)`,
    [bapperida.id, publication.rows[0]!.id, JSON.stringify({ dataset_id: DATASET_ID, resource_id: RESOURCE_ID, connector_run_id: run.id, indicator_code: "SATUDATA_RASIO_ELEKTRIFIKASI_MANTANGAI", rpmd_indicator: false }), requestId]);

  console.log(JSON.stringify({ indicator: "SATUDATA_RASIO_ELEKTRIFIKASI_MANTANGAI", mapping_id: mapping.rows[0]!.id,
    run_id: run.id, preview: run.preview_json, publication_id: publication.rows[0]!.id }, null, 2));
} finally {
  await db.end();
}
