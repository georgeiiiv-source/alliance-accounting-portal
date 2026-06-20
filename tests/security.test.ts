import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";
import { decryptSensitiveText, encryptSensitiveText } from "../lib/security";
import { verifyStripeSignature } from "../lib/stripe";

test("sensitive text uses authenticated encryption and round trips", () => {
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const plaintext = "Confidential organizer answer";
  const encrypted = encryptSensitiveText(plaintext);
  assert.notEqual(encrypted.toString("utf8"), plaintext);
  assert.equal(decryptSensitiveText(encrypted), plaintext);
});

test("Stripe webhook signature accepts the matching current payload", () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
  assert.equal(verifyStripeSignature(payload, `t=${timestamp},v1=${digest}`), true);
  assert.equal(verifyStripeSignature(`${payload}tampered`, `t=${timestamp},v1=${digest}`), false);
});

test("Stripe webhook signature rejects stale requests", () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  const payload = "{}";
  const timestamp = Math.floor(Date.now() / 1000) - 301;
  const digest = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
  assert.equal(verifyStripeSignature(payload, `t=${timestamp},v1=${digest}`), false);
});
