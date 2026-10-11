import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission, requireSuperadmin } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { ConnectorService, type IntegrationProfileInput, type MappingInput } from "../services/connector-service.js";

const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new ConnectorService(request.server.db, request.server.config);
const mutate = (request: FastifyRequest) => { requireCsrf(request); requirePermission(request, "connector.manage"); };

const mappingBody = {
  type: "object", additionalProperties: false,
  required: ["indicator_version_id", "source_code", "external_dataset_id", "year_field", "value_field"],
  properties: {
    indicator_version_id: uuid, source_code: { type: "string", pattern: "^[A-Z0-9][A-Z0-9._-]*$", maxLength: 64 },
    external_dataset_id: { type: "string", minLength: 1, maxLength: 255 }, external_resource_id: { type: ["string", "null"], maxLength: 255 },
    resource_url: { type: ["string", "null"], format: "uri", maxLength: 2000 }, geography_field: { type: ["string", "null"], maxLength: 160 },
    geography_code: { type: "string", minLength: 1, maxLength: 80 }, year_field: { type: "string", minLength: 1, maxLength: 160 },
    value_field: { type: "string", minLength: 1, maxLength: 160 }, unit_field: { type: ["string", "null"], maxLength: 160 },
    expected_unit: { type: ["string", "null"], maxLength: 160 }, source_priority: { type: "integer", minimum: 1, maximum: 10000 },
    relation_type: { type: "string", enum: ["primary", "supporting", "comparison"] }, effective_from: { type: "string", format: "date" },
    transform_json: { type: "object", additionalProperties: true },
  },
} as const;

const integrationBody = {
  type: "object", additionalProperties: false,
  required: ["organization_id", "code", "name", "connector_kind", "auth_type", "data_format", "sync_mode", "verification_mode"],
  properties: {
    organization_id: uuid,
    code: { type: "string", pattern: "^[A-Z0-9][A-Z0-9._-]*$", minLength: 2, maxLength: 64 },
    name: { type: "string", minLength: 3, maxLength: 255 },
    connector_kind: { type: "string", enum: ["api_json", "ckan", "bps", "csv_url", "file_upload", "database_view", "html_scrape", "manual"] },
    base_url: { anyOf: [{ type: "string", format: "uri", maxLength: 2000 }, { type: "null" }] },
    endpoint_path: { type: ["string", "null"], maxLength: 2000 },
    auth_type: { type: "string", enum: ["none", "api_key", "bearer", "basic", "oauth2"] },
    data_format: { type: "string", enum: ["json", "csv", "xlsx", "html", "database", "manual"] },
    data_path: { type: ["string", "null"], maxLength: 255 },
    sync_mode: { type: "string", enum: ["manual", "scheduled"] },
    sync_interval_minutes: { type: ["integer", "null"], minimum: 60, maximum: 44640 },
    verification_mode: { type: "string", enum: ["preview_required", "auto_import"] },
    status: { type: "string", enum: ["draft", "active", "paused"] },
    notes: { type: ["string", "null"], maxLength: 4000 },
  },
} as const;

export async function connectorRoutes(app: FastifyInstance): Promise<void> {
  app.get("/connectors/status", async (request) => { requirePermission(request, "connector.view"); return service(request).listSources(); });
  app.get("/connectors/integrations", async (request) => { requirePermission(request, "connector.view"); return service(request).listIntegrationProfiles(); });
  app.post<{ Body: IntegrationProfileInput }>("/connectors/integrations", { schema: { body: integrationBody } }, async (request, reply) => { mutate(request); return reply.code(201).send(await service(request).saveIntegrationProfile(request.auth!, request.body, requestAuditContext(request))); });
  app.put<{ Params: { integration_id: string }; Body: IntegrationProfileInput }>("/connectors/integrations/:integration_id", { schema: { params: { type: "object", additionalProperties: false, required: ["integration_id"], properties: { integration_id: uuid } }, body: integrationBody } }, async (request) => { mutate(request); return service(request).saveIntegrationProfile(request.auth!, request.body, requestAuditContext(request), request.params.integration_id); });
  app.post<{ Params: { integration_id: string } }>("/connectors/integrations/:integration_id/scrape-preview", { schema: { params: { type: "object", additionalProperties: false, required: ["integration_id"], properties: { integration_id: uuid } } } }, async (request) => { mutate(request); return service(request).previewWebsiteIntegration(request.params.integration_id, requestAuditContext(request)); });
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
