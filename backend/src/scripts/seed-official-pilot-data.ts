import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const config = loadConfig();
if (config.nodeEnv !== "development") {
  throw new Error("Impor verifikasi awal hanya boleh dijalankan pada NODE_ENV=development.");
}

const KDA_2025_URL = "https://papi.dpmptsp.kapuaskab.go.id/web/public/deploy/pdf/1759356859_f7c4eed3cc72d54abcaf.pdf";
const IKP_2026_URL = "https://data.badanpangan.go.id/datasetpublications/cky/ikp-kabupaten-kota-2024-2026";
const SKI_2023_URL = "https://kemkes.go.id/app_asset/file_content_download/17169067256655eae5553985.98376730.pdf";
const AUDITED_2024_URL = "https://ipkd.kapuaskab.go.id/dokumen/ipkd/16._Laporan_Keuangan_Audited_TA_2024_PEMKAB_KAPUAS.pdf";
const PDRB_2025_URL = "https://kapuaskab.bps.go.id/id/publication/2026/04/06/175e2f3645d9207eb4a58b21/produk-domestik-regional-bruto-kabupaten-kapuas-menurut-lapangan-usaha-2021-2025.html";

type VerifiedValue = {
  code: string;
  year: "2023" | "2024" | "2025" | "2026";
  value: number;
  sourceName: string;
  sourceUrl: string;
  sourceStatus: "verified_direct" | "verified_calculated";
  qualityStatus: "valid" | "warning";
  notes: string;
};

const verifiedValues: VerifiedValue[] = [
  {
    code: "IKP", year: "2026", value: 82.35,
    sourceName: "Badan Pangan Nasional — Open Data IKP Kabupaten/Kota 2024–2026",
    sourceUrl: IKP_2026_URL, sourceStatus: "verified_direct", qualityStatus: "valid",
    notes: "Nilai komposit IKP Kabupaten Kapuas tahun 2026; peringkat 44 dan kategori Sangat Tahan.",
  },
  {
    code: "RASIO_PDRB_PERTANIAN", year: "2025", value: 24.07,
    sourceName: "BPS Kabupaten Kapuas — PDRB Menurut Lapangan Usaha 2021–2025 (terbit 2026)",
    sourceUrl: PDRB_2025_URL, sourceStatus: "verified_direct", qualityStatus: "warning",
    notes: "Angka sangat sementara 2025. Cakupan resmi adalah Pertanian, Kehutanan, dan Perikanan; nama indikator perlu diselaraskan agar tidak dibaca sebagai pertanian sempit.",
  },
  {
    code: "KONTRIBUSI_INDUSTRI", year: "2025", value: 13.98,
    sourceName: "BPS Kabupaten Kapuas — PDRB Menurut Lapangan Usaha 2021–2025 (terbit 2026)",
    sourceUrl: PDRB_2025_URL, sourceStatus: "verified_direct", qualityStatus: "valid",
    notes: "Kontribusi industri pengolahan tahun 2025 sebesar 13,98 persen; angka sangat sementara.",
  },
  {
    code: "PERTUMBUHAN_PDRB_KAPITA", year: "2025", value: 3.55,
    sourceName: "BPS Kabupaten Kapuas — PDRB Menurut Lapangan Usaha 2021–2025 (terbit 2026)",
    sourceUrl: PDRB_2025_URL, sourceStatus: "verified_direct", qualityStatus: "valid",
    notes: "Pertumbuhan PDRB per kapita ADHK 2010 tahun 2025 sebesar 3,55 persen; angka sangat sementara.",
  },
  {
    code: "TINGKAT_KEMISKINAN", year: "2024", value: 5.25,
    sourceName: "BPS Kabupaten Kapuas — Kabupaten Kapuas Dalam Angka 2025",
    sourceUrl: KDA_2025_URL, sourceStatus: "verified_direct", qualityStatus: "valid",
    notes: "Persentase penduduk miskin Kabupaten Kapuas tahun 2024 berdasarkan Susenas Maret.",
  },
  {
    code: "PREVALENSI_STUNTING", year: "2023", value: 16.2,
    sourceName: "Kementerian Kesehatan — Survei Kesehatan Indonesia 2023",
    sourceUrl: SKI_2023_URL, sourceStatus: "verified_direct", qualityStatus: "valid",
    notes: "Prevalensi stunting balita Kabupaten Kapuas pada Tabel 15.21 SKI 2023.",
  },
];

const audits = [
  ["IKP", "verified_direct", "Badan Pangan Nasional — Open Data IKP Kabupaten/Kota 2024–2026", IKP_2026_URL, "2026", "Nilai komposit Kabupaten Kapuas 82,35; peringkat 44; kategori Sangat Tahan."],
  ["PPH_KETERSEDIAAN", "requires_opd", "DKPP/Neraca Bahan Makanan", null, "belum tersedia", "Belum ditemukan angka kabupaten yang terbuka dan definisinya cocok; perlu konfirmasi DKPP."],
  ["RASIO_PDRB_PERTANIAN", "verified_direct", "BPS — PDRB Kapuas Menurut Lapangan Usaha 2021–2025", PDRB_2025_URL, "2025", "Nilai 24,07 persen; angka sangat sementara, dengan cakupan Pertanian, Kehutanan, dan Perikanan."],
  ["NILAI_INVESTASI", "requires_opd", "DPMPTSP/LKPM-OSS", null, "belum tersedia", "Realisasi PMDN/PMA perlu ekstraksi atau pengesahan DPMPTSP sesuai periode dan satuan."],
  ["KONTRIBUSI_INDUSTRI", "verified_direct", "BPS — PDRB Kapuas Menurut Lapangan Usaha 2021–2025", PDRB_2025_URL, "2025", "Kontribusi industri pengolahan 13,98 persen; angka sangat sementara."],
  ["PERTUMBUHAN_PDRB_KAPITA", "verified_direct", "BPS — PDRB Kapuas Menurut Lapangan Usaha 2021–2025", PDRB_2025_URL, "2025", "Pertumbuhan PDRB per kapita ADHK 2010 sebesar 3,55 persen; angka sangat sementara."],
  ["INDEKS_DESA", "requires_opd", "Kementerian Desa/DPMD", null, "belum tersedia", "Perlu dataset desa per desa dan metodologi indeks yang berlaku pada tahun pelaporan."],
  ["DESA_MANDIRI", "requires_opd", "Kementerian Desa/DPMD", null, "belum tersedia", "Perlu jumlah desa berstatus mandiri dan total desa pada periode yang sama."],
  ["RASIO_KEWIRAUSAHAAN", "requires_opd", "BPS/Disperindagkop-UKM", null, "belum tersedia", "Definisi pembilang dan penyebut pada level kabupaten belum disepakati."],
  ["TINGKAT_KEMISKINAN", "verified_direct", "BPS/Kabupaten Kapuas Dalam Angka 2025", KDA_2025_URL, "2024", "Persentase penduduk miskin 5,25 persen."],
  ["PREVALENSI_STUNTING", "verified_direct", "Kementerian Kesehatan — SKI 2023", SKI_2023_URL, "2023", "Prevalensi stunting 16,2 persen."],
  ["LITERASI_DASAR", "requires_opd", "Kemendikdasmen/Rapor Pendidikan", null, "belum tersedia", "Data kabupaten memerlukan akses atau pengesahan Dinas Pendidikan dan definisi jenjang yang dipakai."],
  ["INDEKS_KONEKTIVITAS", "requires_opd", "Dishub/Bapperida", null, "belum tersedia", "Metode, komponen, bobot, dan sumber indeks belum ditetapkan."],
  ["AKSES_AIR_MINUM", "requires_opd", "BPS Susenas/Dinas PUPR", null, "belum tersedia", "Perlu memilih definisi akses layak, aman, atau layanan perpipaan agar angka tidak salah padan."],
  ["RUMAH_BERSANITASI", "requires_opd", "BPS Susenas/Dinas PUPR", null, "belum tersedia", "Perlu memilih definisi sanitasi layak atau aman dan unit penduduk/rumah tangga."],
] as const;

const db = createDatabase(config.databaseUrl);
const client = await db.connect();

try {
  await client.query("BEGIN");
  const actor = await client.query<{ id: string }>("SELECT id::text FROM sababuka.users WHERE email = 'superadmin@sababuka.local'");
  const actorId = actor.rows[0]?.id;
  if (!actorId) throw new Error("Jalankan dev:seed-users terlebih dahulu.");

  await client.query(
    `INSERT INTO sababuka.periods (period_type, code, label, starts_on, ends_on)
     VALUES ('annual', '2023', 'Tahun 2023', DATE '2023-01-01', DATE '2023-12-31'),
            ('annual', '2024', 'Tahun 2024', DATE '2024-01-01', DATE '2024-12-31')
     ON CONFLICT (code) DO NOTHING`,
  );

  for (const [code, status, sourceName, sourceUrl, sourcePeriod, notes] of audits) {
    await client.query(
      `INSERT INTO sababuka.indicator_source_audits
         (indicator_version_id, audit_status, source_name, source_url, source_period, notes)
       SELECT iv.id, $2, $3, $4, $5, $6
       FROM sababuka.indicators i
       JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1
       WHERE i.code = $1
       ON CONFLICT (indicator_version_id, source_name, source_period)
       DO UPDATE SET audit_status = EXCLUDED.audit_status, source_url = EXCLUDED.source_url,
                     notes = EXCLUDED.notes, retrieved_at = now()`,
      [code, status, sourceName, sourceUrl, sourcePeriod, notes],
    );
  }

  const context = await client.query<{ dataset_version_id: string }>(
    `SELECT dv.id::text AS dataset_version_id
     FROM sababuka.datasets d JOIN sababuka.dataset_versions dv ON dv.dataset_id = d.id AND dv.version_number = 1
     WHERE d.code = 'SABABUKA.CAPAIAN_MANUAL'`,
  );
  const datasetVersionId = context.rows[0]?.dataset_version_id;
  if (!datasetVersionId) throw new Error("Dataset manual SABABUKA belum tersedia. Jalankan migration terlebih dahulu.");

  const observationIds: string[] = [];
  for (const item of verifiedValues) {
    const lookup = await client.query<{ indicator_version_id: string; organization_id: string; period_id: string }>(
      `SELECT iv.id::text AS indicator_version_id, i.owner_organization_id::text AS organization_id, p.id::text AS period_id
       FROM sababuka.indicators i
       JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1
       JOIN sababuka.periods p ON p.code = $2
       WHERE i.code = $1`,
      [item.code, item.year],
    );
    const row = lookup.rows[0];
    if (!row) throw new Error(`Konteks indikator ${item.code}/${item.year} tidak ditemukan.`);

    const importKey = `${item.code}:${item.year}`;
    let batch = await client.query<{ id: string }>(
      `SELECT id::text FROM sababuka.data_batches
       WHERE dataset_version_id = $1 AND organization_id = $2 AND reporting_period_id = $3
         AND submission_method = 'api_import' AND source_metadata->>'import_key' = $4
       ORDER BY created_at DESC LIMIT 1`,
      [datasetVersionId, row.organization_id, row.period_id, importKey],
    );
    if (!batch.rows[0]) {
      batch = await client.query<{ id: string }>(
        `INSERT INTO sababuka.data_batches
           (dataset_version_id, organization_id, reporting_period_id, submission_method,
            source_metadata, row_count, status, submitted_by, submitted_at, approved_by, approved_at, created_by)
         VALUES ($1, $2, $3, 'api_import', $4::jsonb, 0, 'approved', $5, now(), $5, now(), $5)
         RETURNING id::text`,
        [datasetVersionId, row.organization_id, row.period_id,
          JSON.stringify({ official_source_audit: true, import_key: importKey, source_url: item.sourceUrl }), actorId],
      );
    }
    const observation = await client.query<{ id: string }>(
      `INSERT INTO sababuka.observations
         (batch_id, indicator_version_id, period_id, numeric_value, quality_status, notes, created_by,
          source_name, source_url, source_status, source_retrieved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       ON CONFLICT (batch_id, indicator_version_id, period_id, geography_id, dimension_hash)
       DO NOTHING
       RETURNING id::text`,
      [batch.rows[0]!.id, row.indicator_version_id, row.period_id, item.value, item.qualityStatus,
        item.notes, actorId, item.sourceName, item.sourceUrl, item.sourceStatus],
    );
    if (observation.rows[0]) observationIds.push(observation.rows[0].id);
    else {
      const existing = await client.query<{ id: string }>(
        `SELECT id::text FROM sababuka.observations
         WHERE batch_id = $1 AND indicator_version_id = $2 AND period_id = $3`,
        [batch.rows[0]!.id, row.indicator_version_id, row.period_id],
      );
      if (existing.rows[0]) observationIds.push(existing.rows[0].id);
    }
    await client.query(
      `UPDATE sababuka.data_batches SET row_count = (SELECT count(*)::int FROM sababuka.observations WHERE batch_id = $1)
       WHERE id = $1`,
      [batch.rows[0]!.id],
    );
  }

  const existingPublication = await client.query<{ id: string; version_number: number; status: string }>(
    `SELECT id::text, version_number, status FROM sababuka.publications
     WHERE publication_key = 'VERIFIKASI_AWAL_SUMBER_RESMI'
     ORDER BY version_number DESC LIMIT 1`,
  );
  const previous = existingPublication.rows[0];
  const existingItems = previous ? await client.query<{ observation_id: string }>(
    `SELECT observation_id::text FROM sababuka.publication_items WHERE publication_id = $1`,
    [previous.id],
  ) : null;
  const expected = new Set(observationIds);
  const isCurrent = existingItems !== null
    && existingItems.rowCount === expected.size
    && existingItems.rows.every((row) => expected.has(row.observation_id));

  if (!isCurrent) {
    const nextVersion = (previous?.version_number ?? 0) + 1;
    const publication = await client.query<{ id: string }>(
      `INSERT INTO sababuka.publications
         (publication_key, version_number, publication_number, title, description, status,
          effective_at, change_notes, created_by)
       VALUES ('VERIFIKASI_AWAL_SUMBER_RESMI', $2::integer, 'SABABUKA-VERIF-' || lpad(($2::integer)::text, 3, '0'),
         'Data Sumber Resmi — Kondisi Terkini Indikator Pilot',
         'Capaian terbaru yang tersedia untuk setiap indikator dan telah ditelusuri ke publikasi pemerintah. Tahun pada kartu adalah tahun observasi, bukan tahun terbit dokumen.',
         'draft', now(), 'Memakai observasi terbaru yang tersedia; indikator lain tetap menunggu sumber OPD atau penyelarasan definisi.', $1)
       RETURNING id::text`,
      [actorId, nextVersion],
    );
    await client.query(
      `INSERT INTO sababuka.publication_items (publication_id, observation_id, dataset_version_id, display_order)
       SELECT $1, obs.id, b.dataset_version_id, row_number() OVER (ORDER BY c.display_order, i.name)::int
       FROM sababuka.observations obs
       JOIN sababuka.data_batches b ON b.id = obs.batch_id
       JOIN sababuka.indicator_versions iv ON iv.id = obs.indicator_version_id
       JOIN sababuka.indicators i ON i.id = iv.indicator_id
       JOIN sababuka.categories c ON c.id = i.category_id
       WHERE obs.id = ANY($2::uuid[])`,
      [publication.rows[0]!.id, observationIds],
    );
    if (previous?.status === "active") {
      await client.query(
        `UPDATE sababuka.publications SET status = 'replaced', replaced_by_id = $2, updated_at = now()
         WHERE id = $1`,
        [previous.id, publication.rows[0]!.id],
      );
    }
    await client.query(
      `UPDATE sababuka.publications SET status = 'active', activated_by = $2, activated_at = now(), updated_at = now()
       WHERE id = $1`, [publication.rows[0]!.id, actorId],
    );
  }

  await client.query(
    `INSERT INTO sababuka.audit_events (actor_id, event_type, entity_type, metadata)
     VALUES ($1, 'development.official_source_audit_seeded', 'system',
       jsonb_build_object('audited_indicators', 15, 'published_verified_values', $2::int,
                          'verified_direct', 6, 'verified_calculated', 0))`,
    [actorId, verifiedValues.length],
  );
  await client.query("COMMIT");
  console.log(`Audit sumber selesai: 15 indikator diperiksa, ${verifiedValues.length} capaian resmi dipublikasikan.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await db.end();
}
