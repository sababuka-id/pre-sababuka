import assert from "node:assert/strict";
import test from "node:test";
import type { QueryResult } from "pg";
import type { Database, QueryResultRow } from "../src/database.js";
import { cleanupOrphanNotifications, inspectOrphans } from "../src/services/orphan-repair-service.js";

function result<R extends QueryResultRow>(rows: R[], rowCount = rows.length): QueryResult<R> {
  return { command: "SELECT", rowCount, oid: 0, fields: [], rows };
}

test("orphan repair reports typed references and deletes only ephemeral notifications", async () => {
  const statements: string[] = [];
  const db: Pick<Database, "query"> = {
    async query<R extends QueryResultRow>(text: string) {
      statements.push(text);
      if (text.trimStart().startsWith("SELECT")) return result<R>([({ notifications: 2, publication_items: 0, workflow_actions: 1, submission_evidence: 0 } as unknown) as R]);
      return result<R>([], 2);
    },
  };

  assert.deepEqual(await inspectOrphans(db), {
    notifications: 2,
    publication_items: 0,
    workflow_actions: 1,
    submission_evidence: 0,
  });
  assert.equal(await cleanupOrphanNotifications(db), 2);
  assert.match(statements[0]!, /data_batches/);
  assert.match(statements[1]!, /DELETE FROM sababuka\.notifications/);
  assert.match(statements[1]!, /indicator_versions/);
  assert.match(statements[1]!, /categories/);
});
