BEGIN;

UPDATE sababuka.roles
SET name = 'Developer',
    description = 'Pengelola teknis konfigurasi dan akses sistem.',
    updated_at = now()
WHERE code = 'superadmin';

UPDATE sababuka.users SET email = 'developer@sababuka.com', full_name = 'Developer SABABUKA', updated_at = now()
WHERE email = 'superadmin@sababuka.local';

UPDATE sababuka.users SET email = 'bapperida@sababuka.com', full_name = 'Admin BAPPERIDA', updated_at = now()
WHERE email = 'bapperida@sababuka.local';

UPDATE sababuka.users SET email = 'kominfo@sababuka.com', full_name = 'Admin KOMINFO', updated_at = now()
WHERE email = 'kominfo@sababuka.local';

UPDATE sababuka.users SET email = 'opd.dkpp@sababuka.com', full_name = 'Operator OPD DKPP', updated_at = now()
WHERE email = 'opd.dkpp@sababuka.local';

UPDATE sababuka.users SET email = 'pimpinan@sababuka.com', full_name = 'Pimpinan Daerah', updated_at = now()
WHERE email = 'pimpinan@sababuka.local';

INSERT INTO sababuka.schema_migrations (version, name)
VALUES ('026', 'self_registration_and_developer_identity');

COMMIT;
