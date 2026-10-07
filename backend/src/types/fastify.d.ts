import type { AuthContext } from "./auth.js";
import type { AppConfig } from "../config.js";
import type { Database } from "../database.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    db: Database;
  }

  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

export {};
