BEGIN;

-- Remove the isolated presentation/practice catalog and every transactional
-- record that depends on it. The RPJMD catalog (RPJMD_*) is not touched.
CREATE TEMP TABLE _removed_demo_versions ON COMMIT DROP AS
SELECT iv.id
FROM sababuka.indicator_versions iv
JOIN sababuka.indicators i ON i.id = iv.indicator_id
WHERE i.code LIKE 'DEMO\_%' ESCAPE '\';

CREATE TEMP TABLE _removed_demo_observations ON COMMIT DROP AS
WITH RECURSIVE related AS (
  SELECT o.id
  FROM sababuka.observations o
  WHERE o.indicator_version_id IN (SELECT id FROM _removed_demo_versions)
  UNION
  SELECT child.id
  FROM sababuka.observations child
  JOIN related parent ON child.supersedes_id = parent.id
)
SELECT id FROM related;

CREATE TEMP TABLE _removed_demo_batches ON COMMIT DROP AS
SELECT DISTINCT b.id
FROM sababuka.data_batches b
LEFT JOIN sababuka.observations o ON o.batch_id = b.id
WHERE o.id IN (SELECT id FROM _removed_demo_observations)
   OR b.source_metadata->>'demo' = 'true'
   OR b.source_metadata->>'demo_package' LIKE 'DEMO\_%' ESCAPE '\'
   OR b.source_metadata->>'import_key' LIKE 'DEMO\_%' ESCAPE '\';

CREATE TEMP TABLE _removed_demo_publications ON COMMIT DROP AS
SELECT DISTINCT p.id
FROM sababuka.publications p
LEFT JOIN sababuka.publication_items pi ON pi.publication_id = p.id
WHERE pi.observation_id IN (SELECT id FROM _removed_demo_observations)
   OR p.publication_key LIKE 'DEMO\_%' ESCAPE '\'
   OR p.publication_key LIKE 'AUTO\_DEMO\_%' ESCAPE '\';

CREATE TEMP TABLE _removed_demo_publication_items ON COMMIT DROP AS
SELECT pi.id
FROM sababuka.publication_items pi
WHERE pi.publication_id IN (SELECT id FROM _removed_demo_publications)
   OR pi.observation_id IN (SELECT id FROM _removed_demo_observations);

DELETE FROM sababuka.assistant_citations
WHERE publication_item_id IN (SELECT id FROM _removed_demo_publication_items);

UPDATE sababuka.publications
SET replaced_by_id = NULL
WHERE replaced_by_id IN (SELECT id FROM _removed_demo_publications);

-- Trigger integritas hanya mengizinkan penghapusan item dan publikasi berstatus
-- draft. Publikasi demo dinetralkan di dalam transaksi yang sama sebelum
-- dependensinya dibersihkan; publikasi RPJMD resmi tidak termasuk temp table.
UPDATE sababuka.publications
SET status = 'draft',
    effective_at = NULL,
    updated_at = now()
WHERE id IN (SELECT id FROM _removed_demo_publications);

DELETE FROM sababuka.publication_items
WHERE id IN (SELECT id FROM _removed_demo_publication_items);

DELETE FROM sababuka.publications
WHERE id IN (SELECT id FROM _removed_demo_publications);

ALTER TABLE sababuka.workflow_actions DISABLE TRIGGER workflow_actions_append_only;
DELETE FROM sababuka.workflow_actions
WHERE entity_id IN (SELECT id FROM _removed_demo_versions)
   OR entity_id IN (SELECT id FROM _removed_demo_publications)
   OR batch_id IN (SELECT id FROM _removed_demo_batches);
ALTER TABLE sababuka.workflow_actions ENABLE TRIGGER workflow_actions_append_only;

DELETE FROM sababuka.notifications
WHERE entity_id IN (SELECT id FROM _removed_demo_versions)
   OR entity_id IN (SELECT id FROM _removed_demo_publications)
   OR entity_id IN (SELECT id FROM _removed_demo_batches);

DELETE FROM sababuka.submission_evidence
WHERE indicator_version_id IN (SELECT id FROM _removed_demo_versions)
   OR batch_id IN (SELECT id FROM _removed_demo_batches);

DELETE FROM sababuka.validation_issues
WHERE observation_id IN (SELECT id FROM _removed_demo_observations)
   OR batch_id IN (SELECT id FROM _removed_demo_batches);

UPDATE sababuka.connector_runs
SET imported_batch_id = NULL
WHERE imported_batch_id IN (SELECT id FROM _removed_demo_batches);

DELETE FROM sababuka.observations
WHERE id IN (SELECT id FROM _removed_demo_observations);

-- A demo batch is removed only when no non-demo observation shares it.
DELETE FROM sababuka.data_batches b
WHERE b.id IN (SELECT id FROM _removed_demo_batches)
  AND NOT EXISTS (SELECT 1 FROM sababuka.observations o WHERE o.batch_id = b.id);

DELETE FROM sababuka.targets
WHERE indicator_version_id IN (SELECT id FROM _removed_demo_versions);

DELETE FROM sababuka.indicator_versions
WHERE id IN (SELECT id FROM _removed_demo_versions);

DELETE FROM sababuka.indicators
WHERE code LIKE 'DEMO\_%' ESCAPE '\';

DELETE FROM sababuka.categories
WHERE code LIKE 'DEMO\_%' ESCAPE '\';

DELETE FROM sababuka.policy_focuses
WHERE code LIKE 'DEMO\_%' ESCAPE '\';

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('033', 'remove demo focuses, categories, indicators, and dependent records')
ON CONFLICT (version) DO NOTHING;

COMMIT;
