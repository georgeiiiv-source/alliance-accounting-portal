import { escapeHtml } from "@/lib/security";

export type EmailResult = { delivered: boolean; id?: string; reason?: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return { delivered: false, reason: "Resend is not configured" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html })
  });
  const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) return { delivered: false, reason: body.message ?? `Resend returned ${response.status}` };
  return { delivered: true, id: body.id };
}

export function notificationEmail(title: string, message: string, href: string, action: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17352a"><h1 style="color:#123d2d">${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a style="background:#123d2d;color:white;padding:12px 18px;text-decoration:none" href="${escapeHtml(href)}">${escapeHtml(action)}</a></p><p style="color:#63766d;font-size:12px">For your security, sensitive financial details are never included in email.</p></div>`;
}
