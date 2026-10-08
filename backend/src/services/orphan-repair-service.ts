import type { Database, QueryResultRow } from "../database.js";

type QueryExecutor = Pick<Database, "query">;

export interface OrphanReport {
  notifications: number;
  publication_items: number;
  workflow_actions: number;
  submission_evidence: number;
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
       WHERE b.id IS NULL) AS submission_evidence`);
  const row = result.rows[0] ?? { notifications: 0, publication_items: 0, workflow_actions: 0, submission_evidence: 0 };
  return {
    notifications: Number(row.notifications ?? 0),
    publication_items: Number(row.publication_items ?? 0),
    workflow_actions: Number(row.workflow_actions ?? 0),
    submission_evidence: Number(row.submission_evidence ?? 0),
  };
}

/** Delete only ephemeral notifications whose typed target is provably gone. */
export async function cleanupOrphanNotifications(db: QueryExecutor): Promise<number> {
  const result = await db.query(
    `DELETE FROM sababuka.notifications n WHERE ${orphanNotificationPredicate}`,
  );
  return result.rowCount ?? 0;
}
