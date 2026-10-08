import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission, requireSuperadmin } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { ConnectorService, type MappingInput } from "../services/connector-service.js";

const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new ConnectorService(request.server.db, request.server.config);
const mutate = (request: FastifyRequest) => { requireCsrf(request); requirePermission(request, "connector.manage"); };

const mappingBody = {
  type: "object", additionalProperties: false,
  required: ["indicator_version_id", "source_code", "external_dataset_id", "year_field", "value_field"],
  properties: {
    indicator_version_id: uuid, source_code: { type: "string", enum: ["SATUDATA_KAPUAS", "BPS_KAPUAS"] },
    external_dataset_id: { type: "string", minLength: 1, maxLength: 255 }, external_resource_id: { type: ["string", "null"], maxLength: 255 },
    resource_url: { type: ["string", "null"], format: "uri", maxLength: 2000 }, geography_field: { type: ["string", "null"], maxLength: 160 },
    geography_code: { type: "string", minLength: 1, maxLength: 80 }, year_field: { type: "string", minLength: 1, maxLength: 160 },
    value_field: { type: "string", minLength: 1, maxLength: 160 }, unit_field: { type: ["string", "null"], maxLength: 160 },
    expected_unit: { type: ["string", "null"], maxLength: 160 }, source_priority: { type: "integer", minimum: 1, maximum: 10000 },
    relation_type: { type: "string", enum: ["primary", "supporting", "comparison"] }, effective_from: { type: "string", format: "date" },
  },
} as const;

export async function connectorRoutes(app: FastifyInstance): Promise<void> {
  app.get("/connectors/status", async (request) => { requirePermission(request, "connector.view"); return service(request).listSources(); });
  app.get<{ Querystring: { q?: string; rows?: number } }>("/connectors/ckan/search", { schema: { querystring: { type: "object", additionalProperties: false, properties: { q: { type: "string", maxLength: 200 }, rows: { type: "integer", minimum: 1, maximum: 50, default: 10 } } } } }, async (request) => { requirePermission(request, "connector.view"); return service(request).searchCkan(request.query.q, request.query.rows ?? 10); });
  app.get("/connectors/mappings", async (request) => { requirePermission(request, "connector.view"); return service(request).listMappings(); });
  app.post<{ Params: { source_code: "SATUDATA_KAPUAS" | "BPS_KAPUAS" } }>("/connectors/:source_code/test", { schema: { params: { type: "object", additionalProperties: false, required: ["source_code"], properties: { source_code: { type: "string", enum: ["SATUDATA_KAPUAS", "BPS_KAPUAS"] } } } } }, async (request) => { mutate(request); return service(request).testSource(request.params.source_code, requestAuditContext(request)); });
  app.get("/connectors/bps/secret", async (request) => { requireSuperadmin(request); requirePermission(request, "connector_secret.view"); return service(request).getBpsSecretStatus(); });
  app.put<{ Body: { api_key: string } }>("/connectors/bps/secret", { schema: { body: { type: "object", additionalProperties: false, required: ["api_key"], properties: { api_key: { type: "string", minLength: 8, maxLength: 512 } } } } }, async (request) => { requireCsrf(request); requireSuperadmin(request); requirePermission(request, "connector_secret.manage"); return service(request).saveBpsSecret(request.auth!, request.body.api_key, requestAuditContext(request)); });
  app.delete("/connectors/bps/secret", async (request) => { requireCsrf(request); requireSuperadmin(request); requirePermission(request, "connector_secret.manage"); return service(request).clearBpsSecret(request.auth!, requestAuditContext(request)); });
  app.post<{ Body: MappingInput }>("/connectors/mappings", { schema: { body: mappingBody } }, async (request, reply) => { mutate(request); return reply.code(201).send(await service(request).createMapping(request.auth!, request.body, requestAuditContext(request))); });
  app.post<{ Params: { mapping_id: string; action: "approve" | "activate" | "retire" } }>("/connectors/mappings/:mapping_id/actions/:action", { schema: { params: { type: "object", additionalProperties: false, required: ["mapping_id", "action"], properties: { mapping_id: uuid, action: { type: "string", enum: ["approve", "activate", "retire"] } } } } }, async (request) => { mutate(request); return service(request).transitionMapping(request.auth!, request.params.mapping_id, request.params.action, requestAuditContext(request)); });
  app.post<{ Params: { mapping_id: string } }>("/connectors/mappings/:mapping_id/sync", { schema: { params: { type: "object", additionalProperties: false, required: ["mapping_id"], properties: { mapping_id: uuid } } } }, async (request) => { mutate(request); return service(request).sync(request.auth!, request.params.mapping_id, requestAuditContext(request)); });
  app.get<{ Params: { run_id: string } }>("/connectors/runs/:run_id", { schema: { params: { type: "object", additionalProperties: false, required: ["run_id"], properties: { run_id: uuid } } } }, async (request) => { requirePermission(request, "connector.view"); return service(request).getRun(request.params.run_id); });
  app.post<{ Params: { run_id: string } }>("/connectors/runs/:run_id/import", { schema: { params: { type: "object", additionalProperties: false, required: ["run_id"], properties: { run_id: uuid } } } }, async (request) => { mutate(request); return service(request).importRun(request.auth!, request.params.run_id, requestAuditContext(request)); });
}
