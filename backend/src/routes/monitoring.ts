import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { AuditQueryService } from "../services/audit-query-service.js";
import { NotificationService } from "../services/notification-service.js";
const uuid = { type: "string", format: "uuid" } as const;
export async function monitoringRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { unread_only?: boolean } }>("/notifications", {
    schema: { querystring: { type: "object", additionalProperties: false, properties: { unread_only: { type: "boolean", default: false } } } },
  }, async (request) => new NotificationService(app.db).list(request.auth!.user.id, request.query.unread_only ?? false));
  app.post<{ Params: { notification_id: string } }>("/notifications/:notification_id/read", { schema: { params: { type: "object", required: ["notification_id"], properties: { notification_id: uuid } } } }, async (request, reply) => { requireCsrf(request); await new NotificationService(app.db).markRead(request.auth!.user.id, request.params.notification_id); return reply.code(204).send(); });
  app.post("/notifications/read-all", async (request, reply) => { requireCsrf(request); await new NotificationService(app.db).markAllRead(request.auth!.user.id); return reply.code(204).send(); });
  app.get<{ Querystring: { page?: number; page_size?: number; event_type?: string; entity_type?: string; actor_id?: string; sort_by?: string; sort_order?: "asc" | "desc" } }>("/audit/events", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          page_size: { type: "integer", minimum: 1, maximum: 100, default: 25 },
          event_type: { type: "string", maxLength: 120 },
          entity_type: { type: "string", maxLength: 120 },
          actor_id: uuid,
          sort_by: { type: "string", enum: ["occurred_at", "event_type", "entity_type", "actor", "organization"] },
          sort_order: { type: "string", enum: ["asc", "desc"] },
        },
      },
    },
  }, async (request) => {
    requirePermission(request, "audit.view");
    return new AuditQueryService(app.db).list(request.auth!, { page: request.query.page ?? 1, pageSize: request.query.page_size ?? 25, eventType: request.query.event_type, entityType: request.query.entity_type, actorId: request.query.actor_id, sortBy: request.query.sort_by, sortOrder: request.query.sort_order });
  });
}
