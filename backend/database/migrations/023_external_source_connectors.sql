BEGIN;

CREATE TABLE sababuka.indicator_source_mappings (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_version_id     uuid NOT NULL REFERENCES sababuka.indicator_versions(id) ON DELETE CASCADE,
    source_id                uuid NOT NULL REFERENCES sababuka.data_sources(id),
    dataset_version_id       uuid REFERENCES sababuka.dataset_versions(id),
    external_dataset_id      varchar(255) NOT NULL,
    external_resource_id     varchar(255),
    external_table_id        varchar(255),
    external_variable_id     varchar(255),
    resource_url              text,
    geography_field          varchar(160),
    geography_code           varchar(80) NOT NULL DEFAULT '6203',
    year_field                varchar(160) NOT NULL,
    value_field              varchar(160) NOT NULL,
    unit_field                varchar(160),
    expected_unit             varchar(160),
    frequency                 varchar(16) NOT NULL DEFAULT 'annual',
    transform_json            jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_priority           integer NOT NULL DEFAULT 100,
    relation_type             varchar(24) NOT NULL DEFAULT 'primary',
    effective_from            date NOT NULL DEFAULT DATE '2025-01-01',
    effective_until           date,
    status                    varchar(24) NOT NULL DEFAULT 'draft',
    created_by                uuid REFERENCES sababuka.users(id),
    approved_by               uuid REFERENCES sababuka.users(id),
    approved_at               timestamptz,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT indicator_source_mappings_frequency_check CHECK (frequency = 'annual'),
    CONSTRAINT indicator_source_mappings_relation_check CHECK (relation_type IN ('primary', 'supporting', 'comparison')),
    CONSTRAINT indicator_source_mappings_status_check CHECK (status IN ('draft', 'approved', 'active', 'retired')),
    CONSTRAINT indicator_source_mappings_transform_object CHECK (jsonb_typeof(transform_json) = 'object'),
    CONSTRAINT indicator_source_mappings_dates_check CHECK (effective_until IS NULL OR effective_until >= effective_from),
    CONSTRAINT indicator_source_mappings_approval_check CHECK (
      (status IN ('approved', 'active', 'retired') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
      OR status = 'draft'
    )
);
CREATE INDEX indicator_source_mappings_indicator_idx ON sababuka.indicator_source_mappings(indicator_version_id, status);
CREATE INDEX indicator_source_mappings_source_idx ON sababuka.indicator_source_mappings(source_id, external_dataset_id);
CREATE UNIQUE INDEX indicator_source_mappings_unique_idx ON sababuka.indicator_source_mappings(
  indicator_version_id, source_id, external_dataset_id, COALESCE(external_resource_id, ''), effective_from
);

CREATE TABLE sababuka.connector_runs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mapping_id          uuid NOT NULL REFERENCES sababuka.indicator_source_mappings(id) ON DELETE CASCADE,
    source_id           uuid NOT NULL REFERENCES sababuka.data_sources(id),
    status              varchar(24) NOT NULL DEFAULT 'fetched',
    dry_run             boolean NOT NULL DEFAULT true,
    source_url          text,
    source_identifier   varchar(255),
    response_checksum   varchar(64),
    fetched_at          timestamptz,
    preview_json        jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_text          text,
    approved_by         uuid REFERENCES sababuka.users(id),
    approved_at         timestamptz,
    imported_batch_id   uuid REFERENCES sababuka.data_batches(id),
    created_by          uuid REFERENCES sababuka.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT connector_runs_status_check CHECK (status IN ('fetched', 'validated', 'ready', 'imported', 'failed')),
    CONSTRAINT connector_runs_preview_object CHECK (jsonb_typeof(preview_json) = 'object')
);
CREATE INDEX connector_runs_mapping_idx ON sababuka.connector_runs(mapping_id, created_at DESC);

CREATE TABLE sababuka.connector_staging_values (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              uuid NOT NULL REFERENCES sababuka.connector_runs(id) ON DELETE CASCADE,
    mapping_id          uuid NOT NULL REFERENCES sababuka.indicator_source_mappings(id) ON DELETE CASCADE,
    year                integer NOT NULL,
    geography_code      varchar(80) NOT NULL,
    numeric_value       numeric,
    text_value          text,
    unit_value          varchar(160),
    raw_data             jsonb NOT NULL DEFAULT '{}'::jsonb,
    row_checksum        varchar(64) NOT NULL,
    validation_status   varchar(24) NOT NULL DEFAULT 'valid',
    validation_errors   jsonb NOT NULL DEFAULT '[]'::jsonb,
    source_url           text,
    source_retrieved_at timestamptz,
    created_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT connector_staging_year_check CHECK (year BETWEEN 2025 AND 2029),
    CONSTRAINT connector_staging_value_check CHECK (num_nonnulls(numeric_value, text_value) = 1),
    CONSTRAINT connector_staging_validation_check CHECK (validation_status IN ('valid', 'invalid', 'duplicate')),
    CONSTRAINT connector_staging_raw_object CHECK (jsonb_typeof(raw_data) = 'object'),
    CONSTRAINT connector_staging_errors_array CHECK (jsonb_typeof(validation_errors) = 'array'),
    CONSTRAINT connector_staging_unique_row UNIQUE (run_id, year, geography_code, row_checksum)
);
CREATE INDEX connector_staging_run_idx ON sababuka.connector_staging_values(run_id, validation_status, year);

INSERT INTO sababuka.metadata_profiles (code, name, version_number, description, schema_json, mapping_json, status, created_by, approved_by, approved_at)
SELECT 'CONNECTOR_TABULAR_ANNUAL', 'Connector tabel tahunan', 1,
  'Profil internal untuk data tahunan dari konektor eksternal.',
  '{"year":"integer","geography":"string","value":"number|string","unit":"string"}'::jsonb,
  '{"frequency":"annual","allowed_years":[2025,2026,2027,2028,2029]}'::jsonb,
  'active', u.id, u.id, now()
FROM sababuka.users u WHERE u.email = 'superadmin@sababuka.local'
ON CONFLICT (code, version_number) DO UPDATE SET schema_json = EXCLUDED.schema_json,
  mapping_json = EXCLUDED.mapping_json, status = 'active', approved_by = EXCLUDED.approved_by,
  approved_at = EXCLUDED.approved_at, updated_at = now();

INSERT INTO sababuka.data_sources (code, name, source_type, base_url, connection_config, credential_reference, owner_organization_id, created_by)
SELECT x.code, x.name, x.source_type, x.base_url, x.config::jsonb, x.credential_reference, o.id, u.id
FROM (VALUES
  ('SATUDATA_KAPUAS', 'Satu Data Kabupaten Kapuas', 'ckan', 'https://satudata.kapuaskab.go.id', '{"catalog_api":"/api/3/action","site_status_action":"status_show"}', NULL),
  ('BPS_KAPUAS', 'BPS WebAPI Kabupaten Kapuas', 'bps', 'https://webapi.bps.go.id/v1/api', '{"domain_code":"6203","frequency":"annual","years":[2025,2026,2027,2028,2029]}', 'BPS_API_KEY')
) AS x(code, name, source_type, base_url, config, credential_reference)
JOIN sababuka.organizations o ON o.code = 'KAPUAS'
LEFT JOIN sababuka.users u ON u.email = 'superadmin@sababuka.local'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, source_type = EXCLUDED.source_type,
  base_url = EXCLUDED.base_url, connection_config = EXCLUDED.connection_config,
  credential_reference = EXCLUDED.credential_reference, is_active = true, updated_at = now();

INSERT INTO sababuka.permissions (code, name, risk_level) VALUES
  ('connector.view', 'Lihat konektor sumber data', 'normal'),
  ('connector.manage', 'Kelola mapping dan sinkronisasi sumber data', 'critical')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM sababuka.roles r CROSS JOIN sababuka.permissions p
WHERE r.code IN ('superadmin', 'bapperida') AND p.code IN ('connector.view', 'connector.manage')
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.menu_items (code, label, icon, route_name, required_permission, display_order)
VALUES ('connectors', 'Sumber Data', 'plug', '/connectors', 'connector.view', 75)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon,
  route_name = EXCLUDED.route_name, required_permission = EXCLUDED.required_permission,
  display_order = EXCLUDED.display_order;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, m.display_order FROM sababuka.roles r JOIN sababuka.menu_items m ON m.code = 'connectors'
WHERE r.code IN ('superadmin', 'bapperida') ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('023', 'external source connectors, explicit mappings, staging, and annual sync')
ON CONFLICT (version) DO NOTHING;

COMMIT;
