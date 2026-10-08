BEGIN;

-- Kominfo memantau layanan dan alur data. Keputusan substansi tetap berada
-- pada BAPPERIDA dan OPD pemilik indikator.
UPDATE sababuka.roles
SET description = 'Pemantau layanan, kesehatan konektor, alur data, dan keterbukaan data dalam mode baca saja.',
    updated_at = now(),
    is_active = true
WHERE code = 'kominfo';

UPDATE sababuka.roles
SET description = 'Pengelola tata kelola indikator, pemeriksaan data, dan kelayakan tayang; bukan pengelola konfigurasi konektor.',
    updated_at = now(),
    is_active = true
WHERE code = 'bapperida';

-- BAPPERIDA melihat status mapping, tetapi konfigurasi teknis dan aksi sync
-- tetap dilakukan Superadmin/developer pada environment yang ditetapkan.
DELETE FROM sababuka.role_permissions
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'bapperida')
  AND permission_id = (SELECT id FROM sababuka.permissions WHERE code = 'connector.manage');

-- Kominfo hanya mendapat akses observasi layanan dan alur data.
DELETE FROM sababuka.role_permissions
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'kominfo')
  AND permission_id NOT IN (
    SELECT id FROM sababuka.permissions
    WHERE code IN ('connector.view', 'executive_dashboard.view', 'audit.view')
  );

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code IN ('connector.view', 'executive_dashboard.view', 'audit.view')
WHERE r.code = 'kominfo'
ON CONFLICT DO NOTHING;

-- Bersihkan menu lama Kominfo agar tidak muncul menu tata kelola atau input.
DELETE FROM sababuka.role_menu_items
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'kominfo');

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT r.id, m.id, true, m.display_order
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code IN ('dashboard', 'connectors', 'audit')
WHERE r.code = 'kominfo'
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET is_visible = EXCLUDED.is_visible,
    display_order = EXCLUDED.display_order;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('027', 'Kominfo read-only service and data-flow role')
ON CONFLICT (version) DO NOTHING;

COMMIT;
