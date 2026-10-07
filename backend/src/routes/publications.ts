import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { PublicationService, type PublicationInput } from "../services/publication-service.js";
const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new PublicationService(request.server.db);
const mutate = (request: FastifyRequest, permission: string) => { requireCsrf(request); requirePermission(request, permission); };

export async function publicationRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { page?: number; page_size?: number; status?: string } }>("/publications", async (request) => { requirePermission(request, "publication.view"); return service(request).list(request.auth!, request.query.page ?? 1, request.query.page_size ?? 25, request.query.status); });
  app.get<{ Querystring: { period_id?: string } }>("/publications/candidates", async (request) => { requirePermission(request, "publication.manage"); return service(request).candidates(request.query.period_id); });
  app.get<{ Params: { publication_id: string } }>("/publications/:publication_id", async (request) => { requirePermission(request, "publication.view"); return service(request).get(request.auth!, request.params.publication_id); });
  app.post<{ Body: PublicationInput }>("/publications", { schema: { body: { type: "object", additionalProperties: false, required: ["publication_key", "publication_number", "title"], properties: { publication_key: { type: "string", pattern: "^[A-Z0-9][A-Z0-9._-]*$", maxLength: 80 }, publication_number: { type: "string", minLength: 2, maxLength: 120 }, title: { type: "string", minLength: 3, maxLength: 500 }, description: { type: ["string", "null"], maxLength: 4000 }, effective_at: { type: ["string", "null"], format: "date-time" }, change_notes: { type: ["string", "null"], maxLength: 4000 } } } } }, async (request, reply) => { mutate(request, "publication.manage"); return reply.code(201).send(await service(request).create(request.auth!, request.body, requestAuditContext(request))); });
  app.post<{ Params: { publication_id: string }; Body: { observation_ids: string[] } }>("/publications/:publication_id/items", { schema: { body: { type: "object", additionalProperties: false, required: ["observation_ids"], properties: { observation_ids: { type: "array", minItems: 1, maxItems: 500, uniqueItems: true, items: uuid } } } } }, async (request) => { mutate(request, "publication.manage"); return service(request).addItems(request.auth!, request.params.publication_id, request.body.observation_ids, requestAuditContext(request)); });
  app.post<{ Params: { publication_id: string }; Body?: { notes?: string | null } }>("/publications/:publication_id/activate", async (request) => { mutate(request, "publication.activate"); return service(request).activate(request.auth!, request.params.publication_id, request.body?.notes ?? null, requestAuditContext(request)); });
}
