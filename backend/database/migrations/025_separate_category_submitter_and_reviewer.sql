BEGIN;

INSERT INTO sababuka.permissions (code, name, risk_level)
VALUES ('category.submit', 'Ajukan kategori untuk keputusan BAPPERIDA', 'elevated')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    risk_level = EXCLUDED.risk_level;

INSERT INTO sababuka.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM sababuka.roles r
JOIN sababuka.permissions p ON p.code = 'category.submit'
WHERE r.code = 'superadmin'
ON CONFLICT DO NOTHING;

DELETE FROM sababuka.role_permissions
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'bapperida')
  AND permission_id = (SELECT id FROM sababuka.permissions WHERE code = 'category.submit');

-- Paket demo dibuat oleh Superadmin. Jika pengajuannya sempat dilakukan oleh
-- akun BAPPERIDA sebelum permission dipisah, kembalikan identitas pengaju ke
-- penyusun paket agar BAPPERIDA dapat mengambil keputusan tanpa self-approval.
UPDATE sababuka.categories AS c
SET submitted_by = c.created_by,
    decision_notes = 'Pengajuan paket demo disiapkan oleh Superadmin; menunggu keputusan BAPPERIDA.',
    updated_at = now()
WHERE c.code IN ('DEMO_PRESENTATION_CATEGORY', 'DEMO_PRACTICE_CATEGORY')
  AND c.review_status = 'in_review'
  AND c.created_by IS NOT NULL
  AND c.submitted_by IS DISTINCT FROM c.created_by
  AND EXISTS (
    SELECT 1
    FROM sababuka.user_role_assignments ura
    JOIN sababuka.roles r ON r.id = ura.role_id
    WHERE ura.user_id = c.submitted_by
      AND r.code = 'bapperida'
  );

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('025', 'separate category submitter from BAPPERIDA reviewer')
ON CONFLICT (version) DO NOTHING;

COMMIT;
