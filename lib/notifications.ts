import { prisma } from "@/lib/prisma";
import { notificationEmail, sendEmail } from "@/lib/email";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
    const result = await sendEmail(recipient.email, `Secure message: ${input.subject}`, notificationEmail("You have a secure message", "A new message is waiting in your Alliance Accounting portal.", `${appUrl()}${recipient.role === "CLIENT" ? "/portal/messages" : "/admin"}`, "View secure message"));
    await recordDelivery(input.actorId, input.clientId, recipient.email, "MESSAGE", result.delivered, result.reason);
  }));
}

export async function notifyDocumentUploaded(actorId: string, clientId: string, displayName: string) {
  const client = await prisma.user.findUnique({ where: { id: clientId }, include: { profile: { include: { assignedStaff: true } } } });
  const recipients = client?.profile?.assignedStaff ? [client.profile.assignedStaff] : await prisma.user.findMany({ where: { role: { in: ["STAFF", "ADMIN"] } }, take: 10 });
  await Promise.all(recipients.map(async recipient => {
    const result = await sendEmail(recipient.email, "Client document uploaded", notificationEmail("A document was uploaded", `${client?.name ?? "A client"} uploaded ${displayName}. The file remains quarantined until scanning completes.`, `${appUrl()}/admin`, "Open admin dashboard"));
    await recordDelivery(actorId, clientId, recipient.email, "DOCUMENT_UPLOAD", result.delivered, result.reason);
  }));
}

export async function notifyDocumentScanResult(clientId: string, displayName: string, safe: boolean) {
  const client = await prisma.user.findUnique({ where: { id: clientId } });
  if (!client) return;
  const result = await sendEmail(client.email, safe ? "Document received securely" : "Action required for document upload", notificationEmail(safe ? "Your document is ready" : "Your document needs attention", safe ? `${displayName} passed security scanning and is available to your Alliance team.` : `${displayName} could not be accepted. Please contact your Alliance team and upload a clean copy.`, `${appUrl()}/portal/documents`, "View documents"));
  await recordDelivery(clientId, clientId, client.email, "DOCUMENT_SCAN", result.delivered, result.reason);
}
