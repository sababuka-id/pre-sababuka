import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

export function encodeBase32(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=+$/u, "").replace(/\s+/gu, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Secret base32 tidak valid.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpSecret(): Buffer {
  return randomBytes(20);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTotpCode(secretBase32: string, timeMs = Date.now()): string {
  const counter = Math.floor(timeMs / 1000 / TOTP_PERIOD_SECONDS);
  return hotp(decodeBase32(secretBase32), counter);
}

export function verifyTotp(
  secret: Buffer,
  code: string,
  options: { timeMs?: number; window?: number; afterCounter?: number | null } = {},
): number | null {
  if (!/^\d{6}$/u.test(code)) return null;
  const current = Math.floor((options.timeMs ?? Date.now()) / 1000 / TOTP_PERIOD_SECONDS);
  const window = options.window ?? 1;
  const provided = Buffer.from(code);
  for (let delta = -window; delta <= window; delta += 1) {
    const counter = current + delta;
    if (counter < 0 || (options.afterCounter != null && counter <= options.afterCounter)) continue;
    const expected = Buffer.from(hotp(secret, counter));
    if (timingSafeEqual(expected, provided)) return counter;
  }
  return null;
}

export function encryptMfaSecret(secret: Buffer, key: Buffer): Buffer {
  if (key.length !== 32) throw new Error("Kunci enkripsi MFA harus 32 byte.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), nonce, cipher.getAuthTag(), ciphertext]);
}

export function decryptMfaSecret(payload: Buffer, key: Buffer): Buffer {
  if (key.length !== 32 || payload.length < 30 || payload[0] !== 1) {
    throw new Error("Data MFA terenkripsi tidak valid.");
  }
  const nonce = payload.subarray(1, 13);
  const tag = payload.subarray(13, 29);
  const ciphertext = payload.subarray(29);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function buildTotpUri(issuer: string, account: string, secretBase32: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(8).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/gu, "");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
