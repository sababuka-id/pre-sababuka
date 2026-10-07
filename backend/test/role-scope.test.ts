import assert from "node:assert/strict";
import test from "node:test";
import { allowedScopesForRole, assertRoleScope } from "../src/services/admin-service.js";

test("matriks role-scope mengikuti desain SABABUKA", () => {
  assert.deepEqual(allowedScopesForRole("superadmin"), ["global"]);
  assert.deepEqual(allowedScopesForRole("bapperida"), ["global"]);
  assert.deepEqual(allowedScopesForRole("kominfo"), ["global"]);
  assert.deepEqual(allowedScopesForRole("opd"), ["organization"]);
  assert.deepEqual(allowedScopesForRole("pimpinan"), ["published"]);
  assert.deepEqual(allowedScopesForRole("role-tidak-dikenal"), []);
  assert.doesNotThrow(() => assertRoleScope("opd", "organization", "org-1"));
  assert.doesNotThrow(() => assertRoleScope("pimpinan", "published"));
  assert.throws(() => assertRoleScope("opd", "global"), { code: "INVALID_ROLE_SCOPE" });
  assert.throws(() => assertRoleScope("pimpinan", "organization", "org-1"), { code: "INVALID_ROLE_SCOPE" });
  assert.throws(() => assertRoleScope("opd", "organization"), { code: "VALIDATION_ERROR" });
});
