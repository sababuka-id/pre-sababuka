import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    try {
      await app.db.query("SELECT 1");
      return { status: "ok", version: "0.1.0", time: new Date().toISOString() };
    } catch (error) {
      app.log.error({ error }, "Database health check failed");
      return reply.code(503).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Dependensi utama tidak sehat.",
          request_id: reply.request.id,
        },
      });
    }
  });
}
