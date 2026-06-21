import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

export const passwordSchema = z.string().min(12).max(128);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function digestAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthToken(lifetimeMs: number) {
  const rawToken = randomBytes(32).toString("hex");
  return {
    rawToken,
    digest: digestAuthToken(rawToken),
    expires: new Date(Date.now() + lifetimeMs),
  };
}

export function hashPassword(password: string) {
  return hash(password, 12);
}

export function passwordMatches(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
