import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { testConfig } from "./test-config.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const email = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin.integration@sababuka.test";
const password = process.env.INTEGRATION_ADMIN_PASSWORD ?? "integration-password-not-for-production";

test("form capaian OPD mendukung isi, submit, return, dan approve", { skip: !databaseUrl }, async () => {
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
      const roleCookie = String(response.headers["set-cookie"]).split(";", 1)[0]!;
      return { cookie: roleCookie, "x-csrf-token": response.json().csrf_token as string };
    };
    const bapperidaHeaders = await loginAs("bapperida@sababuka.com");
    const opdHeaders = await loginAs("opd.dkpp@sababuka.com");
    const pimpinanHeaders = await loginAs("pimpinan@sababuka.com");

    const indicators = await app.inject({ method: "GET", url: "/api/v1/indicators?q=IKP", headers: { cookie } });
    assert.equal(indicators.statusCode, 200, indicators.body);
    const indicator = indicators.json().data.find((item: { code: string }) => item.code === "IKP");
    const categories = await app.inject({ method: "GET", url: `/api/v1/categories?q=${encodeURIComponent(indicator.category_name)}`, headers: { cookie } });
    assert.equal(categories.statusCode, 200, categories.body);
    const category = categories.json().data.find((item: { id: string }) => item.id === indicator.category_id);
    if (category.review_status === "draft") {
      const submittedCategory = await app.inject({ method: "POST", url: `/api/v1/categories/${category.id}/actions/submit`, headers });
      assert.equal(submittedCategory.statusCode, 200, submittedCategory.body);
      const approvedCategory = await app.inject({ method: "POST", url: `/api/v1/categories/${category.id}/actions/approve`, headers: bapperidaHeaders });
      assert.equal(approvedCategory.statusCode, 200, approvedCategory.body);
    }
    const submittedIndicator = await app.inject({ method: "POST", url: `/api/v1/indicator-versions/${indicator.version_id}/actions/submit`, headers });
    assert.equal(submittedIndicator.statusCode, 200, submittedIndicator.body);
    const approvedIndicator = await app.inject({ method: "POST", url: `/api/v1/indicator-versions/${indicator.version_id}/actions/approve`, headers: bapperidaHeaders });
    assert.equal(approvedIndicator.statusCode, 200, approvedIndicator.body);
    const verifiedIndicator = await app.inject({ method: "POST", url: `/api/v1/indicator-versions/${indicator.version_id}/actions/verify`, headers: opdHeaders });
    assert.equal(verifiedIndicator.statusCode, 200, verifiedIndicator.body);
    const activatedIndicator = await app.inject({ method: "POST", url: `/api/v1/indicator-versions/${indicator.version_id}/actions/activate`, headers: bapperidaHeaders });
    assert.equal(activatedIndicator.statusCode, 200, activatedIndicator.body);

    const periods = await app.inject({ method: "GET", url: "/api/v1/periods", headers: { cookie } });
    const organizations = await app.inject({ method: "GET", url: "/api/v1/organizations?page_size=100", headers: { cookie } });
    const period = periods.json().data.find((item: { code: string }) => item.code === "2025");
    const organization = organizations.json().data.find((item: { code: string }) => item.code === "DKPP");

    const created = await app.inject({ method: "POST", url: "/api/v1/submissions", headers: opdHeaders,
      payload: { organization_id: organization.id, period_id: period.id } });
    assert.equal(created.statusCode, 201, created.body);
    assert.equal(created.json().status, "draft");
    assert.ok(created.json().observations.some((item: { indicator_code: string }) => item.indicator_code === "IKP"));

    const saved = await app.inject({ method: "PUT", url: `/api/v1/submissions/${created.json().id}/observations/${indicator.version_id}`, headers: opdHeaders,
      payload: { value: 82.75, notes: "Realisasi integration test" } });
    assert.equal(saved.statusCode, 200, saved.body);
    assert.equal(Number(saved.json().numeric_value), 82.75);

    const boundary = "----sababuka-integration-boundary";
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF", "utf8");
    const multipart = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="bukti-uji.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      pdf, Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const uploaded = await app.inject({ method: "POST", url: `/api/v1/submissions/${created.json().id}/evidence?indicator_version_id=${indicator.version_id}`,
      headers: { ...opdHeaders, "content-type": `multipart/form-data; boundary=${boundary}` }, payload: multipart });
    assert.equal(uploaded.statusCode, 201, uploaded.body);
    assert.equal(uploaded.json().original_filename, "bukti-uji.pdf");
    assert.equal(Number(uploaded.json().byte_size), pdf.length);

    const evidence = await app.inject({ method: "GET", url: `/api/v1/submissions/${created.json().id}/evidence`, headers: { cookie: opdHeaders.cookie } });
    assert.equal(evidence.statusCode, 200, evidence.body);
    assert.equal(evidence.json().data.length, 1);
    const downloaded = await app.inject({ method: "GET", url: `/api/v1/submissions/${created.json().id}/evidence/${uploaded.json().id}/download`, headers: { cookie: opdHeaders.cookie } });
    assert.equal(downloaded.statusCode, 200, downloaded.body);
    assert.equal(downloaded.rawPayload.equals(pdf), true);
    const removed = await app.inject({ method: "DELETE", url: `/api/v1/submissions/${created.json().id}/evidence/${uploaded.json().id}`, headers: opdHeaders });
    assert.equal(removed.statusCode, 204, removed.body);

    const reviewer = await db.query<{ id: string }>(`INSERT INTO sababuka.users (email, full_name, status) VALUES ('reviewer.integration@sababuka.test', 'Reviewer Integration', 'active') RETURNING id::text`);
    await db.query(`INSERT INTO sababuka.user_role_assignments (user_id, role_id, scope_type) SELECT $1, id, 'global' FROM sababuka.roles WHERE code = 'bapperida'`, [reviewer.rows[0]!.id]);

    for (const [action, expected, notes] of [
      ["submit", "submitted", null], ["start-review", "under_review", null], ["return", "returned", "Mohon cek kembali sumber data."],
      ["submit", "submitted", null], ["start-review", "under_review", null], ["return", "returned", "Mohon cek kembali sumber data."],
      ["submit", "submitted", null], ["start-review", "under_review", null], ["approve", "approved", "Telah diverifikasi."],
    ] as const) {
      const transition = await app.inject({ method: "POST", url: `/api/v1/submissions/${created.json().id}/actions/${action}`, headers: action === "submit" ? opdHeaders : bapperidaHeaders, payload: { notes } });
      assert.equal(transition.statusCode, 200, transition.body);
      assert.equal(transition.json().status, expected);
    }
    const reviewerNotifications = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM sababuka.notifications WHERE user_id = $1 AND notification_type = 'submission.submitted'`, [reviewer.rows[0]!.id]);
    assert.ok(reviewerNotifications.rows[0]!.count >= 1);

    const candidates = await app.inject({ method: "GET", url: `/api/v1/publications/candidates?period_id=${period.id}`, headers: { cookie: bapperidaHeaders.cookie } });
    assert.equal(candidates.statusCode, 200, candidates.body);
    const candidate = candidates.json().data.find((item: { indicator_code: string }) => item.indicator_code === "IKP");
    assert.ok(candidate);
    const publication = await app.inject({ method: "POST", url: "/api/v1/publications", headers: bapperidaHeaders,
      payload: { publication_key: "RINGKASAN_2025", publication_number: "PUB-TEST-2025", title: "Ringkasan Capaian 2025", description: "Publikasi integration test" } });
    assert.equal(publication.statusCode, 201, publication.body);
    const added = await app.inject({ method: "POST", url: `/api/v1/publications/${publication.json().id}/items`, headers: bapperidaHeaders,
      payload: { observation_ids: [candidate.observation_id] } });
    assert.equal(added.statusCode, 200, added.body);
    assert.equal(added.json().items.length, 1);
    const activated = await app.inject({ method: "POST", url: `/api/v1/publications/${publication.json().id}/activate`, headers: bapperidaHeaders,
      payload: { notes: "Aktivasi integration test" } });
    assert.equal(activated.statusCode, 200, activated.body);
    assert.equal(activated.json().status, "active");

    const executive = await app.inject({ method: "GET", url: "/api/v1/executive/dashboard", headers: { cookie: pimpinanHeaders.cookie } });
    assert.equal(executive.statusCode, 200, executive.body);
    assert.ok(executive.json().metrics.approved_submissions >= 1);
    assert.ok(executive.json().items.some((item: { indicator_code: string }) => item.indicator_code === "IKP"));

    const assistantSession = await app.inject({ method: "POST", url: "/api/v1/assistant/sessions", headers: pimpinanHeaders,
      payload: { title: "Integration assistant" } });
    assert.equal(assistantSession.statusCode, 201, assistantSession.body);
    const answered = await app.inject({ method: "POST", url: `/api/v1/assistant/sessions/${assistantSession.json().id}/messages`, headers: pimpinanHeaders,
      payload: { message: "Berapa nilai IKP tahun 2025?" } });
    assert.equal(answered.statusCode, 200, answered.body);
    assert.notEqual(answered.json().sufficiency, "insufficient");
    assert.ok(answered.json().citations.length >= 1);
    assert.match(answered.json().answer, /82,75/u);
    const refused = await app.inject({ method: "POST", url: `/api/v1/assistant/sessions/${assistantSession.json().id}/messages`, headers: pimpinanHeaders,
      payload: { message: "Berapa jumlah kendaraan listrik tahun 2035?" } });
    assert.equal(refused.statusCode, 200, refused.body);
    assert.equal(refused.json().sufficiency, "insufficient");
    assert.equal(refused.json().citations.length, 0);

    const adminId = await db.query<{ id: string }>(`SELECT id::text FROM sababuka.users WHERE email = $1`, [email]);
    await db.query(`INSERT INTO sababuka.notifications (user_id, notification_type, title, message) VALUES ($1, 'test.notice', 'Notifikasi pengujian', 'Notifikasi ini khusus integration test.')`, [adminId.rows[0]!.id]);
    const notifications = await app.inject({ method: "GET", url: "/api/v1/notifications?unread_only=true", headers: { cookie } });
    assert.equal(notifications.statusCode, 200, notifications.body);
    const ownNotification = notifications.json().data.find((item: { notification_type: string }) => item.notification_type === "test.notice");
    assert.ok(ownNotification);
    const marked = await app.inject({ method: "POST", url: `/api/v1/notifications/${ownNotification.id}/read`, headers });
    assert.equal(marked.statusCode, 204, marked.body);
    const audit = await app.inject({ method: "GET", url: "/api/v1/audit/events?page_size=100&event_type=publication.activated", headers: { cookie } });
    assert.equal(audit.statusCode, 200, audit.body);
    assert.ok(audit.json().meta.total_items >= 1);

    const editApproved = await app.inject({ method: "PUT", url: `/api/v1/submissions/${created.json().id}/observations/${indicator.version_id}`, headers: opdHeaders,
      payload: { value: 90 } });
    assert.equal(editApproved.statusCode, 409, editApproved.body);
  } finally {
    await app.close(); await db.end();
  }
});
