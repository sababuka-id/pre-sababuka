BEGIN;

CREATE TABLE sababuka.data_source_integrations (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id        uuid NOT NULL UNIQUE REFERENCES sababuka.data_sources(id) ON DELETE CASCADE,
    connector_kind        varchar(32) NOT NULL,
    auth_type             varchar(24) NOT NULL DEFAULT 'none',
    data_format           varchar(24) NOT NULL DEFAULT 'json',
    endpoint_path         text,
    data_path             varchar(255),
    sync_mode             varchar(24) NOT NULL DEFAULT 'manual',
    sync_interval_minutes integer,
    sync_timezone         varchar(64) NOT NULL DEFAULT 'Asia/Jakarta',
    verification_mode     varchar(24) NOT NULL DEFAULT 'preview_required',
    status                varchar(24) NOT NULL DEFAULT 'draft',
    last_sync_status      varchar(24) NOT NULL DEFAULT 'not_run',
    last_synced_at        timestamptz,
    next_sync_at          timestamptz,
    notes                 text,
    created_by            uuid REFERENCES sababuka.users(id),
    updated_by            uuid REFERENCES sababuka.users(id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT source_integration_kind_check CHECK (connector_kind IN
      ('api_json','ckan','bps','csv_url','file_upload','database_view','html_scrape','manual')),
    CONSTRAINT source_integration_auth_check CHECK (auth_type IN
      ('none','api_key','bearer','basic','oauth2')),
    CONSTRAINT source_integration_format_check CHECK (data_format IN
      ('json','csv','xlsx','html','database','manual')),
    CONSTRAINT source_integration_sync_mode_check CHECK (sync_mode IN ('manual','scheduled')),
    CONSTRAINT source_integration_interval_check CHECK (
      (sync_mode = 'manual' AND sync_interval_minutes IS NULL)
      OR (sync_mode = 'scheduled' AND sync_interval_minutes BETWEEN 60 AND 44640)
    ),
    CONSTRAINT source_integration_verification_check CHECK (verification_mode IN
      ('preview_required','auto_import')),
    CONSTRAINT source_integration_status_check CHECK (status IN
      ('draft','testing','active','paused','error')),
    CONSTRAINT source_integration_last_sync_check CHECK (last_sync_status IN
      ('not_run','running','success','failed'))
);

CREATE INDEX data_source_integrations_schedule_idx
  ON sababuka.data_source_integrations(status, next_sync_at)
  WHERE sync_mode = 'scheduled';

CREATE TRIGGER data_source_integrations_set_updated_at
BEFORE UPDATE ON sababuka.data_source_integrations
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.data_source_integrations
  (data_source_id, connector_kind, auth_type, data_format, endpoint_path,
   sync_mode, verification_mode, status, created_by, updated_by)
SELECT s.id,
       CASE WHEN s.source_type = 'ckan' THEN 'ckan' ELSE 'bps' END,
       CASE WHEN s.source_type = 'bps' THEN 'api_key' ELSE 'none' END,
       'json',
       CASE WHEN s.source_type = 'ckan' THEN '/api/3/action' ELSE NULL END,
       'manual', 'preview_required', 'active', s.created_by, s.created_by
FROM sababuka.data_sources s
WHERE s.code IN ('SATUDATA_KAPUAS','BPS_KAPUAS')
ON CONFLICT (data_source_id) DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('032', 'OPD source integration profiles, schedules, and verification policy')
ON CONFLICT (version) DO NOTHING;

COMMIT;
