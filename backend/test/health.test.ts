import assert from "node:assert/strict";
import test from "node:test";
import type { QueryResult } from "pg";
import { buildApp } from "../src/app.js";
import type { Database, QueryResultRow } from "../src/database.js";
import { testConfig } from "./test-config.js";

function result<R extends QueryResultRow>(rows: R[]): QueryResult<R> {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

const fakeDb: Database = {
  query: async <R extends QueryResultRow>() => result<R>([]),
  connect: async () => {
    throw new Error("connect tidak digunakan pada health test");
  },
  end: async () => undefined,
};

test("GET /api/v1/health mengembalikan status ok", async () => {
  const app = await buildApp({ config: testConfig, db: fakeDb, logger: false });
  const response = await app.inject({ method: "GET", url: "/api/v1/health" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "ok");
  assert.equal(typeof response.headers["x-request-id"], "string");
  await app.close();
});

test("GET /api/v1/me tanpa sesi ditolak", async () => {
  const app = await buildApp({ config: testConfig, db: fakeDb, logger: false });
  const response = await app.inject({ method: "GET", url: "/api/v1/me" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "AUTH_REQUIRED");
  assert.equal(response.headers["x-request-id"], response.json().error.request_id);
  await app.close();
});
