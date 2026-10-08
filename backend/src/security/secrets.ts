import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "v1";

export function parseSecretKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("CONNECTOR_ENCRYPTION_KEY harus berupa base64 dari tepat 32 byte.");
  return key;
}

export function encryptSecret(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptSecret(payload: string, key: Buffer): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = payload.split(":");
  if (version !== PREFIX || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Format secret konektor tidak valid.");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length < 6) return "••••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}
