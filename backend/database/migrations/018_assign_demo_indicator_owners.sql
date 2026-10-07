BEGIN;

-- These three RPJMD indicators did not have an owner in the source matrix.
-- Use the closest official Kapuas directory owner so the draft can enter
-- the normal BAPPERIDA -> OPD verification flow. The forum can reassign them.
UPDATE sababuka.indicators AS i
SET owner_organization_id = o.id,
    updated_at = now()
FROM sababuka.organizations AS o
WHERE (i.code, o.code) IN (
    ('RPJMD_I022_PAD_SEKTOR_PARIWISATA', 'BAPENDA'),
    ('RPJMD_I023_RASIO_PDRB_PENYEDIAAN_AKOMODASI_DAN_MAKAN_MINUM', 'DISPERINDAGKOPUKM'),
    ('RPJMD_I061_INDEKS_PEMBANGUNAN_KEBUDAYAAN_IPK', 'DISDIK')
);

INSERT INTO sababuka.indicator_organizations
    (indicator_version_id, organization_id, responsibility, is_primary)
SELECT iv.id, i.owner_organization_id, 'primary_producer', true
FROM sababuka.indicators AS i
JOIN sababuka.indicator_versions AS iv ON iv.indicator_id = i.id
WHERE i.code IN (
    'RPJMD_I022_PAD_SEKTOR_PARIWISATA',
    'RPJMD_I023_RASIO_PDRB_PENYEDIAAN_AKOMODASI_DAN_MAKAN_MINUM',
    'RPJMD_I061_INDEKS_PEMBANGUNAN_KEBUDAYAAN_IPK'
)
  AND i.owner_organization_id IS NOT NULL
ON CONFLICT (indicator_version_id, organization_id, responsibility)
DO UPDATE SET is_primary = EXCLUDED.is_primary;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('018', 'assign defensible owners to three pilot RPJMD indicators')
ON CONFLICT (version) DO NOTHING;

COMMIT;
