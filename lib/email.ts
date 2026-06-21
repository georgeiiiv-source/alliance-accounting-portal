import { escapeHtml } from "@/lib/security";

export type EmailErrorCode = "MISSING_API_KEY" | "MISSING_SENDER" | "REQUEST_FAILED" | "PROVIDER_REJECTED";
export type EmailResult = { delivered: boolean; id?: string; reason?: string; code?: EmailErrorCode; status?: number };

const LOCAL_RESEND_SENDER = "Alliance Accounting <onboarding@resend.dev>";

export function getEmailSender() {
  const configured = process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return LOCAL_RESEND_SENDER;
  return undefined;
}

function logEmailFailure(input: { code: EmailErrorCode; reason: string; status?: number; to: string; subject: string }) {
  const recipientDomain = input.to.includes("@") ? input.to.split("@").pop() : "invalid";
  console.error("[email] Resend delivery failed", {
    code: input.code,
    status: input.status,
    reason: input.reason,
    recipientDomain,
    subject: input.subject,
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = getEmailSender();
  if (!apiKey) {
    const result = { delivered: false, code: "MISSING_API_KEY" as const, reason: "RESEND_API_KEY is missing" };
    logEmailFailure({ ...result, to, subject });
    return result;
  }
  if (!sender) {
    const result = { delivered: false, code: "MISSING_SENDER" as const, reason: "EMAIL_FROM or RESEND_FROM_EMAIL is missing" };
    logEmailFailure({ ...result, to, subject });
    return result;
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: sender, to: [to], subject, html }),
    });
  } catch (error) {
    const result = { delivered: false, code: "REQUEST_FAILED" as const, reason: error instanceof Error ? error.message : "Resend request failed" };
    logEmailFailure({ ...result, to, subject });
    return result;
  }

  const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) {
    const result = { delivered: false, code: "PROVIDER_REJECTED" as const, status: response.status, reason: body.message ?? `Resend returned ${response.status}` };
    logEmailFailure({ ...result, to, subject });
    return result;
  }
  return { delivered: true, id: body.id };
}

export function emailFailureMessage(result: EmailResult) {
  if (result.code === "MISSING_API_KEY") return "Email service is missing RESEND_API_KEY. Check the server environment.";
  if (result.code === "MISSING_SENDER") return "Email sender is missing. Set EMAIL_FROM or RESEND_FROM_EMAIL.";
  if (result.code === "PROVIDER_REJECTED") return "Resend rejected the verification email. For sandbox testing, register with the Resend account owner's email address.";
  return "The account was created, but the verification email could not be sent. Check the server log for the Resend error.";
}

export function notificationEmail(title: string, message: string, href: string, action: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17352a"><h1 style="color:#123d2d">${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a style="background:#123d2d;color:white;padding:12px 18px;text-decoration:none" href="${escapeHtml(href)}">${escapeHtml(action)}</a></p><p style="color:#63766d;font-size:12px">For your security, sensitive financial details are never included in email.</p></div>`;
}
