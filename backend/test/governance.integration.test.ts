import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { testConfig } from "./test-config.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const email = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin.integration@sababuka.test";
const password = process.env.INTEGRATION_ADMIN_PASSWORD ?? "integration-password-not-for-production";

test("master kategori dan indikator pilot dapat dibaca dan ditambah sebagai draft", { skip: !databaseUrl }, async () => {
  const db = createDatabase(databaseUrl!);
  const app = await buildApp({ config: { ...testConfig, databaseUrl: databaseUrl! }, db, logger: false });
  try {
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { identifier: email, password } });
    assert.equal(login.statusCode, 200, login.body);
    const cookie = String(login.headers["set-cookie"]).split(";", 1)[0]!;
    const headers = { cookie, "x-csrf-token": login.json().csrf_token as string };
    const loginAs = async (identifier: string) => {
      const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { identifier, password } });
      assert.equal(response.statusCode, 200, response.body);
      return {
        cookie: String(response.headers["set-cookie"]).split(";", 1)[0]!,
        "x-csrf-token": response.json().csrf_token as string,
      };
    };
    const bapperidaHeaders = await loginAs("bapperida@sababuka.com");
    const opdHeaders = await loginAs("opd.dkpp@sababuka.com");

    const categories = await app.inject({ method: "GET", url: "/api/v1/categories?page_size=100", headers: { cookie } });
    assert.equal(categories.statusCode, 200, categories.body);
    assert.ok(categories.json().meta.total_items >= 5);

    const indicators = await app.inject({ method: "GET", url: "/api/v1/indicators?page_size=100", headers: { cookie } });
    assert.equal(indicators.statusCode, 200, indicators.body);
    assert.ok(indicators.json().meta.total_items >= 15);
    assert.equal(indicators.json().data.find((item: { code: string }) => item.code === "IKP").targets.length, 5);

    const units = await app.inject({ method: "GET", url: "/api/v1/units", headers: { cookie } });
    const periods = await app.inject({ method: "GET", url: "/api/v1/periods", headers: { cookie } });
    const organizations = await app.inject({ method: "GET", url: "/api/v1/organizations?page_size=100", headers: { cookie } });
    assert.equal(units.statusCode, 200, units.body);
    assert.equal(periods.statusCode, 200, periods.body);
    assert.equal(organizations.statusCode, 200, organizations.body);

    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const category = await app.inject({
      method: "POST", url: "/api/v1/categories", headers,
      payload: { code: `TEST_${suffix}`, name: `Kategori Integration ${suffix}`, description: "Data khusus pengujian." },
    });
    assert.equal(category.statusCode, 201, category.body);
    assert.equal(category.json().review_status, "draft");
    const submittedCategory = await app.inject({
      method: "POST", url: `/api/v1/categories/${category.json().id}/actions/submit`, headers,
    });
    assert.equal(submittedCategory.statusCode, 200, submittedCategory.body);
    assert.equal(submittedCategory.json().review_status, "in_review");
    const approvedCategory = await app.inject({
      method: "POST", url: `/api/v1/categories/${category.json().id}/actions/approve`, headers: bapperidaHeaders,
    });
    assert.equal(approvedCategory.statusCode, 200, approvedCategory.body);
    assert.equal(approvedCategory.json().review_status, "approved");

    const unit = units.json().data.find((item: { code: string }) => item.code === "PERCENT");
    const period = periods.json().data.find((item: { code: string }) => item.code === "2025");
    const organization = organizations.json().data.find((item: { code: string }) => item.code === "DKPP");
    const indicator = await app.inject({
      method: "POST", url: "/api/v1/indicators", headers,
      payload: {
        code: `TEST_${suffix}`, name: `Indikator Integration ${suffix}`, category_id: category.json().id,
        owner_organization_id: organization.id, definition: "Definisi indikator untuk pengujian integration.",
        unit_id: unit.id, frequency: "annual", data_type: "percentage", direction: "increase",
        source_reference: "Sumber pengujian", access_level: "internal", effective_from: "2025-01-01",
        organizations: [{ organization_id: organization.id, responsibility: "primary_producer", is_primary: true }],
        targets: [{ period_id: period.id, numeric_value: 10, notes: "Target pengujian" }],
      },
    });
    assert.equal(indicator.statusCode, 201, indicator.body);
    assert.equal(indicator.json().status, "draft");

    const updated = await app.inject({
      method: "PATCH", url: `/api/v1/indicators/${indicator.json().id}`, headers,
      payload: {
        code: `TEST_${suffix}`, name: `Indikator Integration ${suffix} Diperbarui`, category_id: category.json().id,
        owner_organization_id: organization.id, definition: "Definisi indikator yang telah diperbarui.",
        unit_id: unit.id, frequency: "annual", data_type: "percentage", direction: "increase",
        source_reference: "Sumber pengujian diperbarui", access_level: "internal", effective_from: "2025-01-01",
        organizations: [{ organization_id: organization.id, responsibility: "primary_producer", is_primary: true }],
        targets: [{ period_id: period.id, numeric_value: 11, notes: "Target diperbarui" }],
      },
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.equal(updated.json().source_reference, "Sumber pengujian diperbarui");

    const filtered = await app.inject({ method: "GET", url: `/api/v1/indicators?q=TEST_${suffix}`, headers: { cookie } });
    assert.equal(filtered.statusCode, 200, filtered.body);
    assert.equal(Number(filtered.json().data[0].targets[0].numeric_value), 11);

    const submittedIndicator = await app.inject({
      method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/submit`, headers,
    });
    assert.equal(submittedIndicator.statusCode, 200, submittedIndicator.body);
    assert.equal(submittedIndicator.json().status, "in_review");
    const approvedIndicator = await app.inject({
      method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/approve`, headers: bapperidaHeaders,
    });
    assert.equal(approvedIndicator.statusCode, 200, approvedIndicator.body);
    assert.equal(approvedIndicator.json().status, "opd_verification");
    const verifiedIndicator = await app.inject({
      method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/verify`, headers: opdHeaders,
    });
    assert.equal(verifiedIndicator.statusCode, 200, verifiedIndicator.body);
    assert.equal(verifiedIndicator.json().status, "approved");
    const activatedIndicator = await app.inject({
      method: "POST", url: `/api/v1/indicator-versions/${indicator.json().version_id}/actions/activate`, headers: bapperidaHeaders,
    });
    assert.equal(activatedIndicator.statusCode, 200, activatedIndicator.body);

    const editActive = await app.inject({
      method: "PATCH", url: `/api/v1/indicators/${indicator.json().id}`, headers,
      payload: {
        code: `TEST_${suffix}`, name: "Tidak boleh berubah", category_id: category.json().id,
        definition: "Versi aktif tidak dapat diubah langsung.", unit_id: unit.id,
        frequency: "annual", data_type: "percentage", effective_from: "2025-01-01",
      },
    });
    assert.equal(editActive.statusCode, 409, editActive.body);
  } finally {
    await app.close();
    await db.end();
  }
});
