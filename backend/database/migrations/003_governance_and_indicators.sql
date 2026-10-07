BEGIN;

CREATE TABLE sababuka.policy_focuses (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            varchar(64) NOT NULL UNIQUE,
    name            varchar(255) NOT NULL,
    description     text,
    display_order   integer NOT NULL DEFAULT 0,
    is_active       boolean NOT NULL DEFAULT true,
    archived_at     timestamptz,
    created_by      uuid REFERENCES sababuka.users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT policy_focuses_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]*$')
);

CREATE TABLE sababuka.categories (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                varchar(64) NOT NULL UNIQUE,
    name                varchar(255) NOT NULL,
    description         text,
    policy_focus_id     uuid REFERENCES sababuka.policy_focuses(id),
    parent_id           uuid REFERENCES sababuka.categories(id),
    display_order       integer NOT NULL DEFAULT 0,
    is_active           boolean NOT NULL DEFAULT true,
    archived_at         timestamptz,
    created_by          uuid REFERENCES sababuka.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT categories_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]*$'),
    CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX categories_focus_idx ON sababuka.categories(policy_focus_id, display_order);
CREATE INDEX categories_parent_idx ON sababuka.categories(parent_id, display_order);

CREATE TABLE sababuka.units (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            varchar(40) NOT NULL UNIQUE,
    name            varchar(120) NOT NULL,
    symbol          varchar(32),
    description     text,
    decimal_places  smallint NOT NULL DEFAULT 2,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT units_decimal_places_check CHECK (decimal_places BETWEEN 0 AND 10)
);

CREATE TABLE sababuka.periods (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type     varchar(24) NOT NULL,
    code            varchar(40) NOT NULL UNIQUE,
    label           varchar(120) NOT NULL,
    starts_on       date NOT NULL,
    ends_on         date NOT NULL,
    parent_id       uuid REFERENCES sababuka.periods(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT periods_type_check CHECK (period_type IN ('annual', 'semester', 'quarter', 'monthly', 'custom')),
    CONSTRAINT periods_date_check CHECK (ends_on >= starts_on),
    CONSTRAINT periods_unique_range UNIQUE (period_type, starts_on, ends_on),
    CONSTRAINT periods_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX periods_range_idx ON sababuka.periods(starts_on, ends_on);
CREATE INDEX periods_parent_idx ON sababuka.periods(parent_id);

CREATE TABLE sababuka.geographies (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                varchar(32) NOT NULL UNIQUE,
    name                varchar(255) NOT NULL,
    level               varchar(24) NOT NULL,
    parent_id           uuid REFERENCES sababuka.geographies(id),
    geometry            geometry(MultiPolygon, 4326),
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT geographies_level_check CHECK (level IN ('country', 'province', 'regency', 'district', 'village', 'custom')),
    CONSTRAINT geographies_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT geographies_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX geographies_parent_idx ON sababuka.geographies(parent_id);
CREATE INDEX geographies_geometry_gist_idx ON sababuka.geographies USING gist(geometry);

CREATE TABLE sababuka.indicators (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    varchar(80) NOT NULL UNIQUE,
    name                    varchar(255) NOT NULL,
    category_id             uuid NOT NULL REFERENCES sababuka.categories(id),
    owner_organization_id   uuid REFERENCES sababuka.organizations(id),
    is_active               boolean NOT NULL DEFAULT true,
    archived_at             timestamptz,
    created_by              uuid REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT indicators_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]*$')
);

CREATE INDEX indicators_category_idx ON sababuka.indicators(category_id);
CREATE INDEX indicators_owner_idx ON sababuka.indicators(owner_organization_id);

CREATE TABLE sababuka.indicator_versions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id            uuid NOT NULL REFERENCES sababuka.indicators(id),
    version_number          integer NOT NULL,
    definition              text NOT NULL,
    formula                 text,
    unit_id                 uuid NOT NULL REFERENCES sababuka.units(id),
    frequency               varchar(24) NOT NULL,
    data_type               varchar(24) NOT NULL,
    dimension_schema        jsonb NOT NULL DEFAULT '{}'::jsonb,
    access_level            varchar(24) NOT NULL DEFAULT 'internal',
    effective_from          date NOT NULL,
    effective_until         date,
    status                  varchar(24) NOT NULL DEFAULT 'draft',
    change_notes            text,
    submitted_by            uuid REFERENCES sababuka.users(id),
    submitted_at            timestamptz,
    approved_by             uuid REFERENCES sababuka.users(id),
    approved_at             timestamptz,
    created_by              uuid REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT indicator_versions_unique UNIQUE (indicator_id, version_number),
    CONSTRAINT indicator_versions_positive CHECK (version_number > 0),
    CONSTRAINT indicator_versions_frequency_check CHECK (frequency IN ('annual', 'semester', 'quarter', 'monthly', 'event', 'custom')),
    CONSTRAINT indicator_versions_data_type_check CHECK (data_type IN ('number', 'integer', 'percentage', 'currency', 'text', 'boolean')),
    CONSTRAINT indicator_versions_access_check CHECK (access_level IN ('public', 'internal', 'restricted')),
    CONSTRAINT indicator_versions_status_check CHECK (status IN ('draft', 'in_review', 'approved', 'active', 'retired')),
    CONSTRAINT indicator_versions_dates_check CHECK (effective_until IS NULL OR effective_until >= effective_from),
    CONSTRAINT indicator_versions_dimensions_object CHECK (jsonb_typeof(dimension_schema) = 'object'),
    CONSTRAINT indicator_versions_approval_check CHECK (
        (status IN ('approved', 'active', 'retired') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        OR status IN ('draft', 'in_review')
    )
);

CREATE INDEX indicator_versions_indicator_idx ON sababuka.indicator_versions(indicator_id, version_number DESC);
CREATE INDEX indicator_versions_status_idx ON sababuka.indicator_versions(status);
CREATE UNIQUE INDEX indicator_versions_one_active_idx
    ON sababuka.indicator_versions(indicator_id)
    WHERE status = 'active';

CREATE TABLE sababuka.indicator_organizations (
    indicator_version_id    uuid NOT NULL REFERENCES sababuka.indicator_versions(id) ON DELETE CASCADE,
    organization_id         uuid NOT NULL REFERENCES sababuka.organizations(id),
    responsibility          varchar(32) NOT NULL,
    is_primary              boolean NOT NULL DEFAULT false,
    created_at              timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (indicator_version_id, organization_id, responsibility),
    CONSTRAINT indicator_organizations_responsibility_check CHECK (
        responsibility IN ('primary_producer', 'supporter', 'validator', 'curator')
    ),
    CONSTRAINT indicator_organizations_primary_check CHECK (
        is_primary = false OR responsibility = 'primary_producer'
    )
);

CREATE INDEX indicator_organizations_org_idx ON sababuka.indicator_organizations(organization_id);
CREATE UNIQUE INDEX indicator_organizations_one_primary_idx
    ON sababuka.indicator_organizations(indicator_version_id)
    WHERE is_primary = true;

CREATE TABLE sababuka.targets (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_version_id    uuid NOT NULL REFERENCES sababuka.indicator_versions(id),
    period_id               uuid NOT NULL REFERENCES sababuka.periods(id),
    geography_id            uuid REFERENCES sababuka.geographies(id),
    dimension_values        jsonb NOT NULL DEFAULT '{}'::jsonb,
    dimension_hash          bytea GENERATED ALWAYS AS (digest(dimension_values::text, 'sha256')) STORED,
    numeric_value           numeric(30,10),
    text_value              text,
    notes                   text,
    created_by              uuid REFERENCES sababuka.users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT targets_value_check CHECK (num_nonnulls(numeric_value, text_value) = 1),
    CONSTRAINT targets_dimensions_object CHECK (jsonb_typeof(dimension_values) = 'object')
);

CREATE UNIQUE INDEX targets_business_key_idx
    ON sababuka.targets(indicator_version_id, period_id, geography_id, dimension_hash)
    NULLS NOT DISTINCT;

CREATE INDEX targets_period_idx ON sababuka.targets(period_id);
CREATE INDEX targets_geography_idx ON sababuka.targets(geography_id);

CREATE TRIGGER policy_focuses_set_updated_at
BEFORE UPDATE ON sababuka.policy_focuses
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON sababuka.categories
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER units_set_updated_at
BEFORE UPDATE ON sababuka.units
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER geographies_set_updated_at
BEFORE UPDATE ON sababuka.geographies
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER indicators_set_updated_at
BEFORE UPDATE ON sababuka.indicators
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER indicator_versions_set_updated_at
BEFORE UPDATE ON sababuka.indicator_versions
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER targets_set_updated_at
BEFORE UPDATE ON sababuka.targets
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('003', 'policy governance, indicators, periods, geography, and targets')
ON CONFLICT (version) DO NOTHING;

COMMIT;
