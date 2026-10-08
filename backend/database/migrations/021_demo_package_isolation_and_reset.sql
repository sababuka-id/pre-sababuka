BEGIN;

-- Remove the old broad demo seed. Official source batches and audit history are
-- intentionally left untouched.
CREATE TEMP TABLE _legacy_demo_batches ON COMMIT DROP AS
SELECT id FROM sababuka.data_batches
WHERE source_metadata->>'demo' = 'true';

CREATE TEMP TABLE _legacy_demo_observations ON COMMIT DROP AS
SELECT o.id FROM sababuka.observations o JOIN _legacy_demo_batches b ON b.id = o.batch_id;

CREATE TEMP TABLE _legacy_demo_publications ON COMMIT DROP AS
SELECT DISTINCT p.id
FROM sababuka.publications p
LEFT JOIN sababuka.publication_items pi ON pi.publication_id = p.id
LEFT JOIN _legacy_demo_observations o ON o.id = pi.observation_id
WHERE p.publication_key LIKE 'DEMO_%' OR o.id IS NOT NULL;

CREATE TEMP TABLE _legacy_demo_items ON COMMIT DROP AS
SELECT pi.id FROM sababuka.publication_items pi JOIN _legacy_demo_publications p ON p.id = pi.publication_id;

DELETE FROM sababuka.assistant_citations WHERE publication_item_id IN (SELECT id FROM _legacy_demo_items);
UPDATE sababuka.publications p SET status = 'draft', activated_by = NULL, activated_at = NULL, replaced_by_id = NULL, updated_at = now()
WHERE p.id IN (SELECT id FROM _legacy_demo_publications);
UPDATE sababuka.publications SET replaced_by_id = NULL WHERE replaced_by_id IN (SELECT id FROM _legacy_demo_publications);
DELETE FROM sababuka.publication_items WHERE id IN (SELECT id FROM _legacy_demo_items);
DELETE FROM sababuka.publications WHERE id IN (SELECT id FROM _legacy_demo_publications);

ALTER TABLE sababuka.workflow_actions DISABLE TRIGGER workflow_actions_append_only;
DELETE FROM sababuka.workflow_actions
WHERE batch_id IN (SELECT id FROM _legacy_demo_batches)
   OR entity_id IN (SELECT id FROM _legacy_demo_batches)
   OR entity_id IN (SELECT id FROM _legacy_demo_publications);
ALTER TABLE sababuka.workflow_actions ENABLE TRIGGER workflow_actions_append_only;
DELETE FROM sababuka.notifications WHERE entity_type = 'data_batch' AND entity_id IN (SELECT id FROM _legacy_demo_batches);
DELETE FROM sababuka.submission_evidence WHERE batch_id IN (SELECT id FROM _legacy_demo_batches);
DELETE FROM sababuka.observations WHERE batch_id IN (SELECT id FROM _legacy_demo_batches);
DELETE FROM sababuka.data_batches WHERE id IN (SELECT id FROM _legacy_demo_batches);

-- Old E2E demo objects were tied to an RPJMD focus. Remove only that explicit
-- package; master RPJMD objects and official targets remain intact.
CREATE TEMP TABLE _old_e2e_versions ON COMMIT DROP AS
SELECT iv.id FROM sababuka.indicator_versions iv
JOIN sababuka.indicators i ON i.id = iv.indicator_id
WHERE i.code = 'DEMO_E2E_INDICATOR_2026';
DELETE FROM sababuka.assistant_citations WHERE publication_item_id IN (
  SELECT pi.id FROM sababuka.publication_items pi JOIN sababuka.observations o ON o.id = pi.observation_id
  WHERE o.indicator_version_id IN (SELECT id FROM _old_e2e_versions)
);
UPDATE sababuka.publications p SET status = 'draft', activated_by = NULL, activated_at = NULL, replaced_by_id = NULL, updated_at = now()
WHERE p.id IN (
  SELECT DISTINCT pi.publication_id FROM sababuka.publication_items pi JOIN sababuka.observations o ON o.id = pi.observation_id
  WHERE o.indicator_version_id IN (SELECT id FROM _old_e2e_versions)
);
UPDATE sababuka.publications SET replaced_by_id = NULL WHERE replaced_by_id IN (
  SELECT DISTINCT pi.publication_id FROM sababuka.publication_items pi JOIN sababuka.observations o ON o.id = pi.observation_id
  WHERE o.indicator_version_id IN (SELECT id FROM _old_e2e_versions)
);
DELETE FROM sababuka.publication_items WHERE observation_id IN (SELECT o.id FROM sababuka.observations o WHERE o.indicator_version_id IN (SELECT id FROM _old_e2e_versions));
DELETE FROM sababuka.observations WHERE indicator_version_id IN (SELECT id FROM _old_e2e_versions);
DELETE FROM sababuka.targets WHERE indicator_version_id IN (SELECT id FROM _old_e2e_versions);
DELETE FROM sababuka.indicator_organizations WHERE indicator_version_id IN (SELECT id FROM _old_e2e_versions);
DELETE FROM sababuka.indicator_versions WHERE id IN (SELECT id FROM _old_e2e_versions);
DELETE FROM sababuka.indicators WHERE code = 'DEMO_E2E_INDICATOR_2026';
DELETE FROM sababuka.categories WHERE code = 'DEMO_E2E_CATEGORY_2026';

-- RPJMD is the official master catalog. Every master row starts in draft and
-- can only enter the workflow through explicit review actions.
UPDATE sababuka.categories c
SET review_status = 'draft', submitted_by = NULL, submitted_at = NULL,
    decided_by = NULL, decided_at = NULL, decision_notes = 'Master RPJMD; menunggu keputusan BAPPERIDA.', updated_at = now()
WHERE c.code LIKE 'RPJMD\_%' ESCAPE '\';
UPDATE sababuka.indicator_versions iv
SET status = 'draft', submitted_by = NULL, submitted_at = NULL,
    approved_by = NULL, approved_at = NULL, bapperida_reviewed_by = NULL,
    bapperida_reviewed_at = NULL, opd_verified_by = NULL, opd_verified_at = NULL,
    change_notes = 'Master RPJMD; menunggu alur review resmi.', updated_at = now()
FROM sababuka.indicators i JOIN sababuka.categories c ON c.id = i.category_id
WHERE iv.indicator_id = i.id AND c.code LIKE 'RPJMD\_%' ESCAPE '\';

INSERT INTO sababuka.policy_focuses (code, name, description, display_order, is_active, created_by)
VALUES
  ('DEMO_PRESENTATION', '[DEMO] Paket Presentasi', 'Paket terisolasi untuk ekspose; bukan master RPJMD.', 900, true, (SELECT id FROM sababuka.users WHERE email = 'superadmin@sababuka.local' LIMIT 1)),
  ('DEMO_PRACTICE', '[DEMO] Paket Latihan Peserta', 'Paket terisolasi untuk latihan alur; bukan master RPJMD.', 901, true, (SELECT id FROM sababuka.users WHERE email = 'superadmin@sababuka.local' LIMIT 1))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, display_order = EXCLUDED.display_order, is_active = true, archived_at = NULL;

INSERT INTO sababuka.categories (code, name, description, policy_focus_id, display_order, is_active, archived_at, created_by, review_status, decision_notes)
SELECT x.code, x.name, x.description, pf.id, x.display_order, true, NULL, u.id, 'draft', x.decision_notes
FROM (VALUES
  ('DEMO_PRESENTATION_CATEGORY', '[DEMO PRESENTASI] Capaian layanan', 'DEMO_PACKAGE=DEMO_PRESENTATION; tidak terkait kategori RPJMD.', 'DEMO_PRESENTATION', 900, 'Paket presentasi; menunggu keputusan BAPPERIDA.'),
  ('DEMO_PRACTICE_CATEGORY', '[DEMO LATIHAN PESERTA] Capaian layanan', 'DEMO_PACKAGE=DEMO_PRACTICE; tidak terkait kategori RPJMD.', 'DEMO_PRACTICE', 901, 'Paket latihan; menunggu keputusan BAPPERIDA.')
) AS x(code, name, description, focus_code, display_order, decision_notes)
JOIN sababuka.policy_focuses pf ON pf.code = x.focus_code
LEFT JOIN sababuka.users u ON u.email = 'superadmin@sababuka.local'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, policy_focus_id = EXCLUDED.policy_focus_id, display_order = EXCLUDED.display_order, is_active = true, archived_at = NULL;

INSERT INTO sababuka.indicators (code, name, category_id, owner_organization_id, is_active, archived_at, created_by)
SELECT x.code, x.name, c.id, o.id, true, NULL, u.id
FROM (VALUES
  ('DEMO_PRESENTATION_INDICATOR', '[DEMO PRESENTASI] Nilai capaian layanan', 'DEMO_PRESENTATION_CATEGORY'),
  ('DEMO_PRACTICE_INDICATOR', '[DEMO LATIHAN PESERTA] Nilai capaian layanan', 'DEMO_PRACTICE_CATEGORY')
) AS x(code, name, category_code)
JOIN sababuka.categories c ON c.code = x.category_code
LEFT JOIN sababuka.organizations o ON o.code = 'DKPP'
LEFT JOIN sababuka.users u ON u.email = 'superadmin@sababuka.local'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, owner_organization_id = EXCLUDED.owner_organization_id, is_active = true, archived_at = NULL;

INSERT INTO sababuka.indicator_versions
  (indicator_id, version_number, definition, formula, unit_id, frequency, data_type, dimension_schema, access_level, effective_from, status, change_notes, created_by)
SELECT i.id, 1, 'Nilai demonstrasi untuk latihan alur SABABUKA; bukan realisasi resmi.', NULL, u.id, 'annual', 'number', '{}'::jsonb, 'internal', DATE '2026-01-01', 'draft', 'Paket demo terisolasi; belum melalui review.', a.id
FROM sababuka.indicators i
JOIN sababuka.units u ON u.code = 'NUMBER'
LEFT JOIN sababuka.users a ON a.email = 'superadmin@sababuka.local'
WHERE i.code IN ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRACTICE_INDICATOR')
ON CONFLICT (indicator_id, version_number) DO UPDATE SET definition = EXCLUDED.definition, unit_id = EXCLUDED.unit_id, frequency = EXCLUDED.frequency, data_type = EXCLUDED.data_type, dimension_schema = EXCLUDED.dimension_schema, access_level = EXCLUDED.access_level, effective_from = EXCLUDED.effective_from, status = 'draft', submitted_by = NULL, submitted_at = NULL, approved_by = NULL, approved_at = NULL, bapperida_reviewed_by = NULL, bapperida_reviewed_at = NULL, opd_verified_by = NULL, opd_verified_at = NULL;

INSERT INTO sababuka.indicator_organizations (indicator_version_id, organization_id, responsibility, is_primary)
SELECT iv.id, o.id, 'primary_producer', true
FROM sababuka.indicator_versions iv
JOIN sababuka.indicators i ON i.id = iv.indicator_id
JOIN sababuka.organizations o ON o.code = 'DKPP'
WHERE i.code IN ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRACTICE_INDICATOR') AND iv.version_number = 1
ON CONFLICT (indicator_version_id, organization_id, responsibility) DO UPDATE SET is_primary = true;

INSERT INTO sababuka.targets (indicator_version_id, period_id, numeric_value, notes, created_by)
SELECT iv.id, p.id, x.value, 'DEMO_PACKAGE=' || x.package_code || '; target latihan, bukan target RPJMD.', u.id
FROM (VALUES ('DEMO_PRESENTATION_INDICATOR', 'DEMO_PRESENTATION', 80::numeric), ('DEMO_PRACTICE_INDICATOR', 'DEMO_PRACTICE', 70::numeric)) AS x(indicator_code, package_code, value)
JOIN sababuka.indicators i ON i.code = x.indicator_code
JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.version_number = 1
JOIN sababuka.periods p ON p.code = '2026'
LEFT JOIN sababuka.users u ON u.email = 'superadmin@sababuka.local'
ON CONFLICT (indicator_version_id, period_id, geography_id, dimension_hash) DO UPDATE SET numeric_value = EXCLUDED.numeric_value, text_value = NULL, notes = EXCLUDED.notes;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('021', 'isolate two demo packages, clean legacy test submissions, and reset RPJMD to draft')
ON CONFLICT (version) DO NOTHING;

COMMIT;
