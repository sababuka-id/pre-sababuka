import type { FastifyInstance } from "fastify";
import { ApiError } from "../errors.js";
import { authService, requireSuperadmin } from "../plugins/authentication.js";

export async function currentUserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (request) => {
    if (!request.auth) throw new ApiError(401, "AUTH_REQUIRED", "Sesi diperlukan.");
    return request.auth.user;
  });

  app.get("/me/menu", async (request) => {
    if (!request.auth) throw new ApiError(401, "AUTH_REQUIRED", "Sesi diperlukan.");
    return { data: request.auth.user.simulation?.active
      ? await authService(request).getMenuForRoles(request.auth.user.roles.map((role) => role.code))
      : await authService(request).getMenu(request.auth.user.id) };
  });

  app.get("/me/preview-options", async (request) => {
    if (app.config.nodeEnv !== "development") throw new ApiError(404, "NOT_FOUND", "Endpoint tidak ditemukan.");
    requireSuperadmin(request);
    const result = await app.db.query(
      `SELECT id::text, code, name, short_name FROM sababuka.organizations
       WHERE is_active = true AND archived_at IS NULL AND organization_type = 'opd'
       ORDER BY name, code`,
    );
    return { organizations: result.rows };
  });
}
