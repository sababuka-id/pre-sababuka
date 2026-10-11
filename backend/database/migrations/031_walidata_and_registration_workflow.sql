BEGIN;

-- Pendaftaran mandiri menyimpan klaim pemohon secara terpisah dari keputusan
-- akses. Organisasi dan role final tetap ditetapkan oleh Developer.
CREATE TABLE sababuka.user_registration_requests (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL UNIQUE REFERENCES sababuka.users(id),
    requested_organization_id   uuid NOT NULL REFERENCES sababuka.organizations(id),
    contact_email               citext NOT NULL,
    contact_phone               varchar(50) NOT NULL,
    job_title                   varchar(160) NOT NULL,
    employee_id                 varchar(80),
    request_note                text,
    status                      varchar(24) NOT NULL DEFAULT 'pending',
    approved_organization_id    uuid REFERENCES sababuka.organizations(id),
    approved_role_id            uuid REFERENCES sababuka.roles(id),
    reviewed_by                 uuid REFERENCES sababuka.users(id),
    reviewed_at                 timestamptz,
    review_notes                text,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT registration_request_status_check
        CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT registration_request_review_check CHECK (
        (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
        OR (status <> 'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

CREATE INDEX user_registration_requests_status_idx
    ON sababuka.user_registration_requests(status, created_at DESC);

CREATE TRIGGER user_registration_requests_set_updated_at
BEFORE UPDATE ON sababuka.user_registration_requests
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

-- Pertahankan pendaftaran mandiri lama agar tetap dapat diverifikasi.
INSERT INTO sababuka.user_registration_requests
    (user_id, requested_organization_id, contact_email, contact_phone, job_title, request_note)
SELECT u.id, om.organization_id, u.email, '-', 'Belum dilengkapi',
       'Migrasi dari pendaftaran mandiri sebelum formulir identitas PIC tersedia.'
FROM sababuka.users u
JOIN LATERAL (
    SELECT organization_id
    FROM sababuka.organization_memberships
    WHERE user_id = u.id AND ends_at IS NULL
    ORDER BY is_primary DESC, created_at
    LIMIT 1
) om ON true
WHERE u.status = 'invited'
  AND u.password_hash IS NOT NULL
  AND u.archived_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Diskominfosantik adalah Walidata: mengelola kualitas teknis, interoperabilitas,
-- mapping, sinkronisasi, dan pemantauan aliran data. Kredensial rahasia tetap
-- hanya dapat dikelola Developer melalui proteksi requireSuperadmin.
UPDATE sababuka.roles
SET name = 'Walidata (Diskominfosantik)',
    description = 'Walidata Kabupaten Kapuas yang mengelola kualitas teknis, metadata, interoperabilitas, mapping, sinkronisasi, dan kesehatan aliran data.',
    updated_at = now(),
    is_active = true
WHERE code = 'kominfo';

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code IN ('connector.view', 'connector.manage', 'audit.view')
WHERE r.code = 'kominfo'
ON CONFLICT DO NOTHING;

UPDATE sababuka.menu_items
SET label = 'Ruang Walidata', display_order = 15, updated_at = now()
WHERE code = 'connectors';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('031', 'walidata role and verified OPD registration workflow')
ON CONFLICT (version) DO NOTHING;

COMMIT;
