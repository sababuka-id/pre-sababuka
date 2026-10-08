import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";
import { cleanupOrphanNotifications, inspectOrphans } from "../services/orphan-repair-service.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);

try {
  await db.query("BEGIN");
  const before = await inspectOrphans(db);
  const notificationsRemoved = await cleanupOrphanNotifications(db);
  const after = await inspectOrphans(db);
  await db.query("COMMIT");
  console.log(JSON.stringify({ before, notifications_removed: notificationsRemoved, after }, null, 2));
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  await db.end();
}
