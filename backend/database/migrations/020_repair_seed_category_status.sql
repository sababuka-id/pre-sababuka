BEGIN;

-- Migration 017 marked every non-RPJMD category as approved so the early
-- pilot could be displayed. Those rows were never approved through the
-- category workflow and have no category.approve audit event. Return only
-- those seed/backfill rows to the initial draft state. A category with an
-- actual category.approve audit event is left untouched.
UPDATE sababuka.categories AS c
SET review_status = 'draft',
    submitted_by = NULL,
    submitted_at = NULL,
    decided_by = NULL,
    decided_at = NULL,
    decision_notes = 'Usulan awal; menunggu keputusan BAPPERIDA.',
    updated_at = now()
WHERE c.review_status = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM sababuka.audit_events AS ae
    WHERE ae.entity_type = 'category'
      AND ae.entity_id = c.id
      AND ae.event_type = 'category.approve'
  );

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('020', 'repair seed-approved categories without workflow approval')
ON CONFLICT (version) DO NOTHING;

COMMIT;
