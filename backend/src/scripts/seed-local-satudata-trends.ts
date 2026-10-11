import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";
import { parseCsv } from "../services/connector-service.js";

if (process.env.NODE_ENV !== "development" || process.env.CONFIRM_LOCAL_SATUDATA_TRENDS !== "LOCAL_ONLY") {
  throw new Error("Impor ini hanya boleh dijalankan lokal dengan NODE_ENV=development dan CONFIRM_LOCAL_SATUDATA_TRENDS=LOCAL_ONLY.");
}

const PDF_URL = "https://satudata.kapuaskab.go.id/data2025/kabupatenkapuasdalamangka2025.pdf";
const DISABILITY_CSV_URL = "https://satudata.kapuaskab.go.id/dataset/a063b18b-4fd1-4218-bc63-97704c998fa5/resource/de48862d-3d5b-4fcd-9b83-46f44ccc0bc3/download/rekapitulasi-penyandang-disabilitas-yang-terlayani-di-kabupaten-kapuas-tahun-2021-2023.csv";
const pdfPath = process.env.SATUDATA_KAPUAS_PDF_PATH;
const csvPath = process.env.SATUDATA_DISABILITY_CSV_PATH;
if (!pdfPath || !csvPath) throw new Error("SATUDATA_KAPUAS_PDF_PATH dan SATUDATA_DISABILITY_CSV_PATH wajib diisi.");

const pdfBytes = await readFile(pdfPath);
const csvBytes = await readFile(csvPath);
const pdfChecksum = createHash("sha256").update(pdfBytes).digest("hex");
const csvChecksum = createHash("sha256").update(csvBytes).digest("hex");
const disabilityRows = parseCsv(csvBytes.toString("utf8"));

type Series = {
  code: string; name: string; categoryCode: string; categoryName: string; ownerCode: string;
  unitCode: "PERCENT" | "NUMBER"; frequency: "annual" | "monthly"; direction: "increase" | "decrease";
  definition: string; datasetCode: string; datasetTitle: string; packageId: string; resourceUrl: string;
  sourceFile: string; checksum: string; sourceTable: string; sourcePage: number | null;
  values: Array<{ code: string; label: string; startsOn: string; endsOn: string; value: number }>;
};

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const inflation = [4.70, 2.90, 3.35, 3.00, 2.10, 1.99, 0.49, 0.51, 1.24, 0.90, 0.84, 1.08];
const disabilityValues = disabilityRows.map((row) => ({
  code: String(row.Tahun), label: `Tahun ${row.Tahun}`, startsOn: `${row.Tahun}-01-01`, endsOn: `${row.Tahun}-12-31`,
  value: Number(row["Jumlah Penyandang Disabilitas"]),
}));

const series: Series[] = [
  {
    code: "SATUDATA_PERSENTASE_PENDUDUK_MISKIN", name: "Persentase Penduduk Miskin Kabupaten Kapuas",
    categoryCode: "ANALISIS_KESEJAHTERAAN", categoryName: "Kesejahteraan dan Perlindungan Sosial", ownerCode: "BAPPERIDA",
    unitCode: "PERCENT", frequency: "annual", direction: "decrease",
    definition: "Persentase penduduk Kabupaten Kapuas yang berada di bawah garis kemiskinan menurut Susenas Maret.",
    datasetCode: "SATUDATA.KAPUAS.KEMISKINAN.2016_2024", datasetTitle: "Garis Kemiskinan, Jumlah, dan Persentase Penduduk Miskin 2016-2024",
    packageId: "tabel-2025-4-4-1-garis-kemiskinan-jumlah-dan-persentase-penduduk-miskin-di-kabupaten-kapuas-2016",
    resourceUrl: `${PDF_URL}#page=215`, sourceFile: "kabupatenkapuasdalamangka2025.pdf", checksum: pdfChecksum, sourceTable: "4.4.1", sourcePage: 173,
    values: ([[2020, 5.04], [2021, 5.35], [2022, 5.52], [2023, 5.21], [2024, 5.25]] as Array<[number, number]>).map(([year, value]) => ({ code: String(year), label: `Tahun ${year}`, startsOn: `${year}-01-01`, endsOn: `${year}-12-31`, value })),
  },
  {
    code: "SATUDATA_INFLASI_UMUM_BULANAN", name: "Laju Inflasi Umum Bulanan Kabupaten Kapuas",
    categoryCode: "ANALISIS_HARGA_DAERAH", categoryName: "Harga, Inflasi, dan Daya Beli", ownerCode: "DISPERINDAGKOPUKM",
    unitCode: "PERCENT", frequency: "monthly", direction: "decrease",
    definition: "Laju inflasi umum bulanan Kabupaten Kapuas yang disajikan secara year-on-year (yoy).",
    datasetCode: "SATUDATA.KAPUAS.INFLASI_BULANAN.2024", datasetTitle: "Laju Inflasi Bulanan Menurut Kelompok Pengeluaran 2024",
    packageId: "tabel-2025-9-3-2-laju-inflasi-bulanan-menurut-kelompok-pengeluaran-2012-100-di-kabupaten-kapuas-2024",
    resourceUrl: `${PDF_URL}#page=380`, sourceFile: "kabupatenkapuasdalamangka2025.pdf", checksum: pdfChecksum, sourceTable: "9.3.2", sourcePage: 338,
    values: inflation.map((value, index) => ({ code: `2024-${String(index + 1).padStart(2, "0")}`, label: `${months[index]} 2024`, startsOn: `2024-${String(index + 1).padStart(2, "0")}-01`, endsOn: new Date(Date.UTC(2024, index + 1, 0)).toISOString().slice(0, 10), value })),
  },
  {
    code: "SATUDATA_DISABILITAS_TERLAYANI", name: "Penyandang Disabilitas yang Terlayani di Kabupaten Kapuas",
    categoryCode: "ANALISIS_KESEJAHTERAAN", categoryName: "Kesejahteraan dan Perlindungan Sosial", ownerCode: "DINSOS",
    unitCode: "NUMBER", frequency: "annual", direction: "increase",
    definition: "Jumlah penyandang disabilitas mental, fisik, sensorik, dan intelektual yang tercatat terlayani.",
    datasetCode: "SATUDATA.KAPUAS.DISABILITAS_TERLAYANI.2021_2023", datasetTitle: "Rekapitulasi Penyandang Disabilitas yang Terlayani 2021-2023",
    packageId: "rekapitulasi-penyandang-disabilitas-yang-terlayani-di-kabupaten-kapuas-tahun-2021-2023",
    resourceUrl: DISABILITY_CSV_URL, sourceFile: "rekapitulasi-penyandang-disabilitas-2021-2023.csv", checksum: csvChecksum, sourceTable: "CSV CKAN", sourcePage: null,
    values: disabilityValues,
  },
];

const config = loadConfig();
const db = createDatabase(config.databaseUrl);

async function actor(role: string, fallback: string) {
  const result = await db.query<{ id: string }>(`SELECT u.id::text FROM sababuka.users u JOIN sababuka.user_role_assignments ura ON ura.user_id=u.id JOIN sababuka.roles r ON r.id=ura.role_id WHERE u.status='active' AND (r.code=$1 OR u.email=$2) ORDER BY CASE WHEN r.code=$1 THEN 0 ELSE 1 END LIMIT 1`, [role, fallback]);
  if (!result.rows[0]) throw new Error(`Akun ${role} belum tersedia.`);
  return result.rows[0].id;
}

try {
  const creator = await actor("superadmin", "developer@sababuka.com");
  const bapperida = await actor("bapperida", "bapperida@sababuka.com");
  const walidata = await actor("walidata", "kominfo@sababuka.com");
  const geography = await db.query<{ id: string }>(`INSERT INTO sababuka.geographies (code,name,level,metadata,is_active) VALUES ('6203','Kabupaten Kapuas','regency','{"bps_code":"6203","environment":"local"}'::jsonb,true) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,level='regency',is_active=true,updated_at=now() RETURNING id::text`);
  const walidataOrg = await db.query<{ id: string }>("SELECT id::text FROM sababuka.organizations WHERE code='DISKOMINFOSANTIK'");
  if (!geography.rows[0] || !walidataOrg.rows[0]) throw new Error("Master wilayah atau Walidata belum tersedia.");
  await db.query("BEGIN");

  const profile = await db.query<{ id: string }>(`INSERT INTO sababuka.metadata_profiles (code,name,version_number,description,schema_json,mapping_json,status,created_by,approved_by,approved_at) VALUES ('SATUDATA_LOCAL_TIME_SERIES','Seri waktu Satu Data - lokal',1,'Profil lokal untuk pengujian seri tahunan dan bulanan.','{"period":"string","value":"number","geography":"string"}'::jsonb,'{"verification":"walidata_preview","environment":"local"}'::jsonb,'active',$1,$2,now()) ON CONFLICT (code,version_number) DO UPDATE SET status='active',approved_by=EXCLUDED.approved_by,approved_at=now(),updated_at=now() RETURNING id::text`, [creator, walidata]);
  const source = await db.query<{ id: string }>(`INSERT INTO sababuka.data_sources (code,name,source_type,base_url,owner_organization_id,connection_config,is_active,created_by,last_checked_at) VALUES ('SATUDATA_KAPUAS','Satu Data Kabupaten Kapuas','ckan','https://satudata.kapuaskab.go.id',$1,'{"environment":"local","verification_mode":"preview_required"}'::jsonb,true,$2,now()) ON CONFLICT (code) DO UPDATE SET base_url=EXCLUDED.base_url,is_active=true,last_checked_at=now(),updated_at=now() RETURNING id::text`, [walidataOrg.rows[0].id, creator]);
  const publicationItems: Array<{ observationId: string; datasetVersionId: string }> = [];

  for (const item of series) {
    const owner = await db.query<{ id: string }>("SELECT id::text FROM sababuka.organizations WHERE code=$1", [item.ownerCode]);
    const unit = await db.query<{ id: string }>("SELECT id::text FROM sababuka.units WHERE code=$1", [item.unitCode]);
    if (!owner.rows[0] || !unit.rows[0]) throw new Error(`Master ${item.ownerCode}/${item.unitCode} tidak tersedia.`);
    const category = await db.query<{ id: string }>(`INSERT INTO sababuka.categories (code,name,description,display_order,is_active,created_by,review_status,submitted_by,submitted_at,decided_by,decided_at,decision_notes) VALUES ($1,$2,'Kategori analisis lokal dari sumber resmi; tidak mengubah 29 kategori RPJMD.',950,true,$3,'approved',$3,now(),$4,now(),'Disetujui hanya untuk UAT lokal.') ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,is_active=true,review_status='approved',decided_by=$4,decided_at=now(),updated_at=now() RETURNING id::text`, [item.categoryCode, item.categoryName, creator, bapperida]);
    const indicator = await db.query<{ id: string }>(`INSERT INTO sababuka.indicators (code,name,category_id,owner_organization_id,is_active,created_by) VALUES ($1,$2,$3,$4,true,$5) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,category_id=EXCLUDED.category_id,owner_organization_id=EXCLUDED.owner_organization_id,is_active=true,updated_at=now() RETURNING id::text`, [item.code, item.name, category.rows[0]!.id, owner.rows[0].id, creator]);
    const version = await db.query<{ id: string }>(`INSERT INTO sababuka.indicator_versions (indicator_id,version_number,definition,formula,unit_id,frequency,data_type,dimension_schema,direction,source_reference,access_level,effective_from,status,change_notes,submitted_by,submitted_at,bapperida_reviewed_by,bapperida_reviewed_at,approved_by,approved_at,created_by) VALUES ($1,1,$2,'Nilai mengikuti tabel resmi sumber.',$3,$4,'number',$5::jsonb,$6,$7,'public',DATE '2021-01-01','active','Indikator analisis lokal, bukan penambahan indikator RPJMD.',$8,now(),$9,now(),$9,now(),$8) ON CONFLICT (indicator_id,version_number) DO UPDATE SET definition=EXCLUDED.definition,unit_id=EXCLUDED.unit_id,frequency=EXCLUDED.frequency,direction=EXCLUDED.direction,source_reference=EXCLUDED.source_reference,status='active',approved_by=$9,approved_at=now(),updated_at=now() RETURNING id::text`, [indicator.rows[0]!.id, item.definition, unit.rows[0].id, item.frequency, JSON.stringify({ geography_level: "regency", source: "Satu Data Kabupaten Kapuas", rpmd_indicator: false, environment: "local" }), item.direction, item.resourceUrl, creator, bapperida]);
    const dataset = await db.query<{ id: string }>(`INSERT INTO sababuka.datasets (code,title,owner_organization_id,source_id,is_active,created_by) VALUES ($1,$2,$3,$4,true,$5) ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title,owner_organization_id=EXCLUDED.owner_organization_id,source_id=EXCLUDED.source_id,is_active=true,updated_at=now() RETURNING id::text`, [item.datasetCode, item.datasetTitle, owner.rows[0].id, source.rows[0]!.id, creator]);
    const datasetVersion = await db.query<{ id: string }>(`INSERT INTO sababuka.dataset_versions (dataset_id,version_number,ckan_package_id,name,title,notes,organization_id,author,maintainer,license_id,visibility,metadata_profile_id,metadata_json,effective_from,status,submitted_by,submitted_at,approved_by,approved_at,created_by) VALUES ($1,1,$2,$3,$4,$5,$6,'Satu Data Kabupaten Kapuas','Diskominfosantik Kabupaten Kapuas','other-open','public',$7,$8::jsonb,DATE '2021-01-01','active',$9,now(),$10,now(),$9) ON CONFLICT (dataset_id,version_number) DO UPDATE SET title=EXCLUDED.title,notes=EXCLUDED.notes,metadata_json=EXCLUDED.metadata_json,status='active',approved_by=$10,approved_at=now(),updated_at=now() RETURNING id::text`, [dataset.rows[0]!.id, item.packageId, item.datasetCode, item.datasetTitle, `UAT lokal; sumber ${item.sourceTable}${item.sourcePage ? ` halaman buku ${item.sourcePage}` : ""}.`, owner.rows[0].id, profile.rows[0]!.id, JSON.stringify({ ckan_package_id: item.packageId, source_table: item.sourceTable, source_page: item.sourcePage, source_url: item.resourceUrl, checksum_sha256: item.checksum, environment: "local" }), creator, walidata]);
    await db.query(`INSERT INTO sababuka.data_resources (dataset_version_id,external_id,name,description,format,mime_type,url,checksum_sha256) VALUES ($1,$2,$3,'Resource resmi untuk UAT lokal.',$4,$5,$6,$7) ON CONFLICT (dataset_version_id,external_id) WHERE external_id IS NOT NULL DO UPDATE SET url=EXCLUDED.url,checksum_sha256=EXCLUDED.checksum_sha256,updated_at=now()`, [datasetVersion.rows[0]!.id, item.packageId, item.sourceFile, item.sourceFile.endsWith(".csv") ? "CSV" : "PDF", item.sourceFile.endsWith(".csv") ? "text/csv" : "application/pdf", item.resourceUrl, item.checksum]);
    await db.query(`INSERT INTO sababuka.indicator_datasets (indicator_version_id,dataset_version_id,relation_type,field_mapping) VALUES ($1,$2,'primary',$3::jsonb) ON CONFLICT (indicator_version_id,dataset_version_id) DO UPDATE SET field_mapping=EXCLUDED.field_mapping`, [version.rows[0]!.id, datasetVersion.rows[0]!.id, JSON.stringify({ period: item.frequency === "monthly" ? "bulan" : "tahun", value: "nilai", geography_code: "6203" })]);

    for (const value of item.values) {
      const period = await db.query<{ id: string }>(`INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label RETURNING id::text`, [item.frequency, value.code, value.label, value.startsOn, value.endsOn]);
      const importKey = `local:${item.code}:${value.code}`;
      let batch = await db.query<{ id: string }>(`SELECT id::text FROM sababuka.data_batches WHERE dataset_version_id=$1 AND source_metadata->>'import_key'=$2 LIMIT 1`, [datasetVersion.rows[0]!.id, importKey]);
      if (!batch.rows[0]) batch = await db.query<{ id: string }>(`INSERT INTO sababuka.data_batches (dataset_version_id,organization_id,reporting_period_id,submission_method,source_filename,source_checksum_sha256,source_metadata,row_count,status,submitted_by,submitted_at,confirmed_by,confirmed_at,approved_by,approved_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,1,'approved',$8,now(),$9,now(),$9,now(),$8) RETURNING id::text`, [datasetVersion.rows[0]!.id, owner.rows[0].id, period.rows[0]!.id, item.sourceFile.endsWith(".csv") ? "ckan_import" : "manual", item.sourceFile, item.checksum, JSON.stringify({ import_key: importKey, ckan_package_id: item.packageId, source_url: item.resourceUrl, environment: "local", extraction: item.sourceFile.endsWith(".csv") ? "direct_csv" : "pdf_table_double_check" }), creator, walidata]);
      const observation = await db.query<{ id: string }>(`INSERT INTO sababuka.observations (batch_id,indicator_version_id,period_id,geography_id,numeric_value,quality_status,notes,created_by,source_name,source_url,source_status,source_retrieved_at) VALUES ($1,$2,$3,$4,$5,'valid',$6,$7,'Satu Data Kabupaten Kapuas',$8,'verified_direct',now()) ON CONFLICT (batch_id,indicator_version_id,period_id,geography_id,dimension_hash) DO UPDATE SET numeric_value=EXCLUDED.numeric_value,quality_status='valid',notes=EXCLUDED.notes,source_url=EXCLUDED.source_url,source_retrieved_at=now() RETURNING id::text`, [batch.rows[0]!.id, version.rows[0]!.id, period.rows[0]!.id, geography.rows[0].id, value.value, `UAT lokal; ${item.sourceTable}${item.sourcePage ? ` halaman ${item.sourcePage}` : ""}.`, creator, item.resourceUrl]);
      publicationItems.push({ observationId: observation.rows[0]!.id, datasetVersionId: datasetVersion.rows[0]!.id });
    }
  }

  const previous = await db.query<{ id: string; version_number: number; status: string }>(`SELECT id::text,version_number,status FROM sababuka.publications WHERE publication_key='LOCAL_SATUDATA_TRENDS' ORDER BY version_number DESC LIMIT 1`);
  const publication = await db.query<{ id: string }>(`INSERT INTO sababuka.publications (publication_key,version_number,publication_number,title,description,status,effective_at,change_notes,created_by,activated_by,activated_at) VALUES ('LOCAL_SATUDATA_TRENDS',$1,'LOCAL-SATUDATA-TREN-'||lpad(($1::integer)::text,3,'0'),'UAT Lokal - Tren Kemiskinan, Inflasi, dan Layanan Disabilitas','Publikasi khusus lingkungan lokal untuk memeriksa alur seri tahunan dan bulanan.','draft',now(),'Tidak boleh dipromosikan ke produksi sebelum persetujuan Walidata dan BAPPERIDA.',$2,NULL,NULL) RETURNING id::text`, [(previous.rows[0]?.version_number ?? 0) + 1, creator]);
  for (const [index, item] of publicationItems.entries()) await db.query(`INSERT INTO sababuka.publication_items (publication_id,observation_id,dataset_version_id,display_order) VALUES ($1,$2,$3,$4)`, [publication.rows[0]!.id, item.observationId, item.datasetVersionId, index + 1]);
  if (previous.rows[0]?.status === "active") await db.query("UPDATE sababuka.publications SET status='replaced',replaced_by_id=$2,updated_at=now() WHERE id=$1", [previous.rows[0].id, publication.rows[0]!.id]);
  await db.query("UPDATE sababuka.publications SET status='active',activated_by=$2,activated_at=now(),updated_at=now() WHERE id=$1", [publication.rows[0]!.id, bapperida]);
  await db.query(`INSERT INTO sababuka.audit_events (actor_id,event_type,entity_type,entity_id,after_data,metadata,request_id,user_agent) VALUES ($1,'local.satudata_trends_seeded','publication',$2,$3::jsonb,$4::jsonb,$5,'SABABUKA local integration')`, [creator, publication.rows[0]!.id, JSON.stringify({ status: "active", items: publicationItems.length }), JSON.stringify({ environment: "local", production_changed: false }), randomUUID()]);
  await db.query("COMMIT");
  console.log(JSON.stringify({ environment: "local", publication_id: publication.rows[0]!.id, indicators: series.map((item) => ({ code: item.code, observations: item.values.length })), total_observations: publicationItems.length }, null, 2));
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  await db.end();
}
