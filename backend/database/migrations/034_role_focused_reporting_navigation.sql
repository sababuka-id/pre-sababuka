BEGIN;

UPDATE sababuka.menu_items
SET label = CASE code
    WHEN 'operations' THEN 'Beranda Tugas'
    WHEN 'submissions' THEN 'Pelaporan Realisasi'
    WHEN 'reviews' THEN 'Verifikasi Pelaporan OPD'
    ELSE label
  END,
  updated_at = now()
WHERE code IN ('operations', 'submissions', 'reviews');

-- BAPPERIDA memantau semua status dan mengambil keputusan melalui satu antrean
-- verifikasi. Menu pengisian OPD tidak perlu tampil sebagai jalur terpisah.
DELETE FROM sababuka.role_menu_items
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'bapperida')
  AND menu_item_id = (SELECT id FROM sababuka.menu_items WHERE code = 'submissions');

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('034', 'role focused reporting navigation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
