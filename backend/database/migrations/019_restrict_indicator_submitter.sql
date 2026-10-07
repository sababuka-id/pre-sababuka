BEGIN;

-- BAPPERIDA reviews and approves indicator definitions; it does not submit
-- drafts to itself. Superadmin is the current drafting/submitter role.
DELETE FROM sababuka.role_permissions
WHERE role_id = (SELECT id FROM sababuka.roles WHERE code = 'bapperida')
  AND permission_id = (SELECT id FROM sababuka.permissions WHERE code = 'indicator.submit');

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('019', 'restrict indicator submission to drafting role')
ON CONFLICT (version) DO NOTHING;

COMMIT;
