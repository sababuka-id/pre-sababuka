BEGIN;

ALTER TABLE sababuka.observations
    ADD COLUMN IF NOT EXISTS source_name text,
    ADD COLUMN IF NOT EXISTS source_url text,
    ADD COLUMN IF NOT EXISTS source_status varchar(32),
    ADD COLUMN IF NOT EXISTS source_retrieved_at timestamptz;

ALTER TABLE sababuka.observations
    DROP CONSTRAINT IF EXISTS observations_source_status_check;

ALTER TABLE sababuka.observations
    ADD CONSTRAINT observations_source_status_check CHECK (
        source_status IS NULL OR source_status IN (
            'demo', 'submitted', 'verified_direct', 'verified_calculated'
        )
    );

CREATE TABLE IF NOT EXISTS sababuka.indicator_source_audits (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_version_id  uuid NOT NULL REFERENCES sababuka.indicator_versions(id) ON DELETE CASCADE,
    audit_status          varchar(32) NOT NULL,
    source_name           text NOT NULL,
    source_url            text,
    source_period         varchar(64),
    notes                 text NOT NULL,
    retrieved_at          timestamptz NOT NULL DEFAULT now(),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT indicator_source_audits_status_check CHECK (
        audit_status IN ('verified_direct', 'verified_calculated', 'candidate', 'requires_opd')
    ),
    CONSTRAINT indicator_source_audits_unique UNIQUE (
        indicator_version_id, source_name, source_period
    )
);

CREATE INDEX IF NOT EXISTS indicator_source_audits_status_idx
    ON sababuka.indicator_source_audits(audit_status, updated_at DESC);

DROP TRIGGER IF EXISTS indicator_source_audits_set_updated_at ON sababuka.indicator_source_audits;
CREATE TRIGGER indicator_source_audits_set_updated_at
BEFORE UPDATE ON sababuka.indicator_source_audits
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('013', 'observation provenance and indicator source audit')
ON CONFLICT (version) DO NOTHING;

COMMIT;
