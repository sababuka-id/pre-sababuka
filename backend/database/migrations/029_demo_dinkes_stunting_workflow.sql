BEGIN;

-- Paket presentasi menggunakan Dinkes dan topik Prevalensi Stunting.
UPDATE sababuka.categories
SET name = '[DEMO PRESENTASI] Prevalensi stunting',
    description = 'DEMO_PACKAGE=DEMO_PRESENTATION; simulasi alur UPR, BAPPERIDA, Dinkes, dan Dashboard Pimpinan menggunakan sumber resmi.',
    updated_at = now()
WHERE code = 'DEMO_PRESENTATION_CATEGORY';

UPDATE sababuka.indicators i
SET name = '[DEMO PRESENTASI] Prevalensi stunting',
    owner_organization_id = (SELECT id FROM sababuka.organizations WHERE code = 'DINKES'),
    updated_at = now()
WHERE i.code = 'DEMO_PRESENTATION_INDICATOR';

UPDATE sababuka.indicator_versions iv
SET definition = 'Persentase balita yang mengalami stunting di Kabupaten Kapuas berdasarkan sumber resmi yang telah ditelusuri.',
    source_reference = 'Kementerian Kesehatan — Survei Kesehatan Indonesia 2023',
    change_notes = 'Sumber demo: Kementerian Kesehatan — Survei Kesehatan Indonesia 2023. Angka dan status tetap menunggu alur persetujuan.',
    updated_at = now()
FROM sababuka.indicators i
WHERE iv.indicator_id = i.id AND i.code = 'DEMO_PRESENTATION_INDICATOR' AND iv.version_number = 1;

DELETE FROM sababuka.indicator_organizations io
USING sababuka.indicator_versions iv, sababuka.indicators i
WHERE io.indicator_version_id = iv.id AND iv.indicator_id = i.id
  AND i.code = 'DEMO_PRESENTATION_INDICATOR' AND iv.version_number = 1;

INSERT INTO sababuka.indicator_organizations (indicator_version_id, organization_id, responsibility, is_primary)
SELECT iv.id, o.id, 'primary_producer', true
FROM sababuka.indicator_versions iv
JOIN sababuka.indicators i ON i.id = iv.indicator_id
JOIN sababuka.organizations o ON o.code = 'DINKES'
WHERE i.code = 'DEMO_PRESENTATION_INDICATOR' AND iv.version_number = 1
ON CONFLICT (indicator_version_id, organization_id, responsibility) DO UPDATE SET is_primary = true;

INSERT INTO sababuka.indicator_source_audits
  (indicator_version_id, audit_status, source_name, source_url, source_period, notes)
SELECT iv.id, 'verified_direct', 'Kementerian Kesehatan — Survei Kesehatan Indonesia 2023',
       'https://kemkes.go.id/app_asset/file_content_download/17169067256655eae5553985.98376730.pdf',
       '2023', 'Angka 16,2 persen untuk demonstrasi alur; Dinkes tetap mengonfirmasi sumber saat verifikasi teknis.'
FROM sababuka.indicator_versions iv
JOIN sababuka.indicators i ON i.id = iv.indicator_id
WHERE i.code = 'DEMO_PRESENTATION_INDICATOR' AND iv.version_number = 1
ON CONFLICT (indicator_version_id, source_name, source_period)
DO UPDATE SET audit_status = EXCLUDED.audit_status, source_url = EXCLUDED.source_url, notes = EXCLUDED.notes, retrieved_at = now();

INSERT INTO sababuka.periods (period_type, code, label, starts_on, ends_on)
VALUES ('annual', '2023', 'Tahun 2023', DATE '2023-01-01', DATE '2023-12-31')
ON CONFLICT (code) DO NOTHING;

-- Nilai resmi dipra-siapkan sebagai bahan demo. Publikasi baru dibuat otomatis
-- ketika indikator melewati seluruh alur dan diaktifkan BAPPERIDA.
WITH ctx AS (
  SELECT
    (SELECT id FROM sababuka.users WHERE email = 'developer@sababuka.com' LIMIT 1) AS actor_id,
    (SELECT id FROM sababuka.organizations WHERE code = 'DINKES' LIMIT 1) AS organization_id,
    (SELECT id FROM sababuka.datasets WHERE code = 'SABABUKA.CAPAIAN_MANUAL' LIMIT 1) AS dataset_id,
    (SELECT id FROM sababuka.periods WHERE code = '2023' LIMIT 1) AS period_id
), dv AS (
  SELECT dataset_versions.id AS id FROM sababuka.dataset_versions
  JOIN ctx ON dataset_versions.dataset_id = ctx.dataset_id
  WHERE dataset_versions.version_number = 1 LIMIT 1
), iv AS (
  SELECT indicator_versions.id AS id FROM sababuka.indicator_versions
  JOIN sababuka.indicators ON indicators.id = indicator_versions.indicator_id
  WHERE indicators.code = 'DEMO_PRESENTATION_INDICATOR' AND indicator_versions.version_number = 1 LIMIT 1
), batch AS (
  INSERT INTO sababuka.data_batches
    (dataset_version_id, organization_id, reporting_period_id, submission_method, source_metadata,
     row_count, status, submitted_by, submitted_at, approved_by, approved_at, created_by)
  SELECT dv.id, ctx.organization_id, ctx.period_id, 'api_import',
         '{"demo":true,"source":"Kementerian Kesehatan — SKI 2023","import_key":"DEMO_PREVALENSI_STUNTING_2023"}'::jsonb,
         0, 'approved', ctx.actor_id, now(), ctx.actor_id, now(), ctx.actor_id
  FROM ctx CROSS JOIN dv
  WHERE NOT EXISTS (
    SELECT 1 FROM sababuka.data_batches
    WHERE source_metadata->>'import_key' = 'DEMO_PREVALENSI_STUNTING_2023'
  )
  RETURNING id
)
INSERT INTO sababuka.observations
  (batch_id, indicator_version_id, period_id, numeric_value, quality_status, notes, created_by,
   source_name, source_url, source_status, source_retrieved_at)
SELECT COALESCE((SELECT id FROM batch LIMIT 1),
                (SELECT id FROM sababuka.data_batches WHERE source_metadata->>'import_key' = 'DEMO_PREVALENSI_STUNTING_2023' LIMIT 1)),
       iv.id, ctx.period_id, 16.2, 'valid',
       'Nilai demo berasal dari Tabel 15.21 Survei Kesehatan Indonesia 2023; dipakai untuk simulasi alur, bukan angka baru.',
       ctx.actor_id, 'Kementerian Kesehatan — Survei Kesehatan Indonesia 2023',
       'https://kemkes.go.id/app_asset/file_content_download/17169067256655eae5553985.98376730.pdf',
       'verified_direct', now()
FROM ctx CROSS JOIN iv
WHERE ctx.actor_id IS NOT NULL AND iv.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sababuka.observations o
    WHERE o.indicator_version_id = iv.id AND o.period_id = ctx.period_id
  );

UPDATE sababuka.data_batches b
SET row_count = (SELECT count(*)::int FROM sababuka.observations o WHERE o.batch_id = b.id), updated_at = now()
WHERE b.source_metadata->>'import_key' = 'DEMO_PREVALENSI_STUNTING_2023';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('029', 'demo Dinkes Prevalensi Stunting workflow')
ON CONFLICT (version) DO NOTHING;

COMMIT;
