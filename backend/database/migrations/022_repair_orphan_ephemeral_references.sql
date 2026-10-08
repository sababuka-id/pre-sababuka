BEGIN;

-- Notifications are polymorphic and ephemeral. Remove only notifications whose
-- typed target is gone; retain audit and append-only workflow history.
DELETE FROM sababuka.notifications n
WHERE (n.entity_type IN ('data_batch', 'submission') AND NOT EXISTS (
    SELECT 1 FROM sababuka.data_batches b WHERE b.id = n.entity_id
  ))
   OR (n.entity_type = 'publication' AND NOT EXISTS (
    SELECT 1 FROM sababuka.publications p WHERE p.id = n.entity_id
  ))
   OR (n.entity_type = 'indicator_version' AND NOT EXISTS (
    SELECT 1 FROM sababuka.indicator_versions iv WHERE iv.id = n.entity_id
  ))
   OR (n.entity_type = 'category' AND NOT EXISTS (
    SELECT 1 FROM sababuka.categories c WHERE c.id = n.entity_id
  ));

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('022', 'repair orphaned ephemeral notifications and retain audit history')
ON CONFLICT (version) DO NOTHING;

COMMIT;
