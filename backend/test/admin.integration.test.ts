import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { testConfig } from "./test-config.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const email = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin.integration@sababuka.test";
const password = process.env.INTEGRATION_ADMIN_PASSWORD ?? "integration-password-not-for-production";

test(
  "Superadmin mengelola organisasi, pengguna, role, menu, dan konfigurasi",
  { skip: !databaseUrl },
  async () => {
    const db = createDatabase(databaseUrl!);
    const app = await buildApp({
      config: { ...testConfig, databaseUrl: databaseUrl! },
      db,
      logger: false,
    });

    try {
      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { identifier: email, password },
      });
      assert.equal(login.statusCode, 200, login.body);
      const auth = login.json();
      const cookie = String(login.headers["set-cookie"]).split(";", 1)[0]!;
      const headers = { cookie, "x-csrf-token": auth.csrf_token };

      const rejectedWithoutCsrf = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        headers: { cookie },
        payload: { code: "TEST_NO_CSRF", name: "Ditolak", organization_type: "opd" },
      });
      assert.equal(rejectedWithoutCsrf.statusCode, 403, rejectedWithoutCsrf.body);

      const organization = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        headers,
        payload: {
          code: "TEST_OPD",
          name: "OPD Integration Test",
          short_name: "OPD Test",
          organization_type: "opd",
        },
      });
      assert.equal(organization.statusCode, 201, organization.body);
      const organizationId = organization.json().id as string;

      const user = await app.inject({
        method: "POST",
        url: "/api/v1/users",
        headers,
        payload: {
          email: "opd.integration@sababuka.test",
          full_name: "Operator Integration",
          organization_id: organizationId,
        },
      });
      assert.equal(user.statusCode, 201, user.body);
      assert.equal(user.json().status, "invited");
      const userId = user.json().id as string;

      const roles = await app.inject({ method: "GET", url: "/api/v1/roles", headers: { cookie } });
      assert.equal(roles.statusCode, 200, roles.body);
      const opdRole = roles.json().data.find((role: { code: string }) => role.code === "opd");
      const superadminRole = roles.json().data.find((role: { code: string }) => role.code === "superadmin");
      assert.ok(opdRole?.id);
      assert.ok(superadminRole?.id);

      const assignment = await app.inject({
        method: "POST",
        url: `/api/v1/users/${userId}/role-assignments`,
        headers,
        payload: { role_id: opdRole.id, scope_type: "organization", organization_id: organizationId },
      });
      assert.equal(assignment.statusCode, 201, assignment.body);

      const invalidScope = await app.inject({
        method: "POST",
        url: `/api/v1/users/${userId}/role-assignments`,
        headers,
        payload: { role_id: opdRole.id, scope_type: "global" },
      });
      assert.equal(invalidScope.statusCode, 400, invalidScope.body);
      assert.equal(invalidScope.json().error.code, "INVALID_ROLE_SCOPE");

      const updated = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/${userId}`,
        headers,
        payload: { full_name: "Operator Integration Updated" },
      });
      assert.equal(updated.statusCode, 200, updated.body);
      assert.equal(updated.json().full_name, "Operator Integration Updated");

      const users = await app.inject({
        method: "GET",
        url: `/api/v1/users?organization_id=${organizationId}`,
        headers: { cookie },
      });
      assert.equal(users.statusCode, 200, users.body);
      assert.equal(users.json().data.length, 1);

      const permissions = await app.inject({ method: "GET", url: "/api/v1/permissions", headers: { cookie } });
      assert.equal(permissions.statusCode, 200, permissions.body);
      assert.ok(permissions.json().data.length >= 42);

      const protectedPermissions = await app.inject({
        method: "PUT",
        url: `/api/v1/roles/${superadminRole.id}/permissions`,
        headers,
        payload: { permission_ids: [] },
      });
      assert.equal(protectedPermissions.statusCode, 409, protectedPermissions.body);

      const menus = await app.inject({ method: "GET", url: "/api/v1/menus", headers: { cookie } });
      assert.equal(menus.statusCode, 200, menus.body);
      assert.equal(menus.json().data.length, 20);
      assert.ok(menus.json().data.some((menu: { code: string }) => menu.code === "operations"));

      const roleMenus = await app.inject({
        method: "GET",
        url: `/api/v1/roles/${superadminRole.id}/menus`,
        headers: { cookie },
      });
      assert.equal(roleMenus.statusCode, 200, roleMenus.body);
      assert.equal(roleMenus.json().role_id, superadminRole.id);
      assert.equal(roleMenus.json().menu_ids.length, 20);

      const protectedMenus = await app.inject({
        method: "PUT",
        url: `/api/v1/roles/${superadminRole.id}/menus`,
        headers,
        payload: { menu_ids: [] },
      });
      assert.equal(protectedMenus.statusCode, 409, protectedMenus.body);

      const setting = await app.inject({
        method: "PUT",
        url: "/api/v1/system/settings/dashboard.refresh_seconds",
        headers,
        payload: { value: 300, description: "Interval refresh dashboard" },
      });
      assert.equal(setting.statusCode, 200, setting.body);
      assert.equal(setting.json().value, 300);

      const flag = await app.inject({
        method: "PUT",
        url: "/api/v1/system/feature-flags/public.portal",
        headers,
        payload: { is_enabled: false, configuration: { reason: "internal_mvp" } },
      });
      assert.equal(flag.statusCode, 200, flag.body);
      assert.equal(flag.json().is_enabled, false);

      const configuration = await app.inject({
        method: "GET",
        url: "/api/v1/system/configuration",
        headers: { cookie },
      });
      assert.equal(configuration.statusCode, 200, configuration.body);
      assert.ok(configuration.json().settings.some((item: { key: string }) => item.key === "dashboard.refresh_seconds"));

      const audit = await db.query<{ event_type: string }>(
        `SELECT event_type FROM sababuka.audit_events
         WHERE actor_id = $1 AND event_type IN (
           'organization.created', 'user.invited', 'user.role_assigned',
           'user.updated', 'system.setting_updated', 'system.feature_flag_updated'
         )`,
        [auth.user.id],
      );
      assert.equal(new Set(audit.rows.map((row) => row.event_type)).size, 6);
    } finally {
      await app.close();
      await db.end();
    }
  },
);
