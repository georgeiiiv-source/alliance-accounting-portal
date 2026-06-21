import assert from "node:assert/strict";
import test from "node:test";
import { emailFailureMessage, getEmailSender, sendEmail } from "../lib/email";

test("email sender supports EMAIL_FROM and RESEND_FROM_EMAIL", () => {
  const previousEmailFrom = process.env.EMAIL_FROM;
  const previousResendFrom = process.env.RESEND_FROM_EMAIL;
  try {
    process.env.EMAIL_FROM = "Alliance <primary@example.test>";
    process.env.RESEND_FROM_EMAIL = "fallback@example.test";
    assert.equal(getEmailSender(), "Alliance <primary@example.test>");
    delete process.env.EMAIL_FROM;
    assert.equal(getEmailSender(), "fallback@example.test");
  } finally {
    if (previousEmailFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousEmailFrom;
    if (previousResendFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousResendFrom;
  }
});

test("local email sender falls back to the Resend sandbox address", () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEmailFrom = process.env.EMAIL_FROM;
  const previousResendFrom = process.env.RESEND_FROM_EMAIL;
  try {
    env.NODE_ENV = "development";
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_FROM_EMAIL;
    assert.equal(getEmailSender(), "Alliance Accounting <onboarding@resend.dev>");
  } finally {
    if (previousNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previousNodeEnv;
    if (previousEmailFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousEmailFrom;
    if (previousResendFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousResendFrom;
  }
});

test("registration receives actionable email configuration messages", () => {
  assert.match(emailFailureMessage({ delivered: false, code: "MISSING_API_KEY" }), /RESEND_API_KEY/);
  assert.match(emailFailureMessage({ delivered: false, code: "MISSING_SENDER" }), /EMAIL_FROM or RESEND_FROM_EMAIL/);
  assert.match(emailFailureMessage({ delivered: false, code: "PROVIDER_REJECTED" }), /sandbox testing/);
});

test("missing email configuration is written clearly to the server log", async () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousConsoleError = console.error;
  const entries: unknown[][] = [];
  try {
    delete process.env.RESEND_API_KEY;
    console.error = (...args: unknown[]) => { entries.push(args); };
    const result = await sendEmail("local@example.test", "Verification test", "<p>test</p>");
    assert.equal(result.code, "MISSING_API_KEY");
    assert.equal(entries.length, 1);
    assert.equal(entries[0][0], "[email] Resend delivery failed");
    assert.deepEqual(entries[0][1], {
      code: "MISSING_API_KEY",
      status: undefined,
      reason: "RESEND_API_KEY is missing",
      recipientDomain: "example.test",
      subject: "Verification test",
    });
  } finally {
    console.error = previousConsoleError;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
  }
});
