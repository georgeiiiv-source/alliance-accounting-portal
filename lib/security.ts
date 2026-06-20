import { createHash } from "node:crypto";

export const allowedMimeTypes = new Set([
  "application/pdf", "image/jpeg", "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"
]);
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function hashIp(value?: string | null) {
  return value ? createHash("sha256").update(`${process.env.AUTH_SECRET}:${value}`).digest("hex") : null;
}

export function encryptPlaceholder(value: string) {
  // Production deployments should replace this boundary with envelope encryption (KMS).
  return Buffer.from(value, "utf8");
}

export function decryptPlaceholder(value: Uint8Array) {
  return Buffer.from(value).toString("utf8");
}
