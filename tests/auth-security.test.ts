import assert from "node:assert/strict";
import test from "node:test";
import { appUrl, getAppUrl } from "../lib/app-url";
import {
  createAuthToken,
  digestAuthToken,
  hashPassword,
  normalizeEmail,
  passwordMatches,
  passwordSchema,
} from "../lib/auth-security";

test("email normalization and the password policy match the credentials provider", () => {
  assert.equal(normalizeEmail("  Client.Local@Example.TEST "), "client.local@example.test");
  assert.equal(passwordSchema.safeParse("short").success, false);
  assert.equal(passwordSchema.safeParse("LocalClient!2026").success, true);
});

test("bcrypt password hashes accept the original password and reject another password", async () => {
  const passwordHash = await hashPassword("LocalClient!2026");
  assert.equal(await passwordMatches("LocalClient!2026", passwordHash), true);
  assert.equal(await passwordMatches("IncorrectPass!2026", passwordHash), false);
});

test("one-time authentication tokens store a digest rather than the raw token", () => {
  const token = createAuthToken(60_000);
  assert.equal(token.rawToken.length, 64);
  assert.equal(token.digest, digestAuthToken(token.rawToken));
  assert.notEqual(token.digest, token.rawToken);
  assert.ok(token.expires.getTime() > Date.now());
});

test("local authentication URLs have the correct origin and no duplicate slash", () => {
  const previous = {
    publicUrl: process.env.NEXT_PUBLIC_APP_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    authUrl: process.env.AUTH_URL,
  };
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";
  process.env.NEXTAUTH_URL = "http://wrong.example";
  delete process.env.AUTH_URL;
  try {
    assert.equal(getAppUrl(), "http://localhost:3000");
    assert.equal(appUrl("/reset-password?token=test"), "http://localhost:3000/reset-password?token=test");
  } finally {
    if (previous.publicUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous.publicUrl;
    if (previous.nextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = previous.nextAuthUrl;
    if (previous.authUrl === undefined) delete process.env.AUTH_URL;
    else process.env.AUTH_URL = previous.authUrl;
  }
});
