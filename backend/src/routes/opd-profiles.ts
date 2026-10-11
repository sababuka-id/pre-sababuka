import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ApiError } from "../errors.js";
import { requireCsrf, requirePermission } from "../plugins/authentication.js";
import { requestAuditContext } from "../request-context.js";
import { OpdProfileService } from "../services/opd-profile-service.js";

const uuid = { type: "string", format: "uuid" } as const;
const service = (request: FastifyRequest) => new OpdProfileService(request.server.db);
const mutate = (request: FastifyRequest) => { requireCsrf(request); requirePermission(request, "submission.update"); };
const documentTypes = ["renstra", "rpjmd_progress"] as const;
const allowedMime = new Map([
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
]);

function signatureMatches(buffer: Buffer, mime: string): boolean {
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function storagePath(request: FastifyRequest, key: string): string {
  const root = resolve(request.server.config.evidenceStoragePath);
  const target = resolve(root, key);
  if (!target.startsWith(`${root}${sep}`)) throw new ApiError(500, "INTERNAL_ERROR", "Lokasi dokumen tidak valid.");
  return target;
}

export async function opdProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/opd-profiles", async (request) => { requirePermission(request, "submission.view"); return service(request).list(request.auth!); });
  app.get<{ Params: { organization_id: string } }>("/opd-profiles/:organization_id", { schema: { params: { type: "object", additionalProperties: false, required: ["organization_id"], properties: { organization_id: uuid } } } }, async (request) => { requirePermission(request, "submission.view"); return service(request).get(request.auth!, request.params.organization_id); });
  app.put<{ Params: { organization_id: string }; Body: { response: Record<string, unknown> } }>("/opd-profiles/:organization_id", { schema: { params: { type: "object", additionalProperties: false, required: ["organization_id"], properties: { organization_id: uuid } }, body: { type: "object", additionalProperties: false, required: ["response"], properties: { response: { type: "object", additionalProperties: true } } } } }, async (request) => { mutate(request); return service(request).save(request.auth!, request.params.organization_id, request.body.response, requestAuditContext(request)); });
  app.post<{ Params: { organization_id: string } }>("/opd-profiles/:organization_id/submit", { schema: { params: { type: "object", additionalProperties: false, required: ["organization_id"], properties: { organization_id: uuid } } } }, async (request) => { mutate(request); return service(request).submit(request.auth!, request.params.organization_id, requestAuditContext(request)); });
  app.post<{
    Params: { organization_id: string; track: "technical" | "planning"; decision: "verify" | "return" };
    Body: { notes?: string | null };
  }>("/opd-profiles/:organization_id/review/:track/:decision", {
    schema: {
      params: {
        type: "object", additionalProperties: false, required: ["organization_id", "track", "decision"],
        properties: {
          organization_id: uuid,
          track: { type: "string", enum: ["technical", "planning"] },
          decision: { type: "string", enum: ["verify", "return"] },
        },
      },
      body: { type: "object", additionalProperties: false, properties: { notes: { type: ["string", "null"], maxLength: 4000 } } },
    },
  }, async (request) => {
    requireCsrf(request);
    requirePermission(request, request.params.track === "technical" ? "connector.manage" : "submission.review");
    return service(request).review(request.auth!, request.params.organization_id, request.params.track, request.params.decision, request.body.notes ?? null, requestAuditContext(request));
  });

  app.get<{ Params: { organization_id: string } }>("/opd-profiles/:organization_id/documents", { schema: { params: { type: "object", additionalProperties: false, required: ["organization_id"], properties: { organization_id: uuid } } } }, async (request) => { requirePermission(request, "submission.view"); return service(request).listDocuments(request.auth!, request.params.organization_id); });
  app.post<{ Params: { organization_id: string }; Querystring: { document_type: typeof documentTypes[number]; year?: number } }>("/opd-profiles/:organization_id/documents", { schema: { params: { type: "object", additionalProperties: false, required: ["organization_id"], properties: { organization_id: uuid } }, querystring: { type: "object", additionalProperties: false, required: ["document_type"], properties: { document_type: { type: "string", enum: documentTypes }, year: { type: "integer", minimum: 2000, maximum: 2100 } } } } }, async (request, reply) => {
    mutate(request);
    const profile = await service(request).prepareDocument(request.auth!, request.params.organization_id);
    const part = await request.file();
    if (!part) throw new ApiError(400, "VALIDATION_ERROR", "Dokumen wajib dipilih.");
    const extension = allowedMime.get(part.mimetype);
    if (!extension) throw new ApiError(415, "VALIDATION_ERROR", "Dokumen harus berformat PDF, XLSX, atau DOCX.");
    let buffer: Buffer;
    try { buffer = await part.toBuffer(); } catch (error) { if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") throw new ApiError(413, "VALIDATION_ERROR", "Ukuran dokumen melebihi batas 10 MB."); throw error; }
    if (!buffer.length || !signatureMatches(buffer, part.mimetype)) throw new ApiError(415, "VALIDATION_ERROR", "Isi dokumen tidak sesuai dengan formatnya.");
    const key = `opd-profiles/${profile.id}/${randomUUID()}${extension}`;
    const target = storagePath(request, key);
    await mkdir(resolve(request.server.config.evidenceStoragePath, "opd-profiles", String(profile.id)), { recursive: true });
    await writeFile(target, buffer, { flag: "wx", mode: 0o600 });
    try {
      const saved = await service(request).createDocument(request.auth!, String(profile.id), request.params.organization_id, { documentType: request.query.document_type, documentYear: request.query.year ?? null, originalFilename: basename(part.filename).slice(0, 500), storageKey: key, mimeType: part.mimetype, byteSize: buffer.length, checksum: createHash("sha256").update(buffer).digest("hex") }, requestAuditContext(request));
      return reply.code(201).send(saved);
    } catch (error) { await unlink(target).catch(() => undefined); throw error; }
  });
  app.get<{ Params: { organization_id: string; document_id: string } }>("/opd-profiles/:organization_id/documents/:document_id/download", { schema: { params: { type: "object", additionalProperties: false, required: ["organization_id", "document_id"], properties: { organization_id: uuid, document_id: uuid } } } }, async (request, reply) => {
    requirePermission(request, "submission.view");
    const document = await service(request).getDocument(request.auth!, request.params.organization_id, request.params.document_id);
    reply.header("Content-Type", String(document.mime_type)); reply.header("Content-Length", String(document.byte_size)); reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(String(document.original_filename).replace(/[\r\n]/gu, "_"))}`);
    return reply.send(createReadStream(storagePath(request, String(document.storage_key))));
  });
}
