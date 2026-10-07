import type { FastifyInstance } from "fastify";
import { ApiError } from "../errors.js";
import { authService } from "../plugins/authentication.js";

export async function currentUserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (request) => {
    if (!request.auth) throw new ApiError(401, "AUTH_REQUIRED", "Sesi diperlukan.");
    return request.auth.user;
  });

  app.get("/me/menu", async (request) => {
    if (!request.auth) throw new ApiError(401, "AUTH_REQUIRED", "Sesi diperlukan.");
    return { data: await authService(request).getMenu(request.auth.user.id) };
  });
}
