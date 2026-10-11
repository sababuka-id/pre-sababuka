import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const CONFIRMATION = "BPS_KAPUAS_2024_2025";
if (process.env.CONFIRM_BPS_TREND_PILOT !== CONFIRMATION) {
  throw new Error(`Set CONFIRM_BPS_TREND_PILOT=${CONFIRMATION} untuk menjalankan impor resmi ini.`);
}

const SOURCE_PAGE = "https://kapuaskab.bps.go.id/id/publication/2026/02/27/ee22ec8a7b750c441e674695/kabupaten-kapuas-dalam-angka-2026.html";
const RESOURCE_URL = "https://web-api.bps.go.id/download.php?f=wD4zpNGpwQAu38BZsMESw2RVWG5EVUlrbGR6b3h2RFZiNlhJSUtVNDRnTUF6ejBGY3N2MDBmazUrR0hMak43dVRhQWJ6SVVaOWdRRFIxYnpMc1k1STI0QzF3ZTZVcDRnZG1jTTNBbkc1akMwRGQ0Vnl0SHNjTmEwT0l2U0ZZMDF4VXJUbUVvaW5DOERPb3RUanNsbEZtbXkreHRqdVNxM2dHR0VSMFBCVnJ1a1NjSGhIbDFQcXVIYktNQklWTDViTUluaGVJeFRlNWJRNk14Mms3SUVLVmdxTDlZNWdscGxYT1IyYTZXdzBqOWVWYVROdlZrcUdjbFQ2cmVYRGYwbWZuUjFlSTJNR1g3b294L1A%3D";
const EXPECTED_CHECKSUM = "49694f6a127048554b4d21c4426e63a102b5dcf833b842136158188b4f43d5ae";

const series = [
  {
    code: "BPS_JUMLAH_PELANGGAN_LISTRIK_KAPUAS",
    name: "Jumlah Pelanggan Listrik PLN Kabupaten Kapuas",
    categoryCode: "SATUDATA_LAYANAN_DASAR",
    categoryName: "Layanan Dasar — Data Operasional",
    categoryDescription: "Indikator operasional dari sumber resmi yang dipisahkan dari 29 kategori RPJMD.",
    ownerCode: "DISKOMINFOSANTIK",
    definition: "Jumlah pelanggan listrik PT PLN (Persero) di seluruh Kabupaten Kapuas pada tahun pelaporan.",
    formula: "Jumlah pelanggan aktif yang dilaporkan PT PLN (Persero) Wilayah Kalselteng Area Kuala Kapuas.",
    sourceReference: "BPS Kabupaten Kapuas, Kabupaten Kapuas Dalam Angka 2026, Tabel 6.3.2 halaman buku 258.",
    datasetCode: "BPS.KAPUAS.PELANGGAN_LISTRIK.2026",
    datasetTitle: "Jumlah Pelanggan Listrik Kabupaten Kapuas 2021–2025",
    table: "6.3.2",
    page: 258,
    values: { 2024: 92689, 2025: 109113 },
  },
  {
    code: "BPS_WISATAWAN_DOMESTIK_KAPUAS",
    name: "Jumlah Wisatawan Domestik Kabupaten Kapuas",
    categoryCode: "OPERASIONAL_EKONOMI_PARIWISATA",
    categoryName: "Ekonomi dan Pariwisata — Data Operasional",
    categoryDescription: "Indikator operasional ekonomi dan pariwisata dari sumber resmi; bukan indikator RPJMD.",
    ownerCode: "DISBUDPARPORA",
    definition: "Jumlah wisatawan domestik yang tercatat berkunjung ke Kabupaten Kapuas pada tahun pelaporan.",
    formula: "Jumlah wisatawan domestik tahunan yang dilaporkan Dinas Kebudayaan dan Pariwisata Provinsi Kalimantan Tengah.",
    sourceReference: "BPS Kabupaten Kapuas, Kabupaten Kapuas Dalam Angka 2026, Tabel 7.2 halaman buku 273.",
    datasetCode: "BPS.KAPUAS.WISATAWAN_DOMESTIK.2026",
    datasetTitle: "Jumlah Wisatawan Domestik Kabupaten Kapuas 2018–2025",
    table: "7.2",
    page: 273,
    values: { 2024: 11926, 2025: 80814 },
  },
] as const;

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
  const localPdf = process.env.BPS_KAPUAS_PDF_PATH;
  if (localPdf) {
    const checksum = createHash("sha256").update(await readFile(localPdf)).digest("hex");
    if (checksum !== EXPECTED_CHECKSUM) throw new Error(`Checksum PDF tidak sesuai: ${checksum}`);
  }

  const creator = await actorFor(["superadmin", "developer"], "developer@sababuka.com");
  const bapperida = await actorFor(["bapperida"], "bapperida@sababuka.com");
  const walidata = await actorFor(["walidata", "kominfo_walidata", "superadmin"], "developer@sababuka.com");
  const requestId = randomUUID();
  await db.query("BEGIN");

  await db.query(
    `INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
     VALUES ('annual','2024','Tahun 2024',DATE '2024-01-01',DATE '2024-12-31'),
            ('annual','2025','Tahun 2025',DATE '2025-01-01',DATE '2025-12-31')
     ON CONFLICT (code) DO NOTHING`,
  );
  const unit = await db.query<{ id: string }>("SELECT id::text FROM sababuka.units WHERE code='NUMBER'");
  const geography = await db.query<{ id: string }>("SELECT id::text FROM sababuka.geographies WHERE code='6203'");
  const metadataProfile = await db.query<{ id: string }>(
    `INSERT INTO sababuka.metadata_profiles
       (code,name,version_number,description,schema_json,mapping_json,status,created_by,approved_by,approved_at)
     VALUES ('OFFICIAL_PDF_TABLE_ANNUAL','Tabel tahunan publikasi resmi',1,
       'Profil untuk seri tahunan yang diverifikasi dari tabel publikasi resmi.',
       '{"year":"integer","value":"number","geography":"string","source_page":"integer"}'::jsonb,
       '{"verification":"manual_double_check","frequency":"annual"}'::jsonb,
       'active',$1,$2,now())
     ON CONFLICT (code,version_number) DO UPDATE SET status='active',approved_by=EXCLUDED.approved_by,
       approved_at=now(),schema_json=EXCLUDED.schema_json,mapping_json=EXCLUDED.mapping_json,updated_at=now()
     RETURNING id::text`,
    [creator.id, walidata.id],
  );
  if (!unit.rows[0] || !geography.rows[0] || !metadataProfile.rows[0]) throw new Error("Master satuan, wilayah Kabupaten Kapuas, atau profil metadata belum tersedia.");

  const walidataOrg = await db.query<{ id: string }>("SELECT id::text FROM sababuka.organizations WHERE code='DISKOMINFOSANTIK'");
  if (!walidataOrg.rows[0]) throw new Error("Organisasi Diskominfosantik belum tersedia.");
  const source = await db.query<{ id: string }>(
    `INSERT INTO sababuka.data_sources
       (code,name,source_type,base_url,owner_organization_id,connection_config,is_active,created_by,last_checked_at)
     VALUES ('BPS_KAPUAS','BPS Kabupaten Kapuas','bps',$1,$2,
       '{"verification_mode":"publication_table","contains_secrets":false}'::jsonb,true,$3,now())
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,source_type='bps',base_url=EXCLUDED.base_url,
       owner_organization_id=EXCLUDED.owner_organization_id,connection_config=EXCLUDED.connection_config,
       is_active=true,last_checked_at=now(),updated_at=now()
     RETURNING id::text`,
    [SOURCE_PAGE, walidataOrg.rows[0].id, creator.id],
  );

  const publicationItems: Array<{ observationId: string; datasetVersionId: string; order: number }> = [];
  const output: Array<Record<string, unknown>> = [];
  let displayOrder = 1;

  for (const item of series) {
    const owner = await db.query<{ id: string }>("SELECT id::text FROM sababuka.organizations WHERE code=$1", [item.ownerCode]);
    if (!owner.rows[0]) throw new Error(`Organisasi ${item.ownerCode} belum tersedia.`);
    const category = await db.query<{ id: string }>(
      `INSERT INTO sababuka.categories
         (code,name,description,display_order,is_active,created_by,review_status,submitted_by,submitted_at,decided_by,decided_at,decision_notes)
       VALUES ($1,$2,$3,910,true,$4,'approved',$4,now(),$5,now(),
         'Kategori operasional sumber resmi; dipisahkan dari katalog RPJMD.')
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,is_active=true,
         review_status='approved',decided_by=EXCLUDED.decided_by,decided_at=now(),decision_notes=EXCLUDED.decision_notes,updated_at=now()
       RETURNING id::text`,
      [item.categoryCode, item.categoryName, item.categoryDescription, creator.id, bapperida.id],
    );
    const indicator = await db.query<{ id: string }>(
      `INSERT INTO sababuka.indicators (code,name,category_id,owner_organization_id,is_active,created_by)
       VALUES ($1,$2,$3,$4,true,$5)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,category_id=EXCLUDED.category_id,
         owner_organization_id=EXCLUDED.owner_organization_id,is_active=true,updated_at=now()
       RETURNING id::text`,
      [item.code, item.name, category.rows[0]!.id, owner.rows[0].id, creator.id],
    );
    const indicatorVersion = await db.query<{ id: string }>(
      `INSERT INTO sababuka.indicator_versions
         (indicator_id,version_number,definition,formula,unit_id,frequency,data_type,dimension_schema,direction,source_reference,
          access_level,effective_from,status,change_notes,submitted_by,submitted_at,bapperida_reviewed_by,bapperida_reviewed_at,
          approved_by,approved_at,created_by)
       VALUES ($1,1,$2,$3,$4,'annual','number',
         '{"geography_level":"regency","operational_source":"BPS Kabupaten Kapuas","rpjmd_indicator":false,"value_semantics":"count"}'::jsonb,
         'increase',$5,'public',DATE '2024-01-01','active',
         'Indikator operasional resmi untuk analisis tren; bukan indikator RPJMD.',$6,now(),$7,now(),$7,now(),$6)
       ON CONFLICT (indicator_id,version_number) DO UPDATE SET definition=EXCLUDED.definition,formula=EXCLUDED.formula,
         unit_id=EXCLUDED.unit_id,dimension_schema=EXCLUDED.dimension_schema,direction=EXCLUDED.direction,
         source_reference=EXCLUDED.source_reference,access_level='public',status='active',approved_by=EXCLUDED.approved_by,
         approved_at=now(),change_notes=EXCLUDED.change_notes,updated_at=now()
       RETURNING id::text`,
      [indicator.rows[0]!.id, item.definition, item.formula, unit.rows[0].id, item.sourceReference, creator.id, bapperida.id],
    );
    await db.query(
      `INSERT INTO sababuka.indicator_organizations (indicator_version_id,organization_id,responsibility,is_primary)
       VALUES ($1,$2,'validator',false),($1,$3,'curator',false)
       ON CONFLICT DO NOTHING`,
      [indicatorVersion.rows[0]!.id, walidataOrg.rows[0].id, (await db.query<{ id: string }>("SELECT id::text FROM sababuka.organizations WHERE code='BAPPERIDA'")).rows[0]!.id],
    );
    if (item.ownerCode !== "DISKOMINFOSANTIK") {
      await db.query(
        `INSERT INTO sababuka.indicator_organizations (indicator_version_id,organization_id,responsibility,is_primary)
         VALUES ($1,$2,'primary_producer',true)
         ON CONFLICT (indicator_version_id,organization_id,responsibility) DO UPDATE SET is_primary=true`,
        [indicatorVersion.rows[0]!.id, owner.rows[0].id],
      );
    }

    const dataset = await db.query<{ id: string }>(
      `INSERT INTO sababuka.datasets (code,title,owner_organization_id,source_id,is_active,created_by)
       VALUES ($1,$2,$3,$4,true,$5)
       ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title,owner_organization_id=EXCLUDED.owner_organization_id,
         source_id=EXCLUDED.source_id,is_active=true,updated_at=now()
       RETURNING id::text`,
      [item.datasetCode, item.datasetTitle, owner.rows[0].id, source.rows[0]!.id, creator.id],
    );
    const datasetVersion = await db.query<{ id: string }>(
      `INSERT INTO sababuka.dataset_versions
         (dataset_id,version_number,ckan_package_id,name,title,notes,organization_id,author,maintainer,license_id,visibility,
          metadata_profile_id,metadata_json,effective_from,status,source_modified_at,submitted_by,submitted_at,approved_by,approved_at,created_by)
       VALUES ($1,1,NULL,$2,$3,$4,$5,'BPS Kabupaten Kapuas','Diskominfosantik Kabupaten Kapuas','public-domain','public',$6,
         $7::jsonb,DATE '2024-01-01','active',TIMESTAMPTZ '2026-09-16 00:00:00+07',$8,now(),$9,now(),$8)
       ON CONFLICT (dataset_id,version_number) DO UPDATE SET title=EXCLUDED.title,notes=EXCLUDED.notes,
         organization_id=EXCLUDED.organization_id,metadata_profile_id=EXCLUDED.metadata_profile_id,metadata_json=EXCLUDED.metadata_json,
         visibility='public',status='active',source_modified_at=EXCLUDED.source_modified_at,approved_by=EXCLUDED.approved_by,
         approved_at=now(),updated_at=now()
       RETURNING id::text`,
      [dataset.rows[0]!.id, item.datasetCode, item.datasetTitle,
        `Ekstraksi terverifikasi dari Tabel ${item.table}, halaman buku ${item.page}.`, owner.rows[0].id,
        metadataProfile.rows[0].id, JSON.stringify({ publication_number: "62030.26003", table: item.table, source_page: item.page,
          source_url: SOURCE_PAGE, resource_url: RESOURCE_URL, checksum_sha256: EXPECTED_CHECKSUM, extraction_method: "manual_double_check" }),
        creator.id, walidata.id],
    );
    await db.query(
      `INSERT INTO sababuka.data_resources
         (dataset_version_id,external_id,name,description,format,mime_type,url,file_size,checksum_sha256,source_modified_at)
       VALUES ($1,'62030.26003',$2,$3,'PDF','application/pdf',$4,3940346,$5,TIMESTAMPTZ '2026-09-16 00:00:00+07')
       ON CONFLICT (dataset_version_id,external_id) WHERE external_id IS NOT NULL
       DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,
         url=EXCLUDED.url,file_size=EXCLUDED.file_size,checksum_sha256=EXCLUDED.checksum_sha256,
         source_modified_at=EXCLUDED.source_modified_at,updated_at=now()`,
      [datasetVersion.rows[0]!.id, "Kabupaten Kapuas Dalam Angka 2026", `Sumber Tabel ${item.table}, halaman ${item.page}.`, RESOURCE_URL, EXPECTED_CHECKSUM],
    );
    await db.query(
      `INSERT INTO sababuka.indicator_datasets (indicator_version_id,dataset_version_id,relation_type,field_mapping)
       VALUES ($1,$2,'primary',$3::jsonb)
       ON CONFLICT (indicator_version_id,dataset_version_id) DO UPDATE SET relation_type='primary',field_mapping=EXCLUDED.field_mapping`,
      [indicatorVersion.rows[0]!.id, datasetVersion.rows[0]!.id, JSON.stringify({ table: item.table, year_column: "Tahun", value_column: item.name })],
    );

    for (const [yearText, value] of Object.entries(item.values)) {
      const period = await db.query<{ id: string }>("SELECT id::text FROM sababuka.periods WHERE code=$1", [yearText]);
      const importKey = `${item.code}:${yearText}:62030.26003`;
      let batch = await db.query<{ id: string }>(
        `SELECT id::text FROM sababuka.data_batches
         WHERE dataset_version_id=$1 AND source_metadata->>'import_key'=$2 LIMIT 1`,
        [datasetVersion.rows[0]!.id, importKey],
      );
      if (!batch.rows[0]) {
        batch = await db.query<{ id: string }>(
          `INSERT INTO sababuka.data_batches
             (dataset_version_id,organization_id,reporting_period_id,submission_method,source_filename,source_checksum_sha256,
              source_metadata,row_count,status,submitted_by,submitted_at,confirmed_by,confirmed_at,approved_by,approved_at,created_by)
           VALUES ($1,$2,$3,'manual','Kabupaten Kapuas Dalam Angka 2026.pdf',$4,$5::jsonb,1,'approved',
             $6,now(),$7,now(),$7,now(),$6)
           RETURNING id::text`,
          [datasetVersion.rows[0]!.id, owner.rows[0].id, period.rows[0]!.id, EXPECTED_CHECKSUM,
            JSON.stringify({ import_key: importKey, source_url: SOURCE_PAGE, resource_url: RESOURCE_URL,
              publication_number: "62030.26003", table: item.table, source_page: item.page,
              extraction_method: "manual_double_check", verified_by_role: "walidata" }), creator.id, walidata.id],
        );
      } else {
        await db.query(
          `UPDATE sababuka.data_batches SET status='approved',row_count=1,source_checksum_sha256=$2,
           approved_by=$3,approved_at=now(),updated_at=now() WHERE id=$1`,
          [batch.rows[0].id, EXPECTED_CHECKSUM, walidata.id],
        );
      }
      const observation = await db.query<{ id: string }>(
        `INSERT INTO sababuka.observations
           (batch_id,indicator_version_id,period_id,geography_id,numeric_value,quality_status,notes,created_by,
            source_name,source_url,source_status,source_retrieved_at)
         VALUES ($1,$2,$3,$4,$5,'valid',$6,$7,$8,$9,'verified_direct',now())
         ON CONFLICT (batch_id,indicator_version_id,period_id,geography_id,dimension_hash)
         DO UPDATE SET numeric_value=EXCLUDED.numeric_value,quality_status='valid',notes=EXCLUDED.notes,
           source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,source_status=EXCLUDED.source_status,
           source_retrieved_at=now()
         RETURNING id::text`,
        [batch.rows[0]!.id, indicatorVersion.rows[0]!.id, period.rows[0]!.id, geography.rows[0].id, value,
          `Diverifikasi dari Tabel ${item.table}, halaman buku ${item.page}; satuan adalah jumlah/angka.`, creator.id,
          item.code.includes("PELANGGAN_LISTRIK") ? "BPS Kabupaten Kapuas / PT PLN (Persero)" : "BPS Kabupaten Kapuas / Dinas Kebudayaan dan Pariwisata Provinsi Kalimantan Tengah",
          SOURCE_PAGE],
      );
      publicationItems.push({ observationId: observation.rows[0]!.id, datasetVersionId: datasetVersion.rows[0]!.id, order: displayOrder++ });
    }
    output.push({ indicator: item.code, values: item.values, dataset_version_id: datasetVersion.rows[0]!.id });
  }

  const previous = await db.query<{ id: string; version_number: number; status: string }>(
    `SELECT id::text,version_number,status FROM sababuka.publications
     WHERE publication_key='BPS_KAPUAS_TREN_OPERASIONAL' ORDER BY version_number DESC LIMIT 1`,
  );
  const nextVersion = (previous.rows[0]?.version_number ?? 0) + 1;
  const publication = await db.query<{ id: string }>(
    `INSERT INTO sababuka.publications
       (publication_key,version_number,publication_number,title,description,status,effective_at,change_notes,created_by,activated_by,activated_at)
     VALUES ('BPS_KAPUAS_TREN_OPERASIONAL',$1,'BPS-KAPUAS-TREN-'||lpad(($1::integer)::text,3,'0'),
       'Tren Operasional Kabupaten Kapuas 2024–2025',
       'Seri resmi pelanggan listrik PLN dan wisatawan domestik untuk membuktikan alur data lintas tahun sampai analisis pimpinan.',
       'draft',now(),'Diverifikasi dari Kabupaten Kapuas Dalam Angka 2026; tidak dicampur dengan rasio elektrifikasi Mantangai.',$2,NULL,NULL)
     RETURNING id::text`,
    [nextVersion, creator.id],
  );
  for (const item of publicationItems) {
    await db.query(
      `INSERT INTO sababuka.publication_items (publication_id,observation_id,dataset_version_id,display_order)
       VALUES ($1,$2,$3,$4)`,
      [publication.rows[0]!.id, item.observationId, item.datasetVersionId, item.order],
    );
  }
  if (previous.rows[0]?.status === "active") {
    await db.query("UPDATE sababuka.publications SET status='replaced',replaced_by_id=$2,updated_at=now() WHERE id=$1", [previous.rows[0].id, publication.rows[0]!.id]);
  }
  await db.query(
    "UPDATE sababuka.publications SET status='active',activated_by=$2,activated_at=now(),updated_at=now() WHERE id=$1",
    [publication.rows[0]!.id, bapperida.id],
  );
  await db.query(
    `INSERT INTO sababuka.workflow_actions
       (entity_type,entity_id,action,from_status,to_status,actor_id,actor_role_code,notes,request_id)
     VALUES ('publication',$1,'activate','draft','active',$2,'bapperida',
       'Publikasi tren operasional sumber BPS diaktifkan setelah verifikasi Walidata.',$3)`,
    [publication.rows[0]!.id, bapperida.id, requestId],
  );
  await db.query(
    `INSERT INTO sababuka.audit_events (actor_id,event_type,entity_type,entity_id,metadata,request_id)
     VALUES ($1,'official.bps_kapuas_trends_published','publication',$2,$3::jsonb,$4)`,
    [bapperida.id, publication.rows[0]!.id, JSON.stringify({ publication_number: "62030.26003",
      checksum_sha256: EXPECTED_CHECKSUM, source_url: SOURCE_PAGE, indicators: output.map((item) => item.indicator), rpmd_indicator: false }), requestId],
  );

  await db.query("COMMIT");
  console.log(JSON.stringify({ publication_id: publication.rows[0]!.id, publication_version: nextVersion, data: output }, null, 2));
} catch (error) {
  await db.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await db.end();
}
