BEGIN;

-- Disbudparpora disebut sebagai penanggung jawab pada Matrix RPJMD, tetapi
-- tidak terdapat pada lampiran 28 perangkat daerah yang menjadi sumber
-- migration 014. Entitas ini tetap diperlukan agar seluruh indikator RPJMD
-- memiliki OPD utama dan dapat mengikuti workflow verifikasi teknis.
INSERT INTO sababuka.organizations
    (code, name, short_name, organization_type, metadata)
VALUES
    (
        'DISBUDPARPORA',
        'Dinas Kebudayaan, Pariwisata, Kepemudaan dan Olahraga',
        'Disbudparpora',
        'opd',
        jsonb_build_object(
            'directory', 'matrix_rpjmd_2025_2029',
            'inclusion_basis', 'penanggung jawab indikator RPJMD',
            'official_code_status', 'menunggu konfirmasi BAPPERIDA/OPD'
        )
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    organization_type = EXCLUDED.organization_type,
    metadata = sababuka.organizations.metadata || EXCLUDED.metadata,
    is_active = true,
    archived_at = NULL,
    updated_at = now();

UPDATE sababuka.indicators indicator
SET owner_organization_id = organization.id,
    updated_at = now()
FROM sababuka.organizations organization
WHERE organization.code = 'DISBUDPARPORA'
  AND indicator.code IN (
      'RPJMD_I022_PAD_SEKTOR_PARIWISATA',
      'RPJMD_I023_RASIO_PDRB_PENYEDIAAN_AKOMODASI_DAN_MAKAN_MINUM',
      'RPJMD_I061_INDEKS_PEMBANGUNAN_KEBUDAYAAN_IPK'
  );

INSERT INTO sababuka.indicator_organizations
    (indicator_version_id, organization_id, responsibility, is_primary)
SELECT version.id, organization.id, 'primary_producer', true
FROM sababuka.indicator_versions version
JOIN sababuka.indicators indicator ON indicator.id = version.indicator_id
JOIN sababuka.organizations organization ON organization.code = 'DISBUDPARPORA'
WHERE indicator.code IN (
    'RPJMD_I022_PAD_SEKTOR_PARIWISATA',
    'RPJMD_I023_RASIO_PDRB_PENYEDIAAN_AKOMODASI_DAN_MAKAN_MINUM',
    'RPJMD_I061_INDEKS_PEMBANGUNAN_KEBUDAYAAN_IPK'
)
AND NOT EXISTS (
    SELECT 1
    FROM sababuka.indicator_organizations existing
    WHERE existing.indicator_version_id = version.id
      AND existing.is_primary = true
)
ON CONFLICT DO NOTHING;

UPDATE sababuka.indicator_versions version
SET dimension_schema = version.dimension_schema || jsonb_build_object(
        'owner_organization_code', 'DISBUDPARPORA',
        'owner_mapping_basis', 'Matrix RPJMD Kabupaten Kapuas 2025-2029'
    ),
    updated_at = now()
FROM sababuka.indicators indicator
WHERE version.indicator_id = indicator.id
  AND indicator.code IN (
      'RPJMD_I022_PAD_SEKTOR_PARIWISATA',
      'RPJMD_I023_RASIO_PDRB_PENYEDIAAN_AKOMODASI_DAN_MAKAN_MINUM',
      'RPJMD_I061_INDEKS_PEMBANGUNAN_KEBUDAYAAN_IPK'
  );

-- Hentikan migration jika katalog baseline RPJMD tidak lagi lengkap. Angka
-- ini berasal dari resume Matrix RPJMD: 8 fokus, 29 kelompok isu, 69 indikator.
DO $$
DECLARE
    focus_count integer;
    category_count integer;
    indicator_count integer;
    unassigned_indicator_count integer;
BEGIN
    SELECT count(*) INTO focus_count
    FROM sababuka.policy_focuses
    WHERE code ~ '^RPJMD_F[1-8]$' AND is_active = true;

    SELECT count(*) INTO category_count
    FROM sababuka.categories
    WHERE code ~ '^RPJMD_[1-8]_[1-4]$' AND is_active = true;

    SELECT count(*) INTO indicator_count
    FROM sababuka.indicators indicator
    JOIN sababuka.categories category ON category.id = indicator.category_id
    WHERE category.code ~ '^RPJMD_[1-8]_[1-4]$'
      AND indicator.is_active = true;

    SELECT count(*) INTO unassigned_indicator_count
    FROM sababuka.indicators indicator
    JOIN sababuka.categories category ON category.id = indicator.category_id
    WHERE category.code ~ '^RPJMD_[1-8]_[1-4]$'
      AND indicator.is_active = true
      AND indicator.owner_organization_id IS NULL;

    IF focus_count <> 8 OR category_count <> 29 OR indicator_count <> 69
       OR unassigned_indicator_count <> 0 THEN
        RAISE EXCEPTION
            'Baseline RPJMD tidak lengkap: fokus %, kategori %, indikator %, tanpa OPD %',
            focus_count, category_count, indicator_count, unassigned_indicator_count;
    END IF;
END $$;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('030', 'complete RPJMD organization ownership including Disbudparpora')
ON CONFLICT (version) DO NOTHING;

COMMIT;
