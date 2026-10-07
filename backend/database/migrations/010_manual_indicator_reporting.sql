BEGIN;

ALTER TABLE sababuka.data_batches
    ADD COLUMN IF NOT EXISTS reporting_period_id uuid REFERENCES sababuka.periods(id);

CREATE INDEX IF NOT EXISTS data_batches_reporting_period_idx
    ON sababuka.data_batches(reporting_period_id);

CREATE UNIQUE INDEX IF NOT EXISTS data_batches_manual_period_unique_idx
    ON sababuka.data_batches(dataset_version_id, organization_id, reporting_period_id)
    WHERE submission_method = 'manual' AND status <> 'cancelled' AND reporting_period_id IS NOT NULL;

INSERT INTO sababuka.metadata_profiles
    (code, name, version_number, description, schema_json, mapping_json, status)
VALUES
    ('SABABUKA_MANUAL_INPUT', 'Input Capaian Indikator SABABUKA', 1,
     'Profil sistem untuk formulir capaian indikator yang diisi langsung oleh OPD.',
     '{"type":"object","required":["indicator_version_id","period_id","value"]}'::jsonb,
     '{"indicator":"indicator_version_id","period":"period_id","value":"value"}'::jsonb,
     'draft')
ON CONFLICT (code, version_number) DO NOTHING;

INSERT INTO sababuka.data_sources (code, name, source_type, connection_config)
VALUES ('SABABUKA_MANUAL', 'Formulir Capaian Indikator SABABUKA', 'manual', '{}'::jsonb)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO sababuka.datasets (code, title, owner_organization_id, source_id)
SELECT 'SABABUKA.CAPAIAN_MANUAL', 'Capaian Indikator Manual SABABUKA', organization.id, source.id
FROM sababuka.organizations organization
JOIN sababuka.data_sources source ON source.code = 'SABABUKA_MANUAL'
WHERE organization.code = 'BAPPERIDA'
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, is_active = true;

INSERT INTO sababuka.dataset_versions
    (dataset_id, version_number, name, title, organization_id, visibility,
     metadata_profile_id, metadata_json, effective_from, status)
SELECT dataset.id, 1, 'sababuka-capaian-manual', 'Capaian Indikator Manual SABABUKA',
       dataset.owner_organization_id, 'internal', profile.id,
       '{"managed_by_system":true,"input_mode":"manual_indicator_realization"}'::jsonb,
       DATE '2025-01-01', 'draft'
FROM sababuka.datasets dataset
JOIN sababuka.metadata_profiles profile
  ON profile.code = 'SABABUKA_MANUAL_INPUT' AND profile.version_number = 1
WHERE dataset.code = 'SABABUKA.CAPAIAN_MANUAL'
ON CONFLICT (dataset_id, version_number) DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('010', 'manual indicator reporting batches and system dataset')
ON CONFLICT (version) DO NOTHING;

COMMIT;
