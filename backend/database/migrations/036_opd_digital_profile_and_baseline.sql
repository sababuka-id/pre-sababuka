BEGIN;

CREATE TABLE sababuka.opd_digital_profiles (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       uuid NOT NULL UNIQUE REFERENCES sababuka.organizations(id),
    response_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
    technical_status      varchar(24) NOT NULL DEFAULT 'draft',
    planning_status       varchar(24) NOT NULL DEFAULT 'draft',
    technical_notes       text,
    planning_notes        text,
    submitted_by          uuid REFERENCES sababuka.users(id),
    submitted_at          timestamptz,
    technical_reviewed_by uuid REFERENCES sababuka.users(id),
    technical_reviewed_at timestamptz,
    planning_reviewed_by  uuid REFERENCES sababuka.users(id),
    planning_reviewed_at  timestamptz,
    created_by            uuid REFERENCES sababuka.users(id),
    updated_by            uuid REFERENCES sababuka.users(id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT opd_digital_profiles_response_object CHECK (jsonb_typeof(response_json)='object'),
    CONSTRAINT opd_digital_profiles_technical_status CHECK (technical_status IN ('draft','submitted','returned','verified')),
    CONSTRAINT opd_digital_profiles_planning_status CHECK (planning_status IN ('draft','submitted','returned','verified'))
);

CREATE TABLE sababuka.opd_profile_documents (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id        uuid NOT NULL REFERENCES sababuka.opd_digital_profiles(id) ON DELETE CASCADE,
    document_type     varchar(32) NOT NULL,
    document_year     integer,
    original_filename varchar(500) NOT NULL,
    storage_key       text NOT NULL UNIQUE,
    mime_type         varchar(160) NOT NULL,
    byte_size         bigint NOT NULL,
    checksum_sha256   char(64) NOT NULL,
    uploaded_by       uuid NOT NULL REFERENCES sababuka.users(id),
    uploaded_at       timestamptz NOT NULL DEFAULT now(),
    deleted_by        uuid REFERENCES sababuka.users(id),
    deleted_at        timestamptz,
    CONSTRAINT opd_profile_documents_type CHECK (document_type IN ('renstra','rpjmd_progress','renja_evaluation','lkjip','indicator_workpaper','other')),
    CONSTRAINT opd_profile_documents_year CHECK (document_year IS NULL OR document_year BETWEEN 2000 AND 2100),
    CONSTRAINT opd_profile_documents_size CHECK (byte_size > 0)
);

CREATE INDEX opd_profile_documents_profile_idx ON sababuka.opd_profile_documents(profile_id, uploaded_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER opd_digital_profiles_set_updated_at
BEFORE UPDATE ON sababuka.opd_digital_profiles
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.menu_items (code,label,icon,route_name,required_permission,display_order,is_active)
VALUES ('opd-profile','Profil Data dan Baseline OPD','clipboard-list','/opd-profile','submission.view',21,true)
ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label,icon=EXCLUDED.icon,route_name=EXCLUDED.route_name,required_permission=EXCLUDED.required_permission,display_order=EXCLUDED.display_order,is_active=true,updated_at=now();

INSERT INTO sababuka.role_menu_items (role_id,menu_item_id)
SELECT DISTINCT rp.role_id,m.id
FROM sababuka.role_permissions rp
JOIN sababuka.permissions p ON p.id=rp.permission_id AND p.code='submission.view'
JOIN sababuka.menu_items m ON m.code='opd-profile'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version,description)
VALUES ('036','OPD website inventory, dynamic planning baseline, and Renstra documents')
ON CONFLICT (version) DO NOTHING;

COMMIT;
