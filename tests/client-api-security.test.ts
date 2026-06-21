import assert from "node:assert/strict";
import test from "node:test";
import { CLIENT_SENSITIVE_FIELDS, safeClientDetailSelect, safeClientSelect, serializeSafeClient } from "../lib/client-safe";

test("client Prisma projections never select sensitive fields", () => {
  const projections = JSON.stringify({ safeClientSelect, safeClientDetailSelect });
  for (const field of CLIENT_SENSITIVE_FIELDS) assert.equal(projections.includes(field), false, `${field} must not be selected`);
});

test("client serializer drops sensitive fields even if an unsafe object is passed", () => {
  const unsafe = {
    id: "client-1", name: "Test Client", email: "client@example.test", emailVerified: new Date(), role: "CLIENT",
    lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(), profile: null,
    passwordHash: "must-never-leak", mfaSecretEncrypted: Buffer.from("secret"), addressEncrypted: Buffer.from("address"),
    storageKey: "clients/private/object", sessions: [{ sessionToken: "secret" }], accounts: [{ access_token: "secret" }],
  };
  const response = serializeSafeClient(unsafe as never);
  const json = JSON.stringify(response);
  for (const field of CLIENT_SENSITIVE_FIELDS) assert.equal(json.includes(field), false, `${field} leaked from serializer`);
  assert.equal(json.includes("must-never-leak"), false);
});
