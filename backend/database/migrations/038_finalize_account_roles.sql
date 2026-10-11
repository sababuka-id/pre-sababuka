BEGIN;

UPDATE sababuka.roles
SET name = 'Verifikator BAPPERIDA',
    description = 'Memeriksa substansi indikator, baseline, dan capaian RPJMD lintas OPD.',
    updated_at = now()
WHERE code = 'bapperida';

UPDATE sababuka.roles
SET name = 'Walidata Diskominfosantik',
    description = 'Menjaga kualitas teknis, metadata, interoperabilitas, dan aliran data lintas OPD.',
    updated_at = now()
WHERE code = 'kominfo';

UPDATE sababuka.roles
SET name = 'Admin/PIC OPD',
    description = 'Satu penanggung jawab resmi untuk profil, baseline, dan pelaporan capaian OPD.',
    updated_at = now()
WHERE code = 'opd';

INSERT INTO sababuka.schema_migrations (version,description)
VALUES ('038','final account role labels and OPD responsibility model')
ON CONFLICT (version) DO NOTHING;

COMMIT;
