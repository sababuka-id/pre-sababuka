import type { FastifyInstance } from "fastify";
import { requirePermission } from "../plugins/authentication.js";

const uuid = { type: "string", format: "uuid" } as const;

export async function executiveRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { policy_focus_id?: string; period_id?: string } }>("/executive/dashboard", {
    schema: { querystring: { type: "object", additionalProperties: false, properties: { policy_focus_id: uuid, period_id: uuid } } },
  }, async (request) => {
    requirePermission(request, "executive_dashboard.view");
    const [metrics, items] = await Promise.all([
      app.db.query(`SELECT
        (SELECT count(*)::int FROM sababuka.indicator_versions WHERE status = 'active') AS active_indicators,
        (SELECT count(*)::int FROM sababuka.data_batches WHERE status = 'approved') AS approved_submissions,
        (SELECT count(DISTINCT organization_id)::int FROM sababuka.data_batches WHERE status = 'approved') AS covered_organizations,
        (SELECT count(*)::int FROM sababuka.publications WHERE status = 'active') AS active_publications`),
      app.db.query(
        `SELECT i.id::text AS indicator_id, i.code AS indicator_code, i.name AS indicator_name,
                c.name AS category_name, pf.id::text AS policy_focus_id, pf.name AS policy_focus_name,
                per.id::text AS period_id, per.label AS period_label, u.name AS unit,
                u.symbol AS unit_symbol, obs.numeric_value, obs.text_value,
                pi.id::text AS publication_item_id, pub.title AS publication_title,
                pub.effective_at::text, org.name AS organization_name,
                COALESCE(obs.source_name, iv.source_reference, d.title) AS source,
                obs.source_url, obs.source_status, obs.source_retrieved_at::text
         FROM sababuka.publication_items pi
         JOIN sababuka.publications pub ON pub.id = pi.publication_id AND pub.status = 'active'
         JOIN sababuka.observations obs ON obs.id = pi.observation_id
         JOIN sababuka.indicator_versions iv ON iv.id = obs.indicator_version_id
         JOIN sababuka.indicators i ON i.id = iv.indicator_id
         JOIN sababuka.categories c ON c.id = i.category_id
         LEFT JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id
         JOIN sababuka.periods per ON per.id = obs.period_id
         JOIN sababuka.units u ON u.id = iv.unit_id
         JOIN sababuka.data_batches b ON b.id = obs.batch_id AND b.status IN ('approved', 'published')
         JOIN sababuka.organizations org ON org.id = b.organization_id
         JOIN sababuka.dataset_versions dv ON dv.id = pi.dataset_version_id
         JOIN sababuka.datasets d ON d.id = dv.dataset_id
         WHERE iv.status = 'active'
           AND c.review_status = 'approved'
           AND ($1::uuid IS NULL OR pf.id = $1) AND ($2::uuid IS NULL OR per.id = $2)
         ORDER BY c.display_order, pi.display_order, i.name`,
        [request.query.policy_focus_id ?? null, request.query.period_id ?? null],
      ),
    ]);
    return { generated_at: new Date().toISOString(), metrics: metrics.rows[0], items: items.rows };
  });
}
