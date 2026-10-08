BEGIN;

CREATE TABLE sababuka.connector_secrets (
    source_id          uuid PRIMARY KEY REFERENCES sababuka.data_sources(id) ON DELETE CASCADE,
    encrypted_secret   text NOT NULL,
    masked_hint        varchar(64),
    last_tested_at     timestamptz,
    last_test_status   varchar(24) NOT NULL DEFAULT 'not_tested',
    last_test_error    text,
    updated_by         uuid REFERENCES sababuka.users(id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT connector_secrets_status_check CHECK (last_test_status IN ('not_tested', 'connected', 'failed'))
);

CREATE TABLE sababuka.connector_connection_checks (
    source_id          uuid PRIMARY KEY REFERENCES sababuka.data_sources(id) ON DELETE CASCADE,
    checked_at         timestamptz NOT NULL DEFAULT now(),
    reachable          boolean NOT NULL,
    response_ms        integer,
    platform           varchar(120),
    dataset_count      integer,
    resource_count     integer,
    publishers         jsonb NOT NULL DEFAULT '[]'::jsonb,
    years              jsonb NOT NULL DEFAULT '[]'::jsonb,
    error_text         text,
    candidate_summary  jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT connector_checks_publishers_array CHECK (jsonb_typeof(publishers) = 'array'),
    CONSTRAINT connector_checks_years_array CHECK (jsonb_typeof(years) = 'array'),
    CONSTRAINT connector_checks_candidate_object CHECK (jsonb_typeof(candidate_summary) = 'object')
);

CREATE TRIGGER connector_secrets_set_updated_at
BEFORE UPDATE ON sababuka.connector_secrets
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.permissions (code, name, risk_level) VALUES
  ('connector_secret.view', 'Lihat status secret konektor', 'critical'),
  ('connector_secret.manage', 'Kelola secret konektor', 'critical')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM sababuka.roles r CROSS JOIN sababuka.permissions p
WHERE r.code = 'superadmin' AND p.code IN ('connector_secret.view', 'connector_secret.manage')
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('024', 'encrypted connector secrets and sanitized connection profiles')
ON CONFLICT (version) DO NOTHING;

COMMIT;
