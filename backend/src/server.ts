import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./database.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const app = await buildApp({ config, db });

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await db.end();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await db.end();
  process.exit(1);
}
