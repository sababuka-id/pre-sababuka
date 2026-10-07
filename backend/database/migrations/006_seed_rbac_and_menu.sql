BEGIN;

INSERT INTO sababuka.organizations (code, name, short_name, organization_type)
VALUES ('KAPUAS', 'Pemerintah Kabupaten Kapuas', 'Pemkab Kapuas', 'regency_government')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    organization_type = EXCLUDED.organization_type,
    is_active = true;

INSERT INTO sababuka.roles (code, name, description, is_system)
VALUES
    ('superadmin', 'Superadmin', 'Pengendali konfigurasi dan akses seluruh sistem.', true),
    ('bapperida', 'BAPPERIDA', 'Pengelola tata kelola indikator, review, dan kelayakan tayang.', true),
    ('kominfo', 'Kominfo', 'Pengelola integrasi dan kesehatan teknis data.', true),
    ('opd', 'OPD', 'Pengelola dan penanggung jawab data pada lingkup OPD.', true),
    ('pimpinan', 'Pimpinan', 'Pembaca dashboard eksekutif dan pengguna Asisten AI.', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    is_active = true;

INSERT INTO sababuka.permissions (code, name, risk_level)
VALUES
    ('system.configure', 'Konfigurasi sistem', 'critical'),
    ('system.feature_manage', 'Kelola feature flag', 'critical'),
    ('system.integration_manage', 'Kelola konfigurasi integrasi', 'critical'),
    ('organization.view', 'Lihat organisasi', 'normal'),
    ('organization.manage', 'Kelola organisasi', 'elevated'),
    ('user.view', 'Lihat pengguna', 'normal'),
    ('user.create', 'Buat pengguna', 'elevated'),
    ('user.update', 'Ubah pengguna', 'elevated'),
    ('user.activate', 'Aktifkan atau nonaktifkan pengguna', 'critical'),
    ('user.assign_role', 'Tetapkan role pengguna', 'critical'),
    ('role.view', 'Lihat role dan permission', 'normal'),
    ('role.manage', 'Kelola role dan permission', 'critical'),
    ('menu.manage', 'Kelola tampilan menu role', 'elevated'),
    ('policy_focus.view', 'Lihat fokus kebijakan', 'normal'),
    ('policy_focus.manage', 'Kelola fokus kebijakan', 'elevated'),
    ('category.view', 'Lihat kategori', 'normal'),
    ('category.manage', 'Kelola kategori', 'elevated'),
    ('indicator.view', 'Lihat indikator', 'normal'),
    ('indicator.manage', 'Kelola indikator', 'elevated'),
    ('indicator.submit', 'Ajukan definisi indikator', 'elevated'),
    ('indicator.approve', 'Setujui definisi indikator', 'critical'),
    ('indicator.activate', 'Aktifkan definisi indikator', 'critical'),
    ('dataset.view', 'Lihat dataset', 'normal'),
    ('dataset.manage', 'Kelola dataset dan metadata', 'elevated'),
    ('dataset.import', 'Impor dataset', 'elevated'),
    ('metadata_profile.manage', 'Kelola profil metadata', 'critical'),
    ('submission.view', 'Lihat pengiriman data', 'normal'),
    ('submission.create', 'Buat pengiriman data', 'normal'),
    ('submission.update', 'Ubah draft pengiriman', 'normal'),
    ('submission.validate', 'Jalankan validasi', 'normal'),
    ('submission.submit', 'Kirim data OPD', 'elevated'),
    ('submission.confirm_opd', 'Konfirmasi internal OPD', 'elevated'),
    ('submission.review', 'Review data lintas OPD', 'elevated'),
    ('submission.return', 'Kembalikan data untuk koreksi', 'elevated'),
    ('submission.approve', 'Setujui data', 'critical'),
    ('publication.view', 'Lihat publikasi', 'normal'),
    ('publication.manage', 'Susun publikasi', 'elevated'),
    ('publication.activate', 'Aktifkan publikasi', 'critical'),
    ('executive_dashboard.view', 'Lihat dashboard eksekutif', 'normal'),
    ('assistant.use', 'Gunakan Asisten AI', 'normal'),
    ('audit.view', 'Lihat audit', 'elevated'),
    ('audit.export', 'Ekspor audit', 'critical')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
CROSS JOIN sababuka.permissions p
WHERE r.code = 'superadmin'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = ANY (ARRAY[
    'organization.view', 'user.view', 'role.view',
    'policy_focus.view', 'policy_focus.manage', 'category.view', 'category.manage',
    'indicator.view', 'indicator.manage', 'indicator.submit', 'indicator.approve', 'indicator.activate',
    'dataset.view', 'dataset.manage', 'submission.view', 'submission.review',
    'submission.return', 'submission.approve', 'publication.view', 'publication.manage',
    'publication.activate', 'executive_dashboard.view', 'audit.view'
])
WHERE r.code = 'bapperida'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = ANY (ARRAY[
    'organization.view', 'user.view', 'role.view', 'policy_focus.view', 'category.view',
    'indicator.view', 'dataset.view', 'dataset.manage', 'dataset.import',
    'submission.view', 'executive_dashboard.view', 'audit.view'
])
WHERE r.code = 'kominfo'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = ANY (ARRAY[
    'organization.view', 'policy_focus.view', 'category.view', 'indicator.view',
    'dataset.view', 'dataset.manage', 'submission.view', 'submission.create',
    'submission.update', 'submission.validate', 'submission.submit', 'submission.confirm_opd'
])
WHERE r.code = 'opd'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = ANY (ARRAY[
    'policy_focus.view', 'category.view', 'indicator.view', 'dataset.view',
    'publication.view', 'executive_dashboard.view', 'assistant.use'
])
WHERE r.code = 'pimpinan'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.menu_items (code, label, icon, route_name, required_permission, display_order)
VALUES
    ('dashboard', 'Beranda', 'layout-dashboard', '/dashboard', 'executive_dashboard.view', 10),
    ('executive', 'Ringkasan Pimpinan', 'chart-no-axes-combined', '/executive', 'executive_dashboard.view', 20),
    ('assistant', 'Asisten AI', 'bot', '/assistant', 'assistant.use', 30),
    ('governance', 'Tata Kelola Data', 'landmark', NULL, NULL, 40),
    ('submissions', 'Pengiriman Data', 'inbox', '/submissions', 'submission.view', 50),
    ('reviews', 'Review Data', 'list-checks', '/reviews', 'submission.review', 60),
    ('publications', 'Publikasi', 'badge-check', '/publications', 'publication.view', 70),
    ('administration', 'Administrasi Sistem', 'settings', NULL, NULL, 80),
    ('audit', 'Audit', 'scroll-text', '/audit', 'audit.view', 90)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route_name = EXCLUDED.route_name,
    required_permission = EXCLUDED.required_permission,
    display_order = EXCLUDED.display_order,
    is_active = true;

INSERT INTO sababuka.menu_items (code, parent_id, label, icon, route_name, required_permission, display_order)
SELECT v.code, p.id, v.label, v.icon, v.route_name, v.required_permission, v.display_order
FROM sababuka.menu_items p
CROSS JOIN (VALUES
    ('focuses', 'Fokus Kebijakan', 'target', '/governance/focuses', 'policy_focus.view', 10),
    ('categories', 'Kategori', 'folders', '/governance/categories', 'category.view', 20),
    ('indicators', 'Indikator', 'gauge', '/governance/indicators', 'indicator.view', 30),
    ('datasets', 'Dataset', 'database', '/governance/datasets', 'dataset.view', 40)
) AS v(code, label, icon, route_name, required_permission, display_order)
WHERE p.code = 'governance'
ON CONFLICT (code) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route_name = EXCLUDED.route_name,
    required_permission = EXCLUDED.required_permission,
    display_order = EXCLUDED.display_order,
    is_active = true;

INSERT INTO sababuka.menu_items (code, parent_id, label, icon, route_name, required_permission, display_order)
SELECT v.code, p.id, v.label, v.icon, v.route_name, v.required_permission, v.display_order
FROM sababuka.menu_items p
CROSS JOIN (VALUES
    ('organizations', 'Organisasi', 'building-2', '/admin/organizations', 'organization.view', 10),
    ('users', 'Pengguna', 'users', '/admin/users', 'user.view', 20),
    ('roles', 'Role dan Permission', 'shield-check', '/admin/roles', 'role.view', 30),
    ('menus', 'Pengaturan Menu', 'panel-left', '/admin/menus', 'menu.manage', 40),
    ('metadata-profiles', 'Profil Metadata', 'braces', '/admin/metadata-profiles', 'metadata_profile.manage', 50),
    ('system-settings', 'Konfigurasi Sistem', 'sliders-horizontal', '/admin/system', 'system.configure', 60)
) AS v(code, label, icon, route_name, required_permission, display_order)
WHERE p.code = 'administration'
ON CONFLICT (code) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route_name = EXCLUDED.route_name,
    required_permission = EXCLUDED.required_permission,
    display_order = EXCLUDED.display_order,
    is_active = true;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
CROSS JOIN sababuka.menu_items m
WHERE r.code = 'superadmin'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = ANY (ARRAY[
    'dashboard', 'executive', 'governance', 'focuses', 'categories', 'indicators',
    'datasets', 'submissions', 'reviews', 'publications', 'audit'
])
WHERE r.code = 'bapperida'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = ANY (ARRAY[
    'dashboard', 'governance', 'indicators', 'datasets', 'submissions', 'audit'
])
WHERE r.code = 'kominfo'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = ANY (ARRAY[
    'governance', 'indicators', 'datasets', 'submissions'
])
WHERE r.code = 'opd'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM sababuka.roles r
JOIN sababuka.menu_items m ON m.code = ANY (ARRAY[
    'dashboard', 'executive', 'assistant', 'publications'
])
WHERE r.code = 'pimpinan'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.feature_flags (code, name, description, is_enabled)
VALUES
    ('assistant.enabled', 'Asisten AI Pimpinan', 'Mengaktifkan Asisten AI berbasis publikasi aktif.', true),
    ('upload.xlsx', 'Unggah XLSX', 'Mengaktifkan unggah template XLSX untuk pilot.', true),
    ('import.ckan', 'Impor CKAN', 'Mengaktifkan konektor impor CKAN setelah konfigurasi sumber selesai.', false),
    ('public.portal', 'Portal Publik', 'Portal publik di luar ruang MVP internal.', false)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('006', 'baseline roles, permissions, menus, organization, and feature flags')
ON CONFLICT (version) DO NOTHING;

COMMIT;
