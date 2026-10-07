import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { generateTotpCode } from "../src/security/mfa.js";
import { testConfig } from "./test-config.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const adminEmail = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin.integration@sababuka.test";
const adminPassword = process.env.INTEGRATION_ADMIN_PASSWORD ?? "integration-password-not-for-production";

test(
  "undangan, aktivasi TOTP, login MFA, dan recovery code berjalan end-to-end",
  { skip: !databaseUrl },
  async () => {
    const db = createDatabase(databaseUrl!);
    const app = await buildApp({
      config: { ...testConfig, databaseUrl: databaseUrl! },
      db,
      logger: false,
    });

    try {
      const adminLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { identifier: adminEmail, password: adminPassword },
      });
      assert.equal(adminLogin.statusCode, 200, adminLogin.body);
      const adminAuth = adminLogin.json();
      const adminCookie = String(adminLogin.headers["set-cookie"]).split(";", 1)[0]!;
      const adminHeaders = { cookie: adminCookie, "x-csrf-token": adminAuth.csrf_token };

      const organization = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        headers: adminHeaders,
        payload: { code: "MFA_TEST_OPD", name: "MFA Integration OPD", organization_type: "opd" },
      });
      assert.equal(organization.statusCode, 201, organization.body);
      const organizationId = organization.json().id as string;

      const invitedUser = await app.inject({
        method: "POST",
        url: "/api/v1/users",
        headers: adminHeaders,
        payload: {
          email: "mfa.integration@sababuka.test",
          full_name: "Pengguna MFA Integration",
          organization_id: organizationId,
        },
      });
      assert.equal(invitedUser.statusCode, 201, invitedUser.body);
      const invitationToken = invitedUser.json().invitation_token as string;
      const userId = invitedUser.json().id as string;
      assert.ok(invitationToken.length >= 32);

      const roles = await app.inject({ method: "GET", url: "/api/v1/roles", headers: { cookie: adminCookie } });
      const opdRole = roles.json().data.find((role: { code: string }) => role.code === "opd");
      assert.ok(opdRole?.id);
      const assignment = await app.inject({
        method: "POST",
        url: `/api/v1/users/${userId}/role-assignments`,
        headers: adminHeaders,
        payload: { role_id: opdRole.id, scope_type: "organization", organization_id: organizationId },
      });
      assert.equal(assignment.statusCode, 201, assignment.body);

      const invitation = await app.inject({
        method: "GET",
        url: `/api/v1/auth/invitations/${invitationToken}`,
      });
      assert.equal(invitation.statusCode, 200, invitation.body);
      assert.equal(invitation.json().email, "mfa.integration@sababuka.test");

      const setup = await app.inject({
        method: "POST",
        url: `/api/v1/auth/invitations/${invitationToken}/mfa/setup`,
      });
      assert.equal(setup.statusCode, 200, setup.body);
      const secret = setup.json().secret as string;
      assert.ok(setup.json().provisioning_uri.startsWith("otpauth://totp/"));

      const userPassword = "Mfa-Integration-Password-2026!";
      const acceptanceCode = generateTotpCode(secret, Date.now() - 30_000);
      const accepted = await app.inject({
        method: "POST",
        url: `/api/v1/auth/invitations/${invitationToken}/accept`,
        payload: { password: userPassword, mfa_code: acceptanceCode },
      });
      assert.equal(accepted.statusCode, 200, accepted.body);
      assert.equal(accepted.json().status, "active");
      assert.equal(accepted.json().recovery_codes.length, 8);
      const recoveryCode = accepted.json().recovery_codes[0] as string;

      const reusedInvitation = await app.inject({
        method: "GET",
        url: `/api/v1/auth/invitations/${invitationToken}`,
      });
      assert.equal(reusedInvitation.statusCode, 404, reusedInvitation.body);

      const missingMfa = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { identifier: "mfa.integration@sababuka.test", password: userPassword },
      });
      assert.equal(missingMfa.statusCode, 401, missingMfa.body);
      assert.equal(missingMfa.json().error.code, "MFA_REQUIRED");

      const totpLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "mfa.integration@sababuka.test",
          password: userPassword,
          mfa_code: generateTotpCode(secret),
        },
      });
      assert.equal(totpLogin.statusCode, 200, totpLogin.body);
      const totpBody = totpLogin.json();
      const totpCookie = String(totpLogin.headers["set-cookie"]).split(";", 1)[0]!;
      const logout = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { cookie: totpCookie, "x-csrf-token": totpBody.csrf_token },
      });
      assert.equal(logout.statusCode, 204, logout.body);

      const recoveryLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "mfa.integration@sababuka.test",
          password: userPassword,
          recovery_code: recoveryCode,
        },
      });
      assert.equal(recoveryLogin.statusCode, 200, recoveryLogin.body);
      const recoveryBody = recoveryLogin.json();
      const recoveryCookie = String(recoveryLogin.headers["set-cookie"]).split(";", 1)[0]!;
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { cookie: recoveryCookie, "x-csrf-token": recoveryBody.csrf_token },
      });

      const reusedRecovery = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "mfa.integration@sababuka.test",
          password: userPassword,
          recovery_code: recoveryCode,
        },
      });
      assert.equal(reusedRecovery.statusCode, 401, reusedRecovery.body);
      assert.equal(reusedRecovery.json().error.code, "MFA_INVALID");
    } finally {
      await app.close();
      await db.end();
    }
  },
);
