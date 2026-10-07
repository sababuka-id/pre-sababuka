import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { hashPassword } from "../src/security/password.js";
import { testConfig } from "./test-config.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const password = "workflow-test-password-not-for-production";

test("alur kategori, indikator, OPD, publikasi, dan dashboard berjalan lintas peran", { skip: !databaseUrl }, async () => {
  const db = createDatabase(databaseUrl!);
  const app = await buildApp({ config: { ...testConfig, databaseUrl: databaseUrl! }, db, logger: false });
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const passwordHash = await hashPassword(password);
  try {
    const organizations = await db.query<{ id: string; code: string }>(
      `SELECT id::text, code FROM sababuka.organizations WHERE code IN ('BAPPERIDA', 'DKPP')`,
    );
    const dkpp = organizations.rows.find((item) => item.code === "DKPP")!.id;
    const roleUsers = [
      { role: "bapperida", scope: "global", organizationId: null },
      { role: "opd", scope: "organization", organizationId: dkpp },
      { role: "pimpinan", scope: "published", organizationId: null },
    ] as const;
    for (const entry of roleUsers) {
      const email = `${entry.role}.workflow.${suffix.toLowerCase()}@sababuka.test`;
      const user = await db.query<{ id: string }>(
        `INSERT INTO sababuka.users (email, full_name, password_hash, status, must_change_password, mfa_required)
         VALUES ($1, $2, $3, 'active', false, false) RETURNING id::text`,
        [email, `Workflow ${entry.role}`, passwordHash],
      );
      await db.query(
        `INSERT INTO sababuka.user_role_assignments (user_id, role_id, organization_id, scope_type)
         SELECT $1, id, $2, $3 FROM sababuka.roles WHERE code = $4`,
        [user.rows[0]!.id, entry.organizationId, entry.scope, entry.role],
      );
      if (entry.organizationId) {
        await db.query(
          `INSERT INTO sababuka.organization_memberships (user_id, organization_id, is_primary) VALUES ($1, $2, true)`,
          [user.rows[0]!.id, entry.organizationId],
        );
      }
    }
    const login = async (role: string) => {
      const response = await app.inject({
        method: "POST", url: "/api/v1/auth/login",
        payload: { identifier: `${role}.workflow.${suffix.toLowerCase()}@sababuka.test`, password },
      });
      assert.equal(response.statusCode, 200, response.body);
      return { cookie: String(response.headers["set-cookie"]).split(";", 1)[0]!, "x-csrf-token": response.json().csrf_token as string };
    };
    const bapperida = await login("bapperida");
    const opd = await login("opd");
    const pimpinan = await login("pimpinan");

    const units = await app.inject({ method: "GET", url: "/api/v1/units", headers: { cookie: bapperida.cookie } });
    const unit = units.json().data.find((item: { code: string }) => item.code === "PERCENT") ?? units.json().data[0];
    const workflowYear = 2200 + Number.parseInt(suffix.slice(0, 2), 16);
    const periodResult = await db.query<{ id: string }>(
      `INSERT INTO sababuka.periods (period_type, code, label, starts_on, ends_on)
       VALUES ('annual', $1, $2, $3, $4) RETURNING id::text`,
      [`FLOW_${suffix}`, `Periode Uji ${suffix}`, `${workflowYear}-01-01`, `${workflowYear}-12-31`],
    );
    const period = { id: periodResult.rows[0]!.id };

    const category = await app.inject({
      method: "POST", url: "/api/v1/categories", headers: bapperida,
      payload: { code: `FLOW_${suffix}`, name: `Kategori Alur ${suffix}` },
    });
    assert.equal(category.statusCode, 201, category.body);
    assert.equal(category.json().review_status, "draft");

    const indicator = await app.inject({
      method: "POST", url: "/api/v1/indicators", headers: bapperida,
      payload: {
        code: `FLOW_${suffix}`, name: `Indikator Alur ${suffix}`, category_id: category.json().id,
        owner_organization_id: dkpp, definition: "Indikator pengujian alur strategis lintas peran.",
        unit_id: unit.id, frequency: "annual", data_type: "percentage", direction: "increase",
        source_reference: "Sumber pengujian alur", access_level: "internal", effective_from: "2025-01-01",
        organizations: [{ organization_id: dkpp, responsibility: "primary_producer", is_primary: true }],
        targets: [{ period_id: period.id, numeric_value: 75 }],
      },
    });
    assert.equal(indicator.statusCode, 201, indicator.body);
    const blocked = await app.inject({
      method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/submit`, headers: bapperida,
    });
    assert.equal(blocked.statusCode, 409, blocked.body);

    for (const action of ["submit", "approve"] as const) {
      const response = await app.inject({
        method: "POST", url: `/api/v1/categories/${category.json().id}/actions/${action}`, headers: bapperida,
      });
      assert.equal(response.statusCode, 200, response.body);
    }
    for (const [action, expected] of [["submit", "in_review"], ["approve", "opd_verification"]] as const) {
      const response = await app.inject({
        method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/${action}`, headers: bapperida,
      });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.json().status, expected);
    }

    const opdInbox = await app.inject({
      method: "GET", url: `/api/v1/indicators?q=FLOW_${suffix}&status=opd_verification`, headers: { cookie: opd.cookie },
    });
    assert.equal(opdInbox.statusCode, 200, opdInbox.body);
    assert.equal(opdInbox.json().data.length, 1);
    const verified = await app.inject({
      method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/verify`, headers: opd,
    });
    assert.equal(verified.statusCode, 200, verified.body);
    assert.equal(verified.json().status, "approved");
    const activated = await app.inject({
      method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/activate`, headers: bapperida,
    });
    assert.equal(activated.statusCode, 200, activated.body);

    const submission = await app.inject({
      method: "POST", url: "/api/v1/submissions", headers: opd,
      payload: { organization_id: dkpp, period_id: period.id },
    });
    assert.equal(submission.statusCode, 201, submission.body);
    const saved = await app.inject({
      method: "PUT", url: `/api/v1/submissions/${submission.json().id}/observations/${indicator.json().version_id}`,
      headers: opd, payload: { value: 81.5, notes: "Realisasi pengujian lintas peran." },
    });
    assert.equal(saved.statusCode, 200, saved.body);
    const submitted = await app.inject({
      method: "POST", url: `/api/v1/submissions/${submission.json().id}/actions/submit`, headers: opd,
      payload: {},
    });
    assert.equal(submitted.statusCode, 200, submitted.body);
    const approved = await app.inject({
      method: "POST", url: `/api/v1/submissions/${submission.json().id}/actions/approve`, headers: bapperida,
      payload: { notes: "Data lolos pengujian lintas peran." },
    });
    assert.equal(approved.statusCode, 200, approved.body);

    const candidates = await app.inject({
      method: "GET", url: `/api/v1/publications/candidates?period_id=${period.id}`, headers: { cookie: bapperida.cookie },
    });
    const candidate = candidates.json().data.find((item: { indicator_code: string }) => item.indicator_code === `FLOW_${suffix}`);
    assert.ok(candidate);
    const publication = await app.inject({
      method: "POST", url: "/api/v1/publications", headers: bapperida,
      payload: { publication_key: `FLOW_${suffix}`, publication_number: `FLOW-${suffix}`, title: `Publikasi Alur ${suffix}` },
    });
    assert.equal(publication.statusCode, 201, publication.body);
    const added = await app.inject({
      method: "POST", url: `/api/v1/publications/${publication.json().id}/items`, headers: bapperida,
      payload: { observation_ids: [candidate.observation_id] },
    });
    assert.equal(added.statusCode, 200, added.body);
    const published = await app.inject({
      method: "POST", url: `/api/v1/publications/${publication.json().id}/activate`, headers: bapperida,
      payload: { notes: "Aktivasi pengujian lintas peran." },
    });
    assert.equal(published.statusCode, 200, published.body);

    const dashboard = await app.inject({ method: "GET", url: "/api/v1/executive/dashboard", headers: { cookie: pimpinan.cookie } });
    assert.equal(dashboard.statusCode, 200, dashboard.body);
    const item = dashboard.json().items.find((entry: { indicator_code: string }) => entry.indicator_code === `FLOW_${suffix}`);
    assert.ok(item);
    assert.equal(Number(item.numeric_value), 81.5);
  } finally {
    await app.close();
    await db.end();
  }
});
