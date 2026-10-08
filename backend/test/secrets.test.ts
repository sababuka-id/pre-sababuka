import assert from "node:assert/strict";
import test from "node:test";
import { decryptSecret, encryptSecret, maskSecret, parseSecretKey } from "../src/security/secrets.js";

test("connector secret encryption round-trips and does not contain plaintext", () => {
  const key = Buffer.alloc(32, 8);
  const plaintext = "bps-test-key-2026";
  const encrypted = encryptSecret(plaintext, key);
  assert.notEqual(encrypted, plaintext);
  assert.doesNotMatch(encrypted, /bps-test-key/);
  assert.equal(decryptSecret(encrypted, key), plaintext);
});

test("connector secret key is fail-safe and masking is non-reversible", () => {
  assert.equal(parseSecretKey(undefined), null);
  assert.throws(() => parseSecretKey(Buffer.alloc(31, 1).toString("base64")), /tepat 32 byte/);
  assert.equal(maskSecret("abcdef1234"), "ab••••34");
  assert.equal(maskSecret("abc"), "••••••");
});
