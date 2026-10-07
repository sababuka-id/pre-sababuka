BEGIN;

DELETE FROM sababuka.targets target
USING sababuka.indicator_versions version,
      sababuka.indicators indicator,
      sababuka.periods period
WHERE target.indicator_version_id = version.id
  AND version.indicator_id = indicator.id
  AND target.period_id = period.id
  AND indicator.code = 'RPJMD_I041_INDEKS_PEMBANGUNAN_KUALITAS_KELUARGA'
  AND period.code = '2025'
  AND target.numeric_value IS NULL
  AND target.text_value IN ('–', '—', '-', '�');

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('016', 'remove unavailable RPJMD baseline placeholder from target data')
ON CONFLICT (version) DO NOTHING;

COMMIT;
