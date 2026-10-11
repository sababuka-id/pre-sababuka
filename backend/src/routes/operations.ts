import type { FastifyInstance } from "fastify";
import { requirePermission } from "../plugins/authentication.js";

const uuid = { type: "string", format: "uuid" } as const;

export async function operationRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { period_id?: string } }>("/operations/dashboard", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: { period_id: uuid },
      },
    },
  }, async (request) => {
    requirePermission(request, "submission.view");
    const auth = request.auth!;
    const global = auth.user.roles.some((role) => role.scope_type === "global");
    const organizations = [...new Set([...auth.user.organizations.map((item) => item.id), ...auth.user.roles.flatMap((role) => role.organization_id ? [role.organization_id] : [])])];
    const params = [global, organizations, request.query.period_id ?? null] as const;
    const [status, indicators, organizationsSummary, recent, governanceTasks, publicationTasks] = await Promise.all([
      app.db.query<{ status: string; count: number }>(
        `SELECT b.status, count(*)::int AS count FROM sababuka.data_batches b
         JOIN sababuka.dataset_versions dv ON dv.id = b.dataset_version_id JOIN sababuka.datasets d ON d.id = dv.dataset_id
         WHERE d.code = 'SABABUKA.CAPAIAN_MANUAL' AND ($1::boolean OR b.organization_id = ANY($2::uuid[]))
           AND ($3::uuid IS NULL OR b.reporting_period_id = $3) GROUP BY b.status`, params),
      app.db.query<{ count: number }>(
        `SELECT count(DISTINCT iv.id)::int AS count FROM sababuka.indicator_versions iv JOIN sababuka.indicators i ON i.id = iv.indicator_id
         WHERE iv.status = 'active' AND ($1::boolean OR i.owner_organization_id = ANY($2::uuid[]) OR EXISTS
           (SELECT 1 FROM sababuka.indicator_organizations io WHERE io.indicator_version_id = iv.id AND io.organization_id = ANY($2::uuid[])))`, [global, organizations]),
      app.db.query(
        `SELECT o.id::text AS organization_id, o.code, COALESCE(o.short_name, o.name) AS organization_name,
                count(b.id)::int AS total_forms,
                count(b.id) FILTER (WHERE b.status IN ('submitted','under_review'))::int AS pending_review,
                count(b.id) FILTER (WHERE b.status = 'returned')::int AS returned,
                count(b.id) FILTER (WHERE b.status = 'approved')::int AS approved
         FROM sababuka.organizations o LEFT JOIN sababuka.data_batches b ON b.organization_id = o.id
           AND ($3::uuid IS NULL OR b.reporting_period_id = $3)
           AND EXISTS (SELECT 1 FROM sababuka.dataset_versions dv JOIN sababuka.datasets d ON d.id = dv.dataset_id
                       WHERE dv.id = b.dataset_version_id AND d.code = 'SABABUKA.CAPAIAN_MANUAL')
         WHERE o.archived_at IS NULL AND ($1::boolean OR o.id = ANY($2::uuid[]))
         GROUP BY o.id ORDER BY pending_review DESC, organization_name, o.code, o.id LIMIT 50`, params),
      app.db.query(
        `SELECT b.id::text, o.code AS organization_code, COALESCE(o.short_name,o.name) AS organization_name,
                p.label AS period_label, b.status, b.row_count, b.updated_at::text
         FROM sababuka.data_batches b JOIN sababuka.organizations o ON o.id = b.organization_id
         JOIN sababuka.dataset_versions dv ON dv.id = b.dataset_version_id JOIN sababuka.datasets d ON d.id = dv.dataset_id AND d.code = 'SABABUKA.CAPAIAN_MANUAL'
         LEFT JOIN sababuka.periods p ON p.id = b.reporting_period_id
         WHERE ($1::boolean OR b.organization_id = ANY($2::uuid[])) AND ($3::uuid IS NULL OR b.reporting_period_id = $3)
         ORDER BY b.updated_at DESC, b.id DESC LIMIT 10`, params),
      app.db.query<{ categories_in_review: number; indicators_in_review: number; indicators_opd_verification: number }>(
        `SELECT
           (SELECT count(*)::int FROM sababuka.categories c
            WHERE c.is_active = true AND c.review_status = 'in_review') AS categories_in_review,
           count(*) FILTER (WHERE iv.status = 'in_review')::int AS indicators_in_review,
           count(*) FILTER (WHERE iv.status = 'opd_verification')::int AS indicators_opd_verification
         FROM sababuka.indicator_versions iv
         JOIN sababuka.indicators i ON i.id = iv.indicator_id AND i.is_active = true
         WHERE ($1::boolean OR i.owner_organization_id = ANY($2::uuid[]) OR EXISTS (
           SELECT 1 FROM sababuka.indicator_organizations io
           WHERE io.indicator_version_id = iv.id AND io.organization_id = ANY($2::uuid[])))`,
        [global, organizations]),
      app.db.query<{ draft_publications: number; publications_to_reconcile: number }>(
        `SELECT
           count(*) FILTER (WHERE p.status = 'draft')::int AS draft_publications,
           count(*) FILTER (WHERE p.status = 'active' AND EXISTS (
             SELECT 1 FROM sababuka.publication_items pi
             JOIN sababuka.observations obs ON obs.id = pi.observation_id
             JOIN sababuka.data_batches b ON b.id = obs.batch_id
             JOIN sababuka.indicator_versions iv ON iv.id = obs.indicator_version_id
             JOIN sababuka.indicators i ON i.id = iv.indicator_id
             JOIN sababuka.categories c ON c.id = i.category_id
             WHERE pi.publication_id = p.id
               AND NOT (b.status IN ('approved','published') AND iv.status = 'active'
                        AND i.is_active = true AND c.is_active = true AND c.review_status = 'approved')
           ))::int AS publications_to_reconcile
         FROM sababuka.publications p`),
    ]);
    const byStatus = Object.fromEntries(status.rows.map((row) => [row.status, row.count]));
    return {
      generated_at: new Date().toISOString(),
      metrics: {
        active_indicators: indicators.rows[0]?.count ?? 0,
        draft: byStatus.draft ?? 0,
        submitted: byStatus.submitted ?? 0,
        under_review: byStatus.under_review ?? 0,
        pending_review: (byStatus.submitted ?? 0) + (byStatus.under_review ?? 0),
        returned: byStatus.returned ?? 0,
        approved: byStatus.approved ?? 0,
      },
      tasks: {
        categories_in_review: governanceTasks.rows[0]?.categories_in_review ?? 0,
        indicators_in_review: governanceTasks.rows[0]?.indicators_in_review ?? 0,
        indicators_opd_verification: governanceTasks.rows[0]?.indicators_opd_verification ?? 0,
        draft_publications: publicationTasks.rows[0]?.draft_publications ?? 0,
        publications_to_reconcile: publicationTasks.rows[0]?.publications_to_reconcile ?? 0,
      },
      organizations: organizationsSummary.rows,
      recent: recent.rows,
    };
  });
}
