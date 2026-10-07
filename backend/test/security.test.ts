import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/security/password.js";
import {
  decodeBase32,
  decryptMfaSecret,
  encodeBase32,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpCode,
  hashRecoveryCode,
  verifyTotp,
} from "../src/security/mfa.js";
import { hashToken, randomToken, tokensMatch } from "../src/security/tokens.js";

test("token acak dapat diverifikasi tanpa menyimpan token asli", () => {
  const token = randomToken();
  const digest = hashToken(token);
  assert.equal(tokensMatch(token, digest), true);
  assert.equal(tokensMatch(`${token}x`, digest), false);
});

test("password memakai Argon2id dan dapat diverifikasi", async () => {
  const password = "contoh-password-yang-panjang";
  const digest = await hashPassword(password);
  assert.match(digest, /^\$argon2id\$/);
  assert.equal(await verifyPassword(digest, password), true);
  assert.equal(await verifyPassword(digest, "password-salah"), false);
});

test("secret MFA dapat dienkripsi, didekripsi, dan diverifikasi sebagai TOTP", () => {
  const secret = Buffer.from("12345678901234567890", "utf8");
  const base32 = encodeBase32(secret);
  assert.deepEqual(decodeBase32(base32), secret);

  const key = Buffer.alloc(32, 9);
  const encrypted = encryptMfaSecret(secret, key);
  assert.notDeepEqual(encrypted, secret);
  assert.deepEqual(decryptMfaSecret(encrypted, key), secret);

  const timeMs = 1_700_000_000_000;
  const code = generateTotpCode(base32, timeMs);
  const counter = verifyTotp(secret, code, { timeMs });
  assert.equal(typeof counter, "number");
  assert.equal(verifyTotp(secret, code, { timeMs, afterCounter: counter }), null);
});

test("recovery code unik dan dapat dicocokkan tanpa menyimpan kode asli", () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  assert.equal(hashRecoveryCode(codes[0]!), hashRecoveryCode(codes[0]!.toLowerCase().replaceAll("-", "")));
});
