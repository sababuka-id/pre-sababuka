BEGIN;

-- Master geografi diperlukan agar data sumber dapat disimpan sesuai
-- granularitasnya. Kode kecamatan internal diselaraskan dengan direktori OPD;
-- kode referensi eksternal/BPS dapat ditambahkan pada metadata setelah
-- dikonfirmasi Walidata tanpa mengubah identitas historis observasi.
INSERT INTO sababuka.geographies (code, name, level, metadata)
VALUES ('6203', 'Kabupaten Kapuas', 'regency', '{"reference":"BPS Kabupaten Kapuas"}'::jsonb)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, level = EXCLUDED.level, is_active = true, updated_at = now();

INSERT INTO sababuka.geographies (code, name, level, parent_id, metadata)
SELECT item.code, item.name, 'district', parent.id,
       jsonb_build_object('organization_code', item.code, 'external_code_status', 'menunggu konfirmasi Walidata')
FROM sababuka.geographies parent
CROSS JOIN (VALUES
  ('KEC_SELAT', 'Kecamatan Selat'),
  ('KEC_KAPUAS_HILIR', 'Kecamatan Kapuas Hilir'),
  ('KEC_KAPUAS_BARAT', 'Kecamatan Kapuas Barat'),
  ('KEC_BASARANG', 'Kecamatan Basarang'),
  ('KEC_KAPUAS_TIMUR', 'Kecamatan Kapuas Timur'),
  ('KEC_PULAU_PETAK', 'Kecamatan Pulau Petak'),
  ('KEC_KAPUAS_KUALA', 'Kecamatan Kapuas Kuala'),
  ('KEC_MANTANGAI', 'Kecamatan Mantangai'),
  ('KEC_KAPUAS_MURUNG', 'Kecamatan Kapuas Murung'),
  ('KEC_BATAGUH', 'Kecamatan Bataguh'),
  ('KEC_TAMBAN_CATUR', 'Kecamatan Tamban Catur'),
  ('KEC_DADAHUP', 'Kecamatan Dadahup'),
  ('KEC_KAPUAS_TENGAH', 'Kecamatan Kapuas Tengah'),
  ('KEC_TIMPAH', 'Kecamatan Timpah'),
  ('KEC_KAPUAS_HULU', 'Kecamatan Kapuas Hulu'),
  ('KEC_PASAK_TALAWANG', 'Kecamatan Pasak Talawang'),
  ('KEC_MANDAU_TALAWANG', 'Kecamatan Mandau Talawang')
) AS item(code, name)
WHERE parent.code = '6203'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  metadata = sababuka.geographies.metadata || EXCLUDED.metadata,
  is_active = true,
  updated_at = now();

INSERT INTO sababuka.menu_items (code, label, icon, route_name, required_permission, display_order)
VALUES
  ('analysis', 'Analisis dan Peta', 'map-pinned', '/analysis', 'executive_dashboard.view', 25),
  ('finance', 'Keuangan Daerah', 'wallet-cards', '/finance', 'executive_dashboard.view', 26),
  ('public-services', 'Layanan Publik', 'heart-handshake', '/public-services', 'executive_dashboard.view', 27)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  route_name = EXCLUDED.route_name,
  required_permission = EXCLUDED.required_permission,
  display_order = EXCLUDED.display_order,
  is_active = true,
  updated_at = now();

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id, is_visible, display_order)
SELECT role.id, menu.id, true, menu.display_order
FROM sababuka.roles role
JOIN sababuka.menu_items menu ON menu.code IN ('analysis', 'finance', 'public-services')
WHERE role.code IN ('superadmin', 'bapperida', 'pimpinan')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  is_visible = true,
  display_order = EXCLUDED.display_order;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('035', 'decision analysis, district geography, finance, and public service menus')
ON CONFLICT (version) DO NOTHING;

COMMIT;
