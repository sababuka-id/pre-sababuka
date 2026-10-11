import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import { ApiError } from "../errors.js";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { SubmissionService, type ObservationInput } from "../services/submission-service.js";

const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new SubmissionService(request.server.db);
const mutate = (request: FastifyRequest, permission: string) => { requireCsrf(request); requirePermission(request, permission); };
const allowedMime = new Map([
  ["application/pdf", ".pdf"], ["image/jpeg", ".jpg"], ["image/png", ".png"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
]);

function signatureMatches(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType.includes("spreadsheetml")) return buffer[0] === 0x50 && buffer[1] === 0x4b;
  return false;
}

function evidencePath(request: FastifyRequest, storageKey: string): string {
  const root = resolve(request.server.config.evidenceStoragePath);
  const target = resolve(root, storageKey);
  if (!target.startsWith(`${root}${sep}`)) throw new ApiError(500, "INTERNAL_ERROR", "Lokasi bukti dukung tidak valid.");
  return target;
}

export async function submissionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { organization_id: string } }>("/submissions/available-periods", {
    schema: { querystring: { type: "object", additionalProperties: false, required: ["organization_id"], properties: { organization_id: uuid } } },
  }, async (request) => {
    requirePermission(request,"submission.view");
    return service(request).availablePeriods(request.auth!,request.query.organization_id);
  });

  app.get<{ Querystring: { page?: number; page_size?: number; organization_id?: string; period_id?: string; status?: string; sort_by?: string; sort_order?: "asc" | "desc" } }>("/submissions", {
    schema: { querystring: { type: "object", additionalProperties: false, properties: {
      page: { type: "integer", minimum: 1 }, page_size: { type: "integer", minimum: 1, maximum: 100 },
      organization_id: uuid, period_id: uuid,
      status: { type: "string", enum: ["draft", "submitted", "under_review", "returned", "approved"] },
      sort_by: { type: "string", enum: ["updated_at", "organization", "period", "row_count", "status"] },
      sort_order: { type: "string", enum: ["asc", "desc"] },
    } } },
  }, async (request) => {
    requirePermission(request, "submission.view");
    return service(request).list(request.auth!, { page: request.query.page ?? 1, pageSize: request.query.page_size ?? 25,
      organizationId: request.query.organization_id, periodId: request.query.period_id, status: request.query.status,
      sortBy: request.query.sort_by, sortOrder: request.query.sort_order });
  });

  app.post<{ Body: { organization_id: string; period_id: string } }>("/submissions", {
    schema: { body: { type: "object", additionalProperties: false, required: ["organization_id", "period_id"],
      properties: { organization_id: uuid, period_id: uuid } } },
  }, async (request, reply) => {
    mutate(request, "submission.create");
    return reply.code(201).send(await service(request).create(request.auth!, request.body, requestAuditContext(request)));
  });

  app.get<{ Params: { submission_id: string } }>("/submissions/:submission_id", {
    schema: { params: { type: "object", additionalProperties: false, required: ["submission_id"], properties: { submission_id: uuid } } },
  }, async (request) => {
    requirePermission(request, "submission.view"); return service(request).get(request.auth!, request.params.submission_id);
  });

  app.get<{ Params: { submission_id: string } }>("/submissions/:submission_id/evidence", {
    schema: { params: { type: "object", additionalProperties: false, required: ["submission_id"], properties: { submission_id: uuid } } },
  }, async (request) => {
    requirePermission(request, "submission.view");
    return service(request).listEvidence(request.auth!, request.params.submission_id);
  });

  app.post<{ Params: { submission_id: string }; Querystring: { indicator_version_id?: string } }>("/submissions/:submission_id/evidence", {
    schema: {
      params: { type: "object", additionalProperties: false, required: ["submission_id"], properties: { submission_id: uuid } },
      querystring: { type: "object", additionalProperties: false, properties: { indicator_version_id: uuid } },
    },
  }, async (request, reply) => {
    mutate(request, "submission.update");
    await service(request).prepareEvidence(request.auth!, request.params.submission_id, request.query.indicator_version_id);
    const part = await request.file();
    if (!part) throw new ApiError(400, "VALIDATION_ERROR", "Berkas bukti dukung wajib dipilih.");
    const extension = allowedMime.get(part.mimetype);
    if (!extension) throw new ApiError(415, "VALIDATION_ERROR", "Format bukti dukung harus PDF, JPG, PNG, atau XLSX.");
    let buffer: Buffer;
    try { buffer = await part.toBuffer(); }
    catch (error) {
      if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") throw new ApiError(413, "VALIDATION_ERROR", "Ukuran bukti dukung melebihi batas 10 MB.");
      throw error;
    }
    if (!buffer.length || !signatureMatches(buffer, part.mimetype)) throw new ApiError(415, "VALIDATION_ERROR", "Isi berkas tidak sesuai dengan tipe yang dinyatakan.");
    const storageKey = `${request.params.submission_id}/${randomUUID()}${extension}`;
    const target = evidencePath(request, storageKey);
    await mkdir(resolve(request.server.config.evidenceStoragePath, request.params.submission_id), { recursive: true });
    await writeFile(target, buffer, { flag: "wx", mode: 0o600 });
    try {
      const evidence = await service(request).createEvidence(request.auth!, request.params.submission_id, {
        indicatorVersionId: request.query.indicator_version_id, originalFilename: basename(part.filename).slice(0, 500),
        storageKey, mimeType: part.mimetype, byteSize: buffer.length,
        checksumSha256: createHash("sha256").update(buffer).digest("hex"),
      }, requestAuditContext(request));
      return reply.code(201).send(evidence);
    } catch (error) { await unlink(target).catch(() => undefined); throw error; }
  });

  app.get<{ Params: { submission_id: string; evidence_id: string } }>("/submissions/:submission_id/evidence/:evidence_id/download", {
    schema: { params: { type: "object", additionalProperties: false, required: ["submission_id", "evidence_id"], properties: { submission_id: uuid, evidence_id: uuid } } },
  }, async (request, reply) => {
    requirePermission(request, "submission.view");
    const evidence = await service(request).getEvidence(request.auth!, request.params.submission_id, request.params.evidence_id);
    const filename = String(evidence.original_filename).replace(/[\r\n]/gu, "_");
    reply.header("Content-Type", String(evidence.mime_type));
    reply.header("Content-Length", String(evidence.byte_size));
    reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    return reply.send(createReadStream(evidencePath(request, String(evidence.storage_key))));
  });

  app.delete<{ Params: { submission_id: string; evidence_id: string } }>("/submissions/:submission_id/evidence/:evidence_id", {
    schema: { params: { type: "object", additionalProperties: false, required: ["submission_id", "evidence_id"], properties: { submission_id: uuid, evidence_id: uuid } } },
  }, async (request, reply) => {
    mutate(request, "submission.update");
    const evidence = await service(request).deleteEvidence(request.auth!, request.params.submission_id, request.params.evidence_id, requestAuditContext(request));
    await unlink(evidencePath(request, String(evidence.storage_key))).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") request.log.error({ error }, "Failed to remove evidence file"); });
    return reply.code(204).send();
  });

  app.put<{ Params: { submission_id: string; indicator_version_id: string }; Body: ObservationInput }>(
    "/submissions/:submission_id/observations/:indicator_version_id",
    { schema: {
      params: { type: "object", additionalProperties: false, required: ["submission_id", "indicator_version_id"], properties: { submission_id: uuid, indicator_version_id: uuid } },
      body: { type: "object", additionalProperties: false, required: ["value"], properties: {
        value: { anyOf: [{ type: "number" }, { type: "string", minLength: 1, maxLength: 4000 }] },
        notes: { type: ["string", "null"], maxLength: 4000 },
      } },
    } },
    async (request) => {
      mutate(request, "submission.update");
      return service(request).saveObservation(request.auth!, request.params.submission_id, request.params.indicator_version_id,
        request.body, requestAuditContext(request));
    },
  );

  app.post<{ Params: { submission_id: string; action: "submit" | "start-review" | "return" | "approve" }; Body?: { notes?: string | null } }>(
    "/submissions/:submission_id/actions/:action",
    { schema: {
      params: { type: "object", additionalProperties: false, required: ["submission_id", "action"], properties: {
        submission_id: uuid, action: { type: "string", enum: ["submit", "start-review", "return", "approve"] },
      } },
      body: { type: "object", additionalProperties: false, properties: { notes: { type: ["string", "null"], maxLength: 4000 } } },
    } },
    async (request) => {
      const permissions = { submit: "submission.submit", "start-review": "submission.review", return: "submission.return", approve: "submission.approve" } as const;
      mutate(request, permissions[request.params.action]);
      return service(request).transition(request.auth!, request.params.submission_id, request.params.action,
        request.body?.notes ?? null, requestAuditContext(request));
    },
  );
}
