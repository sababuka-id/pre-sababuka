BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS sababuka;

CREATE TABLE IF NOT EXISTS sababuka.schema_migrations (
    version         varchar(64) PRIMARY KEY,
    description     text NOT NULL,
    checksum        text,
    applied_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION sababuka.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('001', 'extensions and base schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
