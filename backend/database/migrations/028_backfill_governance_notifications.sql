BEGIN;

-- Kategori yang sudah menunggu keputusan sebelum notifikasi governance aktif
-- tetap harus muncul pada akun BAPPERIDA. NOT EXISTS menjaga migration ini aman
-- jika deployment dijalankan ulang.
INSERT INTO sababuka.notifications
    (user_id, notification_type, title, message, entity_type, entity_id)
SELECT DISTINCT
    ura.user_id,
    'category.submitted',
    'Kategori menunggu verifikasi BAPPERIDA',
    'Kategori ' || c.name || ' diajukan untuk ditinjau.',
    'category',
    c.id
FROM sababuka.categories c
JOIN sababuka.user_role_assignments ura
  ON ura.starts_at <= now()
 AND (ura.ends_at IS NULL OR ura.ends_at > now())
JOIN sababuka.roles r ON r.id = ura.role_id AND r.code = 'bapperida'
JOIN sababuka.users u ON u.id = ura.user_id AND u.status = 'active'
WHERE c.review_status = 'in_review'
  AND (c.submitted_by IS NULL OR ura.user_id <> c.submitted_by)
  AND NOT EXISTS (
    SELECT 1
    FROM sababuka.notifications n
    WHERE n.user_id = ura.user_id
      AND n.notification_type = 'category.submitted'
      AND n.entity_type = 'category'
      AND n.entity_id = c.id
  );

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('028', 'backfill governance notifications for pending categories')
ON CONFLICT (version) DO NOTHING;

COMMIT;
