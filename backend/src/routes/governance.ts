import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import {
  GovernanceService, type CategoryInput, type IndicatorInput, type PolicyFocusInput,
} from "../services/governance-service.js";

const uuid = { type: "string", format: "uuid" } as const;
const nullableUuid = { anyOf: [uuid, { type: "null" }] } as const;
interface PageQueryInput { page?: number; page_size?: number; q?: string }
const pageProperties = {
  page: { type: "integer", minimum: 1, default: 1 },
  page_size: { type: "integer", minimum: 1, maximum: 100, default: 25 },
  q: { type: "string", maxLength: 200 },
} as const;
const pageQuery = (query: PageQueryInput) => ({ page: query.page ?? 1, pageSize: query.page_size ?? 25, search: query.q });
const service = (request: FastifyRequest) => new GovernanceService(request.server.db);
const mutate = (request: FastifyRequest, permission: string) => { requireCsrf(request); requirePermission(request, permission); };

const focusBody = {
  type: "object", additionalProperties: false, required: ["code", "name"],
  properties: {
    code: { type: "string", pattern: "^[A-Z0-9][A-Z0-9._-]*$", maxLength: 64 },
    name: { type: "string", minLength: 2, maxLength: 255 },
    description: { type: ["string", "null"], maxLength: 4000 },
    display_order: { type: "integer", minimum: 0, maximum: 10000 },
  },
} as const;

const categoryBody = {
  type: "object", additionalProperties: false, required: ["code", "name"],
  properties: {
    ...focusBody.properties,
    policy_focus_id: nullableUuid,
    parent_id: nullableUuid,
  },
} as const;

const indicatorBody = {
  type: "object", additionalProperties: false,
  required: ["code", "name", "category_id", "definition", "unit_id", "frequency", "data_type", "effective_from"],
  properties: {
    code: { type: "string", pattern: "^[A-Z0-9][A-Z0-9._-]*$", maxLength: 80 },
    name: { type: "string", minLength: 2, maxLength: 255 },
    category_id: uuid, owner_organization_id: nullableUuid,
    definition: { type: "string", minLength: 5, maxLength: 10000 },
    formula: { type: ["string", "null"], maxLength: 10000 }, unit_id: uuid,
    frequency: { type: "string", enum: ["annual", "semester", "quarter", "monthly", "event", "custom"] },
    data_type: { type: "string", enum: ["number", "integer", "percentage", "currency", "text", "boolean"] },
    direction: { type: ["string", "null"], enum: ["increase", "decrease", "maintain", null] },
    source_reference: { type: ["string", "null"], maxLength: 4000 },
    access_level: { type: "string", enum: ["public", "internal", "restricted"] },
    effective_from: { type: "string", format: "date" }, change_notes: { type: ["string", "null"], maxLength: 4000 },
    organizations: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false,
      required: ["organization_id", "responsibility"], properties: { organization_id: uuid,
        responsibility: { type: "string", enum: ["primary_producer", "supporter", "validator", "curator"] }, is_primary: { type: "boolean" } } } },
    targets: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false,
      required: ["period_id"], properties: { period_id: uuid, numeric_value: { type: ["number", "null"] },
        text_value: { type: ["string", "null"], maxLength: 1000 }, notes: { type: ["string", "null"], maxLength: 2000 } } } },
  },
} as const;

export async function governanceRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: PageQueryInput }>("/policy-focuses", { schema: { querystring: { type: "object", additionalProperties: false, properties: pageProperties } } }, async (request) => {
    requirePermission(request, "policy_focus.view"); return service(request).listPolicyFocuses(pageQuery(request.query));
  });
  app.post<{ Body: PolicyFocusInput }>("/policy-focuses", { schema: { body: focusBody } }, async (request, reply) => {
    mutate(request, "policy_focus.manage"); return reply.code(201).send(await service(request).createPolicyFocus(request.auth!, request.body, requestAuditContext(request)));
  });
  app.get<{ Querystring: PageQueryInput & { policy_focus_id?: string } }>("/categories", { schema: { querystring: { type: "object", additionalProperties: false, properties: { ...pageProperties, policy_focus_id: uuid } } } }, async (request) => {
    requirePermission(request, "category.view"); return service(request).listCategories({ ...pageQuery(request.query), policyFocusId: request.query.policy_focus_id });
  });
  app.post<{ Body: CategoryInput }>("/categories", { schema: { body: categoryBody } }, async (request, reply) => {
    mutate(request, "category.manage"); return reply.code(201).send(await service(request).createCategory(request.auth!, request.body, requestAuditContext(request)));
  });
  app.get("/units", async (request) => { requirePermission(request, "indicator.view"); return service(request).listUnits(); });
  app.get("/periods", async (request) => { requirePermission(request, "indicator.view"); return service(request).listPeriods(); });
  app.get<{ Querystring: PageQueryInput & { category_id?: string; organization_id?: string; status?: string } }>("/indicators", {
    schema: { querystring: { type: "object", additionalProperties: false, properties: { ...pageProperties, category_id: uuid, organization_id: uuid,
      status: { type: "string", enum: ["draft", "in_review", "approved", "active", "retired"] } } } },
  }, async (request) => {
    requirePermission(request, "indicator.view"); return service(request).listIndicators(request.auth!, { ...pageQuery(request.query), categoryId: request.query.category_id, organizationId: request.query.organization_id, status: request.query.status });
  });
  app.post<{ Body: IndicatorInput }>("/indicators", { schema: { body: indicatorBody } }, async (request, reply) => {
    mutate(request, "indicator.manage"); return reply.code(201).send(await service(request).createIndicator(request.auth!, request.body, requestAuditContext(request)));
  });
  app.patch<{ Params: { indicator_id: string }; Body: IndicatorInput }>("/indicators/:indicator_id", {
    schema: {
      params: { type: "object", additionalProperties: false, required: ["indicator_id"], properties: { indicator_id: uuid } },
      body: indicatorBody,
    },
  }, async (request) => {
    mutate(request, "indicator.manage");
    return service(request).updateIndicatorDraft(request.auth!, request.params.indicator_id, request.body, requestAuditContext(request));
  });
  app.post<{ Params: { version_id: string; action: "submit" | "approve" | "activate" | "retire" } }>(
    "/indicator-versions/:version_id/actions/:action",
    {
      schema: { params: { type: "object", additionalProperties: false, required: ["version_id", "action"], properties: {
        version_id: uuid, action: { type: "string", enum: ["submit", "approve", "activate", "retire"] },
      } } },
    },
    async (request) => {
      const permission = request.params.action === "submit" ? "indicator.submit"
        : request.params.action === "approve" ? "indicator.approve" : "indicator.activate";
      mutate(request, permission);
      return service(request).transitionIndicatorVersion(request.auth!, request.params.version_id, request.params.action, requestAuditContext(request));
    },
  );
}
