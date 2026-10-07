import {
  argon2id,
  hash,
  verify,
  type HashOptions,
} from "argon2";

const ARGON2_OPTIONS: HashOptions & { raw?: false } = {
  type: argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}
