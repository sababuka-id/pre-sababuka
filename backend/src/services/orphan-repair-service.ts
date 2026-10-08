import type { Database, QueryResultRow } from "../database.js";

type QueryExecutor = Pick<Database, "query">;

export interface OrphanReport {
  notifications: number;
  publication_items: number;
  workflow_actions: number;
  submission_evidence: number;
  audit_events: number;
}

const orphanNotificationPredicate = `
  (n.entity_type IN ('data_batch', 'submission') AND NOT EXISTS (
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
  ))
  OR (n.entity_type = 'policy_focus' AND NOT EXISTS (
    SELECT 1 FROM sababuka.policy_focuses pf WHERE pf.id = n.entity_id
  ))
  OR (n.entity_type = 'indicator' AND NOT EXISTS (
    SELECT 1 FROM sababuka.indicators i WHERE i.id = n.entity_id
  ))
  OR (n.entity_type = 'dataset' AND NOT EXISTS (
    SELECT 1 FROM sababuka.datasets d WHERE d.id = n.entity_id
  ))
  OR (n.entity_type = 'dataset_version' AND NOT EXISTS (
    SELECT 1 FROM sababuka.dataset_versions dv WHERE dv.id = n.entity_id
  ))
  OR (n.entity_type = 'data_source' AND NOT EXISTS (
    SELECT 1 FROM sababuka.data_sources ds WHERE ds.id = n.entity_id
  ))
  OR (n.entity_type = 'indicator_source_mapping' AND NOT EXISTS (
    SELECT 1 FROM sababuka.indicator_source_mappings m WHERE m.id = n.entity_id
  ))
  OR (n.entity_type = 'connector_run' AND NOT EXISTS (
    SELECT 1 FROM sababuka.connector_runs cr WHERE cr.id = n.entity_id
  ))
  OR (n.entity_type = 'publication_item' AND NOT EXISTS (
    SELECT 1 FROM sababuka.publication_items pi WHERE pi.id = n.entity_id
  ))`;

export async function inspectOrphans(db: QueryExecutor): Promise<OrphanReport> {
  const result = await db.query<QueryResultRow & OrphanReport>(`
    SELECT
      (SELECT count(*)::int FROM sababuka.notifications n WHERE ${orphanNotificationPredicate}) AS notifications,
      (SELECT count(*)::int FROM sababuka.publication_items pi
       LEFT JOIN sababuka.publications p ON p.id = pi.publication_id
       LEFT JOIN sababuka.observations o ON o.id = pi.observation_id
       WHERE p.id IS NULL OR o.id IS NULL) AS publication_items,
      (SELECT count(*)::int FROM sababuka.workflow_actions wa
       WHERE (wa.entity_type = 'data_batch' AND NOT EXISTS (SELECT 1 FROM sababuka.data_batches b WHERE b.id = wa.entity_id))
          OR (wa.entity_type = 'publication' AND NOT EXISTS (SELECT 1 FROM sababuka.publications p WHERE p.id = wa.entity_id))
          OR (wa.entity_type = 'indicator_version' AND NOT EXISTS (SELECT 1 FROM sababuka.indicator_versions iv WHERE iv.id = wa.entity_id))
          OR (wa.entity_type = 'dataset_version' AND NOT EXISTS (SELECT 1 FROM sababuka.dataset_versions dv WHERE dv.id = wa.entity_id))) AS workflow_actions,
      (SELECT count(*)::int FROM sababuka.submission_evidence e
       LEFT JOIN sababuka.data_batches b ON b.id = e.batch_id
       WHERE b.id IS NULL) AS submission_evidence,
      (SELECT count(*)::int FROM sababuka.audit_events ae
       WHERE (ae.entity_type = 'data_batch' AND NOT EXISTS (SELECT 1 FROM sababuka.data_batches b WHERE b.id = ae.entity_id))
          OR (ae.entity_type = 'publication' AND NOT EXISTS (SELECT 1 FROM sababuka.publications p WHERE p.id = ae.entity_id))
          OR (ae.entity_type = 'indicator_version' AND NOT EXISTS (SELECT 1 FROM sababuka.indicator_versions iv WHERE iv.id = ae.entity_id))
          OR (ae.entity_type = 'indicator' AND NOT EXISTS (SELECT 1 FROM sababuka.indicators i WHERE i.id = ae.entity_id))
          OR (ae.entity_type = 'category' AND NOT EXISTS (SELECT 1 FROM sababuka.categories c WHERE c.id = ae.entity_id))
          OR (ae.entity_type = 'policy_focus' AND NOT EXISTS (SELECT 1 FROM sababuka.policy_focuses pf WHERE pf.id = ae.entity_id))
          OR (ae.entity_type = 'dataset_version' AND NOT EXISTS (SELECT 1 FROM sababuka.dataset_versions dv WHERE dv.id = ae.entity_id))
          OR (ae.entity_type = 'data_source' AND NOT EXISTS (SELECT 1 FROM sababuka.data_sources ds WHERE ds.id = ae.entity_id))
          OR (ae.entity_type = 'indicator_source_mapping' AND NOT EXISTS (SELECT 1 FROM sababuka.indicator_source_mappings m WHERE m.id = ae.entity_id))
          OR (ae.entity_type = 'connector_run' AND NOT EXISTS (SELECT 1 FROM sababuka.connector_runs cr WHERE cr.id = ae.entity_id))) AS audit_events`);
  const row = result.rows[0] ?? {
    notifications: 0,
    publication_items: 0,
    workflow_actions: 0,
    submission_evidence: 0,
    audit_events: 0,
  };
  return {
    notifications: Number(row.notifications ?? 0),
    publication_items: Number(row.publication_items ?? 0),
    workflow_actions: Number(row.workflow_actions ?? 0),
    submission_evidence: Number(row.submission_evidence ?? 0),
    audit_events: Number(row.audit_events ?? 0),
  };
}

/** Delete only ephemeral notifications whose typed target is provably gone. */
export async function cleanupOrphanNotifications(db: QueryExecutor): Promise<number> {
  const result = await db.query(
    `DELETE FROM sababuka.notifications n WHERE ${orphanNotificationPredicate}`,
  );
  return result.rowCount ?? 0;
}
