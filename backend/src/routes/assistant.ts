import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { AssistantService } from "../services/assistant-service.js";
const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new AssistantService(request.server.db);
export async function assistantRoutes(app: FastifyInstance) {
  app.post<{ Body?: { title?: string } }>("/assistant/sessions", { schema: { body: { type: "object", additionalProperties: false, properties: { title: { type: "string", maxLength: 255 } } } } }, async (request, reply) => { requireCsrf(request); requirePermission(request, "assistant.use"); return reply.code(201).send(await service(request).createSession(request.auth!, request.body?.title?.trim() || null, requestAuditContext(request))); });
  app.post<{ Params: { session_id: string }; Body: { message: string } }>("/assistant/sessions/:session_id/messages", { schema: { params: { type: "object", additionalProperties: false, required: ["session_id"], properties: { session_id: uuid } }, body: { type: "object", additionalProperties: false, required: ["message"], properties: { message: { type: "string", minLength: 2, maxLength: 4000 } } } } }, async (request) => { requireCsrf(request); requirePermission(request, "assistant.use"); return service(request).ask(request.auth!, request.params.session_id, request.body.message.trim(), requestAuditContext(request)); });
}
