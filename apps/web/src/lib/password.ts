import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id password hashing. Server-only (native module — never imported on the edge/client).
 * Parameters follow OWASP guidance for argon2id.
 */
const OPTS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export function verifyPassword(hashString: string, plain: string): Promise<boolean> {
  return verify(hashString, plain, OPTS);
}
