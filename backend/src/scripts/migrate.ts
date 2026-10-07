import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const migrationDirectory = path.resolve(process.cwd(), "database", "migrations");

try {
  const files = (await readdir(migrationDirectory))
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();

  for (const filename of files) {
    const version = filename.slice(0, 3);
    const sql = await readFile(path.join(migrationDirectory, filename), "utf8");
    const checksum = createHash("sha256").update(sql, "utf8").digest("hex");
    const ledger = await db.query<{ ledger_exists: boolean }>(
      "SELECT to_regclass('sababuka.schema_migrations') IS NOT NULL AS ledger_exists",
    );

    if (ledger.rows[0]?.ledger_exists) {
      const applied = await db.query<{ checksum: string | null }>(
        "SELECT checksum FROM sababuka.schema_migrations WHERE version = $1",
        [version],
      );
      const record = applied.rows[0];
      if (record) {
        if (record.checksum && record.checksum !== checksum) {
          throw new Error(`Checksum migration ${filename} berubah setelah diterapkan.`);
        }
        if (!record.checksum) {
          await db.query(
            "UPDATE sababuka.schema_migrations SET checksum = $2 WHERE version = $1",
            [version, checksum],
          );
        }
        console.log(`Lewati ${filename} (sudah diterapkan).`);
        continue;
      }
    }

    console.log(`Terapkan ${filename}...`);
    await db.query(sql);
    await db.query(
      "UPDATE sababuka.schema_migrations SET checksum = $2 WHERE version = $1",
      [version, checksum],
    );
  }

  console.log("Seluruh migration selesai.");
} finally {
  await db.end();
}
