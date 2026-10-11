import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { ConnectorService } from "./services/connector-service.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const app = await buildApp({ config, db });
const connectorService = new ConnectorService(db, config);
let scheduler: NodeJS.Timeout | undefined;

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Shutting down");
  if (scheduler) clearInterval(scheduler);
  await app.close();
  await db.end();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
  const runSchedules = async () => {
    try {
      const result = await connectorService.runDueSchedules();
      if (result.profiles) app.log.info(result, "Scheduled connector profiles processed");
    } catch (error) { app.log.error({ error }, "Scheduled connector check failed"); }
  };
  scheduler = setInterval(() => void runSchedules(), 60_000);
  scheduler.unref();
  setTimeout(() => void runSchedules(), 5_000).unref();
} catch (error) {
  app.log.error(error);
  await db.end();
  process.exit(1);
}
