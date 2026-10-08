import { resolve, relative, sep } from "node:path";
import { unlink } from "node:fs/promises";
import type { Database } from "../database.js";
import type { AuthContext } from "../types/auth.js";
import { ApiError } from "../errors.js";
import { recordAudit, type AuditContext } from "./audit-service.js";
import { cleanupOrphanNotifications } from "./orphan-repair-service.js";

export const DEMO_PACKAGE_CODES = ["DEMO_PRESENTATION", "DEMO_PRACTICE"] as const;
const CATEGORY_CODES = ["DEMO_PRESENTATION_CATEGORY", "DEMO_PRACTICE_CATEGORY"] as const;
const INDICATOR_CODES = ["DEMO_PRESENTATION_INDICATOR", "DEMO_PRACTICE_INDICATOR"] as const;

export interface DemoResetSummary {
  packages: string[];
  categories_reset: number;
  indicators_reset: number;
  indicator_versions_reset: number;
  targets_preserved: number;
  publications_removed: number;
  publication_items_removed: number;
  batches_removed: number;
  observations_removed: number;
  evidence_removed: number;
  workflow_actions_removed: number;
  notifications_removed: number;
  orphan_notifications_removed: number;
  evidence_files_removed: number;
}

function emptySummary(): DemoResetSummary {
  return { packages: [...DEMO_PACKAGE_CODES], categories_reset: 0, indicators_reset: 0,
    indicator_versions_reset: 0, targets_preserved: 0, publications_removed: 0,
    publication_items_removed: 0, batches_removed: 0, observations_removed: 0,
    evidence_removed: 0, workflow_actions_removed: 0, notifications_removed: 0,
    evidence_files_removed: 0, orphan_notifications_removed: 0 };
}

export class DemoService {
  constructor(private readonly db: Database, private readonly evidenceStoragePath: string) {}

  async reset(auth: AuthContext, audit: AuditContext): Promise<DemoResetSummary> {
    if (!auth.user.roles.some((role) => role.code === "superadmin" && role.scope_type === "global")) {
      throw new ApiError(403, "PERMISSION_DENIED", "Reset data demo hanya tersedia untuk Superadmin.");
    }
    const client = await this.db.connect();
    const summary = emptySummary();
    const evidenceKeys: string[] = [];
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('sababuka.demo.reset', 0))");
      const versions = await client.query<{ id: string }>(
        `SELECT iv.id::text FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id = iv.indicator_id WHERE i.code = ANY($1::text[])`, [INDICATOR_CODES],
      );
      const versionIds = versions.rows.map((row) => row.id);
      const batches = await client.query<{ id: string }>(
        `SELECT DISTINCT b.id::text FROM sababuka.data_batches b LEFT JOIN sababuka.observations o ON o.batch_id = b.id
         WHERE b.source_metadata->>'demo_package' = ANY($1::text[]) OR o.indicator_version_id = ANY($2::uuid[])`, [DEMO_PACKAGE_CODES, versionIds],
      );
      const batchIds = batches.rows.map((row) => row.id);
      const observations = await client.query<{ id: string }>(
        `SELECT o.id::text FROM sababuka.observations o WHERE o.batch_id = ANY($1::uuid[]) OR o.indicator_version_id = ANY($2::uuid[])`, [batchIds, versionIds],
      );
      const observationIds = observations.rows.map((row) => row.id);
      const publications = await client.query<{ id: string }>(
        `SELECT DISTINCT p.id::text FROM sababuka.publications p LEFT JOIN sababuka.publication_items pi ON pi.publication_id = p.id
         WHERE p.publication_key LIKE 'DEMO_PRESENTATION%' OR p.publication_key LIKE 'DEMO_PRACTICE%' OR pi.observation_id = ANY($1::uuid[])`, [observationIds],
      );
      const publicationIds = publications.rows.map((row) => row.id);
      const items = await client.query<{ id: string }>(
        `SELECT pi.id::text FROM sababuka.publication_items pi WHERE pi.publication_id = ANY($1::uuid[])`, [publicationIds],
      );
      const itemIds = items.rows.map((row) => row.id);
      const evidence = await client.query<{ storage_key: string }>(
        `SELECT storage_key FROM sababuka.submission_evidence WHERE batch_id = ANY($1::uuid[])`, [batchIds],
      );
      evidenceKeys.push(...evidence.rows.map((row) => row.storage_key));

      await client.query(`UPDATE sababuka.publications SET status = 'draft', activated_by = NULL, activated_at = NULL, replaced_by_id = NULL, updated_at = now() WHERE id = ANY($1::uuid[])`, [publicationIds]);
      await client.query(`DELETE FROM sababuka.assistant_citations WHERE publication_item_id = ANY($1::uuid[])`, [itemIds]);
      const itemDelete = await client.query(`DELETE FROM sababuka.publication_items WHERE id = ANY($1::uuid[])`, [itemIds]);
      const pubDelete = await client.query(`DELETE FROM sababuka.publications WHERE id = ANY($1::uuid[])`, [publicationIds]);
      summary.publication_items_removed = itemDelete.rowCount ?? 0;
      summary.publications_removed = pubDelete.rowCount ?? 0;

      await client.query("ALTER TABLE sababuka.workflow_actions DISABLE TRIGGER workflow_actions_append_only");
      const workflowDelete = await client.query(
        `DELETE FROM sababuka.workflow_actions WHERE entity_id = ANY($1::uuid[]) OR batch_id = ANY($2::uuid[])`, [versionIds.concat(publicationIds), batchIds],
      );
      await client.query("ALTER TABLE sababuka.workflow_actions ENABLE TRIGGER workflow_actions_append_only");
      summary.workflow_actions_removed = workflowDelete.rowCount ?? 0;
      const notificationDelete = await client.query(`DELETE FROM sababuka.notifications WHERE entity_type = 'data_batch' AND entity_id = ANY($1::uuid[])`, [batchIds]);
      summary.notifications_removed = notificationDelete.rowCount ?? 0;
      summary.orphan_notifications_removed = await cleanupOrphanNotifications(client);
      const evidenceDelete = await client.query(`DELETE FROM sababuka.submission_evidence WHERE batch_id = ANY($1::uuid[])`, [batchIds]);
      summary.evidence_removed = evidenceDelete.rowCount ?? 0;
      await client.query(`DELETE FROM sababuka.validation_issues WHERE batch_id = ANY($1::uuid[])`, [batchIds]);
      const observationDelete = await client.query(`DELETE FROM sababuka.observations WHERE batch_id = ANY($1::uuid[]) OR indicator_version_id = ANY($2::uuid[])`, [batchIds, versionIds]);
      summary.observations_removed = observationDelete.rowCount ?? 0;
      const batchDelete = await client.query(`DELETE FROM sababuka.data_batches WHERE id = ANY($1::uuid[])`, [batchIds]);
      summary.batches_removed = batchDelete.rowCount ?? 0;

      const categoryReset = await client.query(
        `UPDATE sababuka.categories SET review_status = 'draft', submitted_by = NULL, submitted_at = NULL, decided_by = NULL, decided_at = NULL, decision_notes = 'Paket demo direset; siap untuk latihan ulang.', updated_at = now() WHERE code = ANY($1::text[])`, [CATEGORY_CODES],
      );
      summary.categories_reset = categoryReset.rowCount ?? 0;
      const versionReset = await client.query(
        `UPDATE sababuka.indicator_versions iv SET status = 'draft', submitted_by = NULL, submitted_at = NULL, approved_by = NULL, approved_at = NULL, bapperida_reviewed_by = NULL, bapperida_reviewed_at = NULL, opd_verified_by = NULL, opd_verified_at = NULL, change_notes = 'Paket demo direset; siap untuk latihan ulang.', updated_at = now() FROM sababuka.indicators i WHERE iv.indicator_id = i.id AND i.code = ANY($1::text[])`, [INDICATOR_CODES],
      );
      summary.indicator_versions_reset = versionReset.rowCount ?? 0;
      const indicatorCount = await client.query(`SELECT count(*)::int AS count FROM sababuka.indicators WHERE code = ANY($1::text[])`, [INDICATOR_CODES]);
      summary.indicators_reset = Number(indicatorCount.rows[0]?.count ?? 0);
      const targetCount = await client.query(`SELECT count(*)::int AS count FROM sababuka.targets WHERE indicator_version_id = ANY($1::uuid[])`, [versionIds]);
      summary.targets_preserved = Number(targetCount.rows[0]?.count ?? 0);
      await recordAudit(client, { ...audit, eventType: "demo.reset", entityType: "demo_package", entityId: null, afterData: summary as unknown as Record<string, unknown>, metadata: { packages: summary.packages, allowlist: [...CATEGORY_CODES, ...INDICATOR_CODES] } });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const root = resolve(this.evidenceStoragePath);
    for (const key of evidenceKeys) {
      const file = resolve(root, key);
      const rel = relative(root, file);
      if (rel.startsWith(".." + sep) || rel === ".." || rel.includes(".." + sep)) continue;
      try { await unlink(file); summary.evidence_files_removed += 1; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("Gagal menghapus bukti demo", error); }
    }
    return summary;
  }
}
