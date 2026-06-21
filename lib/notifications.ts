import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";
import { notificationEmail, sendEmail } from "@/lib/email";

async function recordDelivery(actorId: string, clientId: string, recipient: string, event: string, delivered: boolean, reason?: string) {
  await prisma.auditLog.create({ data: { actorId, clientId, action: delivered ? "EMAIL_NOTIFICATION_SENT" : "EMAIL_NOTIFICATION_SKIPPED", entityType: "Email", metadata: { recipient, event, reason } } });
}

export async function notifyMessageRecipients(input: { actorId: string; clientId: string; subject: string; senderRole: "CLIENT"|"STAFF"|"ADMIN" }) {
  const client = await prisma.user.findUnique({ where: { id: input.clientId }, include: { profile: { include: { assignedStaff: true } } } });
  if (!client) return;
  const recipients = input.senderRole === "CLIENT"
    ? client.profile?.assignedStaff ? [client.profile.assignedStaff] : await prisma.user.findMany({ where: { role: { in: ["STAFF", "ADMIN"] } }, take: 10 })
    : [client];
  await Promise.all(recipients.filter(r => r.id !== input.actorId).map(async recipient => {
    const result = await sendEmail(recipient.email, `Secure message: ${input.subject}`, notificationEmail("You have a secure message", "A new message is waiting in your Alliance Accounting portal.", `${getAppUrl()}${recipient.role === "CLIENT" ? "/portal/messages" : "/admin"}`, "View secure message"));
    await recordDelivery(input.actorId, input.clientId, recipient.email, "MESSAGE", result.delivered, result.reason);
  }));
}

export async function notifyDocumentUploaded(actorId: string, clientId: string, displayName: string) {
  const client = await prisma.user.findUnique({ where: { id: clientId }, include: { profile: { include: { assignedStaff: true } } } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, take: 10 });
  const staff = client?.profile?.assignedStaff ? [client.profile.assignedStaff] : await prisma.user.findMany({ where: { role: "STAFF" }, take: 10 });
  const recipients = [...new Map([...admins, ...staff].map(recipient => [recipient.id, recipient])).values()];
  await Promise.all(recipients.map(async recipient => {
    const result = await sendEmail(recipient.email, "Client document uploaded", notificationEmail("A document was uploaded", `${client?.name ?? "A client"} uploaded ${displayName}. The file remains quarantined until scanning completes.`, `${getAppUrl()}/admin/documents`, "Review client documents"));
    await recordDelivery(actorId, clientId, recipient.email, "DOCUMENT_UPLOAD", result.delivered, result.reason);
  }));
}

export async function notifyDocumentScanResult(clientId: string, displayName: string, safe: boolean) {
  const client = await prisma.user.findUnique({ where: { id: clientId } });
  if (!client) return;
  const result = await sendEmail(client.email, safe ? "Document received securely" : "Action required for document upload", notificationEmail(safe ? "Your document is ready" : "Your document needs attention", safe ? `${displayName} passed security scanning and is available to your Alliance team.` : `${displayName} could not be accepted. Please contact your Alliance team and upload a clean copy.`, `${getAppUrl()}/portal/documents`, "View documents"));
  await recordDelivery(clientId, clientId, client.email, "DOCUMENT_SCAN", result.delivered, result.reason);
}

export async function notifyInvoiceEvent(input: { actorId: string; clientId: string; invoiceNumber: string; event: "CREATED"|"PAID"|"OVERDUE"|"REFUNDED" }) {
  const client = await prisma.user.findUnique({ where: { id: input.clientId } });
  if (!client) return;
  const copy = {
    CREATED: ["New invoice available", `Invoice ${input.invoiceNumber} is ready in your secure portal.`],
    PAID: ["Invoice payment received", `Payment for invoice ${input.invoiceNumber} was recorded successfully.`],
    OVERDUE: ["Invoice payment reminder", `Invoice ${input.invoiceNumber} is marked overdue. Please review it in your secure portal.`],
    REFUNDED: ["Invoice refund recorded", `Invoice ${input.invoiceNumber} is marked refunded in your secure portal.`]
  } as const;
  const [subject, message] = copy[input.event];
  const result = await sendEmail(client.email, subject, notificationEmail(subject, message, `${getAppUrl()}/portal/invoices`, "View invoices"));
  await recordDelivery(input.actorId, input.clientId, client.email, `INVOICE_${input.event}`, result.delivered, result.reason);
}

export async function notifyTaxStatusUpdated(actorId: string, clientId: string, status: string) {
  const client = await prisma.user.findUnique({ where: { id: clientId } });
  if (!client) return;
  const label = status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, value => value.toUpperCase());
  const result = await sendEmail(client.email, "Tax return status updated", notificationEmail("Tax return status updated", `Your current preparation status is now ${label}.`, `${getAppUrl()}/portal/tax-status`, "Check tax return status"));
  await recordDelivery(actorId, clientId, client.email, "TAX_STATUS_UPDATED", result.delivered, result.reason);
}
