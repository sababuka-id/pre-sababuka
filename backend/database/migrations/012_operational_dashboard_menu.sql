BEGIN;

INSERT INTO sababuka.menu_items (code, label, icon, route_name, required_permission, display_order)
VALUES ('operations', 'Dashboard Operasional', 'activity', '/operations', 'submission.view', 45)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon,
    route_name = EXCLUDED.route_name, required_permission = EXCLUDED.required_permission,
    display_order = EXCLUDED.display_order, is_active = true;

INSERT INTO sababuka.role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id FROM sababuka.roles r CROSS JOIN sababuka.menu_items m
WHERE r.code IN ('superadmin', 'bapperida', 'kominfo', 'opd') AND m.code = 'operations'
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('012', 'operational dashboard menu for data workflow roles')
ON CONFLICT (version) DO NOTHING;

COMMIT;
