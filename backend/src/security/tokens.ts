import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function tokensMatch(left: string, rightHash: Buffer): boolean {
  const leftHash = hashToken(left);
  return leftHash.length === rightHash.length && timingSafeEqual(leftHash, rightHash);
}
