BEGIN;

CREATE TABLE sababuka.metadata_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            varchar(64) NOT NULL,
    name            varchar(160) NOT NULL,
    version_number  integer NOT NULL,
    description     text,
    schema_json     jsonb NOT NULL,
    mapping_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
    status          varchar(20) NOT NULL DEFAULT 'draft',
    created_by      uuid REFERENCES sababuka.users(id),
    approved_by     uuid REFERENCES sababuka.users(id),
    approved_at     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT metadata_profiles_unique UNIQUE (code, version_number),
    CONSTRAINT metadata_profiles_version_positive CHECK (version_number > 0),
    CONSTRAINT metadata_profiles_status_check CHECK (status IN ('draft', 'active', 'retired')),
    CONSTRAINT metadata_profiles_schema_object CHECK (jsonb_typeof(schema_json) = 'object'),
    CONSTRAINT metadata_profiles_mapping_object CHECK (jsonb_typeof(mapping_json) = 'object'),
    CONSTRAINT metadata_profiles_approval_check CHECK (
        (status IN ('active', 'retired') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        OR status = 'draft'
    )
);

CREATE UNIQUE INDEX metadata_profiles_one_active_idx
    ON sababuka.metadata_profiles(code)
    WHERE status = 'active';

CREATE TABLE sababuka.data_sources (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    varchar(64) NOT NULL UNIQUE,
    name                    varchar(255) NOT NULL,
    source_type             varchar(32) NOT NULL,
    base_url                text,
    owner_organization_id   uuid REFERENCES sababuka.organizations(id),
    connection_config       jsonb NOT NULL DEFAULT '{}'::jsonb,
    credential_reference    varchar(255),
    is_active               boolean NOT NULL DEFAULT true,
    last_checked_at         timestamptz,
    created_by              uuid REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT data_sources_type_check CHECK (source_type IN ('manual', 'file', 'ckan', 'api', 'database_view', 'bps', 'other')),
    CONSTRAINT data_sources_config_object CHECK (jsonb_typeof(connection_config) = 'object'),
    CONSTRAINT data_sources_no_inline_secrets CHECK (
        NOT (connection_config ?| ARRAY['password', 'secret', 'token', 'api_key', 'private_key'])
    )
);

CREATE INDEX data_sources_owner_idx ON sababuka.data_sources(owner_organization_id);

CREATE TABLE sababuka.datasets (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    varchar(80) NOT NULL UNIQUE,
    title                   varchar(500) NOT NULL,
    owner_organization_id   uuid NOT NULL REFERENCES sababuka.organizations(id),
    source_id               uuid NOT NULL REFERENCES sababuka.data_sources(id),
    is_active               boolean NOT NULL DEFAULT true,
    archived_at             timestamptz,
    created_by              uuid REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT datasets_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]*$')
);

CREATE INDEX datasets_owner_idx ON sababuka.datasets(owner_organization_id);
CREATE INDEX datasets_source_idx ON sababuka.datasets(source_id);

CREATE TABLE sababuka.dataset_versions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id              uuid NOT NULL REFERENCES sababuka.datasets(id),
    version_number          integer NOT NULL,
    ckan_package_id         varchar(255),
    name                    varchar(255) NOT NULL,
    title                   varchar(500) NOT NULL,
    notes                   text,
    organization_id         uuid NOT NULL REFERENCES sababuka.organizations(id),
    author                  varchar(255),
    maintainer              varchar(255),
    license_id              varchar(120),
    visibility              varchar(24) NOT NULL DEFAULT 'internal',
    ckan_state              varchar(24) NOT NULL DEFAULT 'active',
    metadata_profile_id     uuid NOT NULL REFERENCES sababuka.metadata_profiles(id),
    metadata_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
    effective_from          date NOT NULL,
    effective_until         date,
    status                  varchar(24) NOT NULL DEFAULT 'draft',
    source_modified_at      timestamptz,
    submitted_by            uuid REFERENCES sababuka.users(id),
    submitted_at            timestamptz,
    approved_by             uuid REFERENCES sababuka.users(id),
    approved_at             timestamptz,
    created_by              uuid REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dataset_versions_unique UNIQUE (dataset_id, version_number),
    CONSTRAINT dataset_versions_name_unique UNIQUE (name, version_number),
    CONSTRAINT dataset_versions_version_positive CHECK (version_number > 0),
    CONSTRAINT dataset_versions_visibility_check CHECK (visibility IN ('public', 'internal', 'restricted')),
    CONSTRAINT dataset_versions_state_check CHECK (ckan_state IN ('active', 'deleted')),
    CONSTRAINT dataset_versions_status_check CHECK (status IN ('draft', 'in_review', 'approved', 'active', 'retired')),
    CONSTRAINT dataset_versions_dates_check CHECK (effective_until IS NULL OR effective_until >= effective_from),
    CONSTRAINT dataset_versions_metadata_object CHECK (jsonb_typeof(metadata_json) = 'object'),
    CONSTRAINT dataset_versions_approval_check CHECK (
        (status IN ('approved', 'active', 'retired') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        OR status IN ('draft', 'in_review')
    )
);

CREATE INDEX dataset_versions_dataset_idx ON sababuka.dataset_versions(dataset_id, version_number DESC);
CREATE INDEX dataset_versions_org_idx ON sababuka.dataset_versions(organization_id);
CREATE INDEX dataset_versions_status_idx ON sababuka.dataset_versions(status);
CREATE INDEX dataset_versions_metadata_gin_idx ON sababuka.dataset_versions USING gin(metadata_json);
CREATE UNIQUE INDEX dataset_versions_one_active_idx
    ON sababuka.dataset_versions(dataset_id)
    WHERE status = 'active';

CREATE TABLE sababuka.data_resources (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_version_id  uuid NOT NULL REFERENCES sababuka.dataset_versions(id) ON DELETE CASCADE,
    external_id         varchar(255),
    name                varchar(500) NOT NULL,
    description         text,
    format              varchar(40),
    mime_type           varchar(160),
    url                 text,
    storage_path        text,
    file_size           bigint,
    checksum_sha256     varchar(64),
    source_modified_at  timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT data_resources_location_check CHECK (num_nonnulls(url, storage_path) >= 1),
    CONSTRAINT data_resources_file_size_check CHECK (file_size IS NULL OR file_size >= 0),
    CONSTRAINT data_resources_checksum_format CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE INDEX data_resources_dataset_idx ON sababuka.data_resources(dataset_version_id);
CREATE UNIQUE INDEX data_resources_external_unique_idx
    ON sababuka.data_resources(dataset_version_id, external_id)
    WHERE external_id IS NOT NULL;

CREATE TABLE sababuka.indicator_datasets (
    indicator_version_id    uuid NOT NULL REFERENCES sababuka.indicator_versions(id) ON DELETE CASCADE,
    dataset_version_id      uuid NOT NULL REFERENCES sababuka.dataset_versions(id) ON DELETE CASCADE,
    relation_type           varchar(24) NOT NULL DEFAULT 'primary',
    field_mapping           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at              timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (indicator_version_id, dataset_version_id),
    CONSTRAINT indicator_datasets_relation_check CHECK (relation_type IN ('primary', 'supporting', 'comparison')),
    CONSTRAINT indicator_datasets_mapping_object CHECK (jsonb_typeof(field_mapping) = 'object')
);

CREATE INDEX indicator_datasets_dataset_idx ON sababuka.indicator_datasets(dataset_version_id);

CREATE TABLE sababuka.data_batches (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_version_id      uuid NOT NULL REFERENCES sababuka.dataset_versions(id),
    organization_id         uuid NOT NULL REFERENCES sababuka.organizations(id),
    submission_method       varchar(24) NOT NULL,
    source_filename         varchar(500),
    source_checksum_sha256  varchar(64),
    source_metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    row_count               integer NOT NULL DEFAULT 0,
    status                  varchar(24) NOT NULL DEFAULT 'draft',
    submitted_by            uuid REFERENCES sababuka.users(id),
    submitted_at            timestamptz,
    confirmed_by            uuid REFERENCES sababuka.users(id),
    confirmed_at            timestamptz,
    approved_by             uuid REFERENCES sababuka.users(id),
    approved_at             timestamptz,
    created_by              uuid NOT NULL REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT data_batches_method_check CHECK (submission_method IN ('manual', 'csv', 'xlsx', 'ckan_import', 'api_import')),
    CONSTRAINT data_batches_status_check CHECK (status IN (
        'draft', 'validating', 'ready', 'submitted', 'opd_confirmed',
        'under_review', 'returned', 'approved', 'published', 'cancelled'
    )),
    CONSTRAINT data_batches_row_count_check CHECK (row_count >= 0),
    CONSTRAINT data_batches_checksum_format CHECK (source_checksum_sha256 IS NULL OR source_checksum_sha256 ~ '^[a-f0-9]{64}$'),
    CONSTRAINT data_batches_metadata_object CHECK (jsonb_typeof(source_metadata) = 'object')
);

CREATE INDEX data_batches_dataset_idx ON sababuka.data_batches(dataset_version_id);
CREATE INDEX data_batches_org_status_idx ON sababuka.data_batches(organization_id, status);
CREATE INDEX data_batches_created_idx ON sababuka.data_batches(created_at DESC);

CREATE TABLE sababuka.observations (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id                uuid NOT NULL REFERENCES sababuka.data_batches(id),
    indicator_version_id    uuid NOT NULL REFERENCES sababuka.indicator_versions(id),
    period_id               uuid NOT NULL REFERENCES sababuka.periods(id),
    geography_id            uuid REFERENCES sababuka.geographies(id),
    dimension_values        jsonb NOT NULL DEFAULT '{}'::jsonb,
    dimension_hash          bytea GENERATED ALWAYS AS (digest(dimension_values::text, 'sha256')) STORED,
    numeric_value           numeric(30,10),
    text_value              text,
    quality_status          varchar(24) NOT NULL DEFAULT 'unchecked',
    revision_number         integer NOT NULL DEFAULT 1,
    supersedes_id           uuid REFERENCES sababuka.observations(id),
    notes                   text,
    created_by              uuid NOT NULL REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT observations_value_check CHECK (num_nonnulls(numeric_value, text_value) = 1),
    CONSTRAINT observations_dimensions_object CHECK (jsonb_typeof(dimension_values) = 'object'),
    CONSTRAINT observations_quality_check CHECK (quality_status IN ('unchecked', 'valid', 'warning', 'invalid')),
    CONSTRAINT observations_revision_positive CHECK (revision_number > 0),
    CONSTRAINT observations_not_own_parent CHECK (supersedes_id IS NULL OR supersedes_id <> id)
);

CREATE UNIQUE INDEX observations_batch_business_key_idx
    ON sababuka.observations(batch_id, indicator_version_id, period_id, geography_id, dimension_hash)
    NULLS NOT DISTINCT;
CREATE UNIQUE INDEX observations_revision_lineage_idx
    ON sababuka.observations(supersedes_id, revision_number)
    WHERE supersedes_id IS NOT NULL;
CREATE INDEX observations_indicator_period_idx ON sababuka.observations(indicator_version_id, period_id);
CREATE INDEX observations_geography_idx ON sababuka.observations(geography_id);
CREATE INDEX observations_dimensions_gin_idx ON sababuka.observations USING gin(dimension_values);

CREATE TABLE sababuka.validation_issues (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        uuid NOT NULL REFERENCES sababuka.data_batches(id) ON DELETE CASCADE,
    observation_id  uuid REFERENCES sababuka.observations(id) ON DELETE CASCADE,
    rule_code       varchar(96) NOT NULL,
    severity        varchar(16) NOT NULL,
    field_name      varchar(120),
    message         text NOT NULL,
    details         jsonb NOT NULL DEFAULT '{}'::jsonb,
    status          varchar(16) NOT NULL DEFAULT 'open',
    resolved_by     uuid REFERENCES sababuka.users(id),
    resolved_at     timestamptz,
    resolution_note text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT validation_issues_severity_check CHECK (severity IN ('error', 'warning', 'info')),
    CONSTRAINT validation_issues_status_check CHECK (status IN ('open', 'resolved', 'accepted')),
    CONSTRAINT validation_issues_details_object CHECK (jsonb_typeof(details) = 'object'),
    CONSTRAINT validation_issues_resolution_check CHECK (
        (status = 'open' AND resolved_at IS NULL)
        OR (status IN ('resolved', 'accepted') AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
    )
);

CREATE INDEX validation_issues_batch_status_idx ON sababuka.validation_issues(batch_id, status, severity);
CREATE INDEX validation_issues_observation_idx ON sababuka.validation_issues(observation_id);

CREATE TRIGGER metadata_profiles_set_updated_at
BEFORE UPDATE ON sababuka.metadata_profiles
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER data_sources_set_updated_at
BEFORE UPDATE ON sababuka.data_sources
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER datasets_set_updated_at
BEFORE UPDATE ON sababuka.datasets
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER dataset_versions_set_updated_at
BEFORE UPDATE ON sababuka.dataset_versions
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER data_resources_set_updated_at
BEFORE UPDATE ON sababuka.data_resources
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER data_batches_set_updated_at
BEFORE UPDATE ON sababuka.data_batches
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('004', 'dataset catalog, metadata, batches, observations, and validation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
