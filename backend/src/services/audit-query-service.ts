import type { Database, QueryResultRow } from "../database.js";
import type { AuthContext } from "../types/auth.js";
interface Counted extends QueryResultRow { total_count: string }
export class AuditQueryService {
  constructor(private readonly db: Database) {}
  async list(auth: AuthContext, query: { page: number; pageSize: number; eventType?: string | undefined; entityType?: string | undefined; actorId?: string | undefined; sortBy?: string | undefined; sortOrder?: "asc" | "desc" | undefined }) {
    const global = auth.user.roles.some((role) => role.scope_type === "global");
    const organizations = [...new Set([...auth.user.organizations.map((item) => item.id), ...auth.user.roles.flatMap((role) => role.organization_id ? [role.organization_id] : [])])];
    const orderColumns: Record<string, string> = { occurred_at: "ae.occurred_at", event_type: "ae.event_type", entity_type: "ae.entity_type", actor: "u.full_name", organization: "o.name" };
    const orderColumn = orderColumns[query.sortBy ?? "occurred_at"] ?? orderColumns.occurred_at!;
    const orderDirection = query.sortOrder === "asc" ? "ASC" : "DESC";
    const result = await this.db.query<Counted & Record<string, unknown>>(
      `SELECT ae.id::text, ae.actor_id::text, u.full_name AS actor_name, ae.organization_id::text,
              o.name AS organization_name, ae.event_type, ae.entity_type, ae.entity_id::text,
              ae.metadata, ae.request_id::text, ae.ip_address::text, ae.occurred_at::text,
              count(*) OVER()::text AS total_count
       FROM sababuka.audit_events ae LEFT JOIN sababuka.users u ON u.id = ae.actor_id
       LEFT JOIN sababuka.organizations o ON o.id = ae.organization_id
       WHERE ($1::boolean OR ae.organization_id = ANY($2::uuid[]))
         AND ($3::text IS NULL OR ae.event_type = $3) AND ($4::text IS NULL OR ae.entity_type = $4)
         AND ($5::uuid IS NULL OR ae.actor_id = $5)
       ORDER BY ${orderColumn} ${orderDirection} NULLS LAST, ae.occurred_at DESC, ae.id DESC LIMIT $6 OFFSET $7`,
      [global, organizations, query.eventType ?? null, query.entityType ?? null, query.actorId ?? null, query.pageSize, (query.page - 1) * query.pageSize],
    );
    const total = Number(result.rows[0]?.total_count ?? 0);
    return { data: result.rows.map(({ total_count: _, ...row }) => row), meta: { page: query.page, page_size: query.pageSize, total_items: total, total_pages: total ? Math.ceil(total / query.pageSize) : 0 } };
  }
}
