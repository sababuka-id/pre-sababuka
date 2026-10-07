BEGIN;

ALTER TABLE sababuka.categories
    ADD COLUMN review_status varchar(24) NOT NULL DEFAULT 'draft',
    ADD COLUMN submitted_by uuid REFERENCES sababuka.users(id),
    ADD COLUMN submitted_at timestamptz,
    ADD COLUMN decided_by uuid REFERENCES sababuka.users(id),
    ADD COLUMN decided_at timestamptz,
    ADD COLUMN decision_notes text;

ALTER TABLE sababuka.categories
    ADD CONSTRAINT categories_review_status_check
    CHECK (review_status IN ('draft', 'in_review', 'approved', 'rejected'));

UPDATE sababuka.categories
SET review_status = 'approved',
    decided_at = now()
WHERE code NOT LIKE 'RPJMD\_%' ESCAPE '\';

UPDATE sababuka.categories
SET review_status = 'draft',
    submitted_by = NULL,
    submitted_at = NULL,
    decided_by = NULL,
    decided_at = NULL,
    decision_notes = 'Usulan kategori strategis RPJMD; menunggu keputusan BAPPERIDA.'
WHERE code LIKE 'RPJMD\_%' ESCAPE '\';

ALTER TABLE sababuka.indicator_versions
    DROP CONSTRAINT indicator_versions_status_check,
    DROP CONSTRAINT indicator_versions_approval_check;

ALTER TABLE sababuka.indicator_versions
    ADD COLUMN bapperida_reviewed_by uuid REFERENCES sababuka.users(id),
    ADD COLUMN bapperida_reviewed_at timestamptz,
    ADD COLUMN opd_verified_by uuid REFERENCES sababuka.users(id),
    ADD COLUMN opd_verified_at timestamptz;

ALTER TABLE sababuka.indicator_versions
    ADD CONSTRAINT indicator_versions_status_check
    CHECK (status IN ('draft', 'in_review', 'opd_verification', 'approved', 'active', 'retired')),
    ADD CONSTRAINT indicator_versions_approval_check CHECK (
        (status IN ('approved', 'active', 'retired') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        OR status IN ('draft', 'in_review', 'opd_verification')
    );

UPDATE sababuka.indicator_versions iv
SET status = 'draft',
    submitted_by = NULL,
    submitted_at = NULL,
    approved_by = NULL,
    approved_at = NULL,
    bapperida_reviewed_by = NULL,
    bapperida_reviewed_at = NULL,
    opd_verified_by = NULL,
    opd_verified_at = NULL
FROM sababuka.indicators i
JOIN sababuka.categories c ON c.id = i.category_id
WHERE iv.indicator_id = i.id
  AND c.code LIKE 'RPJMD\_%' ESCAPE '\';

INSERT INTO sababuka.permissions (code, name, risk_level)
VALUES
    ('category.approve', 'Putuskan kategori strategis', 'critical'),
    ('indicator.verify', 'Verifikasi teknis indikator OPD', 'elevated')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code IN ('category.approve', 'indicator.verify')
WHERE r.code = 'superadmin'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'category.approve'
WHERE r.code = 'bapperida'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'indicator.verify'
WHERE r.code = 'opd'
ON CONFLICT DO NOTHING;

UPDATE sababuka.menu_items
SET label = 'Dashboard Pimpinan', updated_at = now()
WHERE code = 'dashboard';

UPDATE sababuka.menu_items
SET is_active = false, updated_at = now()
WHERE code = 'executive';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('017', 'category approval and OPD indicator verification workflow')
ON CONFLICT (version) DO NOTHING;

COMMIT;
