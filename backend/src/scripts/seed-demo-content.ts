import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const config = loadConfig();
if (config.nodeEnv !== "development") throw new Error("Konten demo hanya boleh dibuat pada NODE_ENV=development.");
const db = createDatabase(config.databaseUrl);
const client = await db.connect();
try {
  await client.query("BEGIN");
  const actor = await client.query<{ id: string }>(`SELECT id::text FROM sababuka.users WHERE email = 'developer@sababuka.com' LIMIT 1`);
  const actorId = actor.rows[0]?.id ?? null;
  await client.query(`
    INSERT INTO sababuka.policy_focuses (code, name, description, display_order, is_active, created_by)
    VALUES ('DEMO_PRESENTATION', '[DEMO] Paket Presentasi', 'Paket terisolasi untuk ekspose; bukan master RPJMD.', 900, true, $1),
           ('DEMO_PRACTICE', '[DEMO] Paket Latihan Peserta', 'Paket terisolasi untuk latihan alur; bukan master RPJMD.', 901, true, $1)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, display_order = EXCLUDED.display_order, is_active = true, archived_at = NULL`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.categories (code, name, description, policy_focus_id, display_order, is_active, created_by, review_status, decision_notes)
    SELECT x.code, x.name, x.description, pf.id, x.display_order, true, $1, 'draft', x.notes
    FROM (VALUES
      ('DEMO_PRESENTATION_CATEGORY', '[DEMO PRESENTASI] Prevalensi stunting', 'DEMO_PACKAGE=DEMO_PRESENTATION; simulasi alur UPR, BAPPERIDA, Dinkes, dan Dashboard Pimpinan menggunakan sumber resmi.', 'DEMO_PRESENTATION', 900, 'Paket presentasi; menunggu keputusan BAPPERIDA.'),
      ('DEMO_PRACTICE_CATEGORY', '[DEMO LATIHAN PESERTA] Capaian layanan', 'DEMO_PACKAGE=DEMO_PRACTICE; tidak terkait kategori RPJMD.', 'DEMO_PRACTICE', 901, 'Paket latihan; menunggu keputusan BAPPERIDA.')
    ) AS x(code, name, description, focus_code, display_order, notes)
    JOIN sababuka.policy_focuses pf ON pf.code = x.focus_code
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, policy_focus_id = EXCLUDED.policy_focus_id, display_order = EXCLUDED.display_order, is_active = true, archived_at = NULL`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.indicators (code, name, category_id, owner_organization_id, is_active, created_by)
    SELECT x.code, x.name, c.id, o.id, true, $1
    FROM (VALUES ('DEMO_PRESENTATION_INDICATOR', '[DEMO PRESENTASI] Prevalensi stunting', 'DEMO_PRESENTATION_CATEGORY'), ('DEMO_PRACTICE_INDICATOR', '[DEMO LATIHAN PESERTA] Nilai capaian layanan', 'DEMO_PRACTICE_CATEGORY')) AS x(code, name, category_code)
    JOIN sababuka.categories c ON c.code = x.category_code LEFT JOIN sababuka.organizations o ON o.code = CASE WHEN x.code = 'DEMO_PRESENTATION_INDICATOR' THEN 'DINKES' ELSE 'DKPP' END
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, owner_organization_id = EXCLUDED.owner_organization_id, is_active = true, archived_at = NULL`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.indicator_versions (indicator_id, version_number, definition, unit_id, frequency, data_type, dimension_schema, access_level, effective_from, status, change_notes, created_by)
    SELECT i.id, 1, CASE WHEN i.code = 'DEMO_PRESENTATION_INDICATOR' THEN 'Persentase balita yang mengalami stunting di Kabupaten Kapuas berdasarkan sumber resmi yang telah ditelusuri.' ELSE 'Nilai demonstrasi untuk latihan alur SABABUKA; bukan realisasi resmi.' END, u.id, 'annual', 'number', '{}'::jsonb, 'internal', DATE '2026-01-01', 'draft', CASE WHEN i.code = 'DEMO_PRESENTATION_INDICATOR' THEN 'Sumber demo: Kementerian Kesehatan — Survei Kesehatan Indonesia 2023. Angka dan status tetap menunggu alur persetujuan.' ELSE 'Paket demo terisolasi; status workflow dipertahankan saat seed ulang.' END, $1
    FROM sababuka.indicators i JOIN sababuka.units u ON u.code = 'NUMBER' WHERE i.code IN ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRACTICE_INDICATOR')
    ON CONFLICT (indicator_id, version_number) DO UPDATE SET definition = EXCLUDED.definition, unit_id = EXCLUDED.unit_id, frequency = EXCLUDED.frequency, data_type = EXCLUDED.data_type, dimension_schema = EXCLUDED.dimension_schema, access_level = EXCLUDED.access_level, effective_from = EXCLUDED.effective_from`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.indicator_organizations (indicator_version_id, organization_id, responsibility, is_primary)
    SELECT iv.id, o.id, 'primary_producer', true FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id = iv.indicator_id JOIN sababuka.organizations o ON o.code = CASE WHEN i.code = 'DEMO_PRESENTATION_INDICATOR' THEN 'DINKES' ELSE 'DKPP' END
    WHERE i.code IN ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRACTICE_INDICATOR') AND iv.version_number = 1
    ON CONFLICT (indicator_version_id, organization_id, responsibility) DO UPDATE SET is_primary = true`);
  await client.query(`
    INSERT INTO sababuka.targets (indicator_version_id, period_id, numeric_value, notes, created_by)
    SELECT iv.id, p.id, x.value, 'DEMO_PACKAGE=' || x.package_code || '; target latihan, bukan target RPJMD.', $1
    FROM (VALUES ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRESENTATION', 80::numeric), ('DEMO_PRACTICE_INDICATOR', 'DEMO_PRACTICE', 70::numeric)) AS x(indicator_code, package_code, value)
    JOIN sababuka.indicators i ON i.code = x.indicator_code JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1 JOIN sababuka.periods p ON p.code = '2026'
    ON CONFLICT (indicator_version_id, period_id, geography_id, dimension_hash) DO UPDATE SET numeric_value = EXCLUDED.numeric_value, text_value = NULL, notes = EXCLUDED.notes`, [actorId]);
  await client.query(`
    INSERT INTO sababuka.periods (period_type, code, label, starts_on, ends_on)
    VALUES ('annual', '2023', 'Tahun 2023', DATE '2023-01-01', DATE '2023-12-31')
    ON CONFLICT (code) DO NOTHING`);
  await client.query(`
    WITH context AS (
      SELECT
        (SELECT id FROM sababuka.datasets WHERE code = 'SABABUKA.CAPAIAN_MANUAL' LIMIT 1) AS dataset_id,
        (SELECT id FROM sababuka.organizations WHERE code = 'DINKES' LIMIT 1) AS organization_id,
        (SELECT id FROM sababuka.periods WHERE code = '2023' LIMIT 1) AS period_id,
        (SELECT id FROM sababuka.users WHERE email = 'developer@sababuka.com' LIMIT 1) AS actor_id,
        (SELECT id FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id = iv.indicator_id WHERE i.code = 'DEMO_PRESENTATION_INDICATOR' AND iv.version_number = 1 LIMIT 1) AS indicator_version_id
    ), dataset_version AS (
      SELECT dv.id FROM sababuka.dataset_versions dv JOIN context c ON c.dataset_id = dv.dataset_id WHERE dv.version_number = 1 LIMIT 1
    ), batch AS (
      INSERT INTO sababuka.data_batches
        (dataset_version_id, organization_id, reporting_period_id, submission_method, source_metadata, row_count, status, submitted_by, submitted_at, approved_by, approved_at, created_by)
      SELECT dv.id, c.organization_id, c.period_id, 'api_import', '{"demo":true,"source":"Kementerian Kesehatan — SKI 2023","import_key":"DEMO_PREVALENSI_STUNTING_2023"}'::jsonb, 0, 'approved', c.actor_id, now(), c.actor_id, now(), c.actor_id
      FROM context c CROSS JOIN dataset_version dv
      WHERE NOT EXISTS (SELECT 1 FROM sababuka.data_batches WHERE source_metadata->>'import_key' = 'DEMO_PREVALENSI_STUNTING_2023')
      RETURNING id
    )
    INSERT INTO sababuka.observations
      (batch_id, indicator_version_id, period_id, numeric_value, quality_status, notes, created_by, source_name, source_url, source_status, source_retrieved_at)
    SELECT COALESCE((SELECT id FROM batch LIMIT 1), (SELECT id FROM sababuka.data_batches WHERE source_metadata->>'import_key' = 'DEMO_PREVALENSI_STUNTING_2023' LIMIT 1)), c.indicator_version_id, c.period_id, 16.2, 'valid', 'Nilai demo berasal dari Tabel 15.21 Survei Kesehatan Indonesia 2023; dipakai untuk simulasi alur, bukan angka baru.', c.actor_id, 'Kementerian Kesehatan — Survei Kesehatan Indonesia 2023', 'https://kemkes.go.id/app_asset/file_content_download/17169067256655eae5553985.98376730.pdf', 'verified_direct', now()
    FROM context c
    WHERE c.indicator_version_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM sababuka.observations o WHERE o.indicator_version_id = c.indicator_version_id AND o.period_id = c.period_id)`);
  await client.query(`UPDATE sababuka.data_batches SET row_count = (SELECT count(*)::int FROM sababuka.observations o WHERE o.batch_id = sababuka.data_batches.id), updated_at = now() WHERE source_metadata->>'import_key' = 'DEMO_PREVALENSI_STUNTING_2023'`);
  await client.query(`
    INSERT INTO sababuka.indicator_source_audits (indicator_version_id, audit_status, source_name, source_url, source_period, notes)
    SELECT iv.id, 'verified_direct', 'Kementerian Kesehatan — Survei Kesehatan Indonesia 2023', 'https://kemkes.go.id/app_asset/file_content_download/17169067256655eae5553985.98376730.pdf', '2023', 'Angka 16,2 persen untuk demonstrasi alur; Dinkes tetap mengonfirmasi sumber saat verifikasi teknis.'
    FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id = iv.indicator_id
    WHERE i.code = 'DEMO_PRESENTATION_INDICATOR' AND iv.version_number = 1
    ON CONFLICT (indicator_version_id, source_name, source_period) DO UPDATE SET audit_status = EXCLUDED.audit_status, source_url = EXCLUDED.source_url, notes = EXCLUDED.notes, retrieved_at = now()`);
  const demoReady = await client.query<{ indicator_version_id: string; indicator_code: string; indicator_name: string; observation_id: string; dataset_version_id: string }>(`
    SELECT iv.id::text AS indicator_version_id, i.code AS indicator_code, i.name AS indicator_name,
           o.id::text AS observation_id, b.dataset_version_id::text AS dataset_version_id
    FROM sababuka.indicator_versions iv
    JOIN sababuka.indicators i ON i.id = iv.indicator_id
    JOIN sababuka.observations o ON o.indicator_version_id = iv.id AND o.quality_status = 'valid' AND o.source_status IN ('verified_direct', 'verified_calculated')
    JOIN sababuka.data_batches b ON b.id = o.batch_id
    WHERE i.code = 'DEMO_PRESENTATION_INDICATOR' AND iv.status = 'active'
    ORDER BY o.created_at DESC LIMIT 1`);
  if (demoReady.rows[0]) {
    const item = demoReady.rows[0];
    const publicationKey = `AUTO_${item.indicator_code}`;
    const active = await client.query<{ id: string }>(`SELECT id::text FROM sababuka.publications WHERE publication_key = $1 AND status = 'active' LIMIT 1`, [publicationKey]);
    if (!active.rows[0]) {
      const previous = await client.query<{ version_number: number }>(`SELECT version_number FROM sababuka.publications WHERE publication_key = $1 ORDER BY version_number DESC LIMIT 1`, [publicationKey]);
      const version = (previous.rows[0]?.version_number ?? 0) + 1;
      const publication = await client.query<{ id: string }>(`
        INSERT INTO sababuka.publications
          (publication_key, version_number, publication_number, title, description, status, effective_at, change_notes, created_by, activated_by, activated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', now(), $6, $7, $7, now()) RETURNING id::text`,
        [publicationKey, version, `SABABUKA-AUTO-${version.toString().padStart(3, "0")}`, `Rilis otomatis — ${item.indicator_name}`, "Capaian bersumber dari observasi resmi yang telah lolos validasi teknis OPD.", "Dipulihkan oleh seed paket demo.", actorId]);
      await client.query(`INSERT INTO sababuka.publication_items (publication_id, observation_id, dataset_version_id, display_order) VALUES ($1, $2, $3, 1)`, [publication.rows[0]!.id, item.observation_id, item.dataset_version_id]);
    }
  }
  await client.query("COMMIT");
  console.log("Paket demo terisolasi siap: presentasi dan latihan. Tidak ada submission atau publikasi yang dibuat.");
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await db.end(); }
