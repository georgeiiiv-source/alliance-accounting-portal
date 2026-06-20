import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { notifyMessageRecipients } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveText, encryptSensitiveText } from "@/lib/security";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  const clientId = isStaff(session) ? new URL(request.url).searchParams.get("clientId") : session.user.id;
  if (!clientId) return jsonError("clientId required");
  await prisma.message.updateMany({ where: { thread: { clientId }, senderId: { not: session.user.id }, readAt: null }, data: { readAt: new Date() } });
  const threads = await prisma.messageThread.findMany({ where: { clientId }, include: { messages: { include: { sender: { select: { name: true } } }, orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(threads.map(thread => ({ ...thread, messages: thread.messages.map(message => ({ id: message.id, senderId: message.senderId, senderName: message.sender.name ?? "Alliance team", body: decryptSensitiveText(message.bodyEncrypted), readAt: message.readAt, createdAt: message.createdAt })) })));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  const parsed = z.object({ subject: z.string().trim().min(2).max(160), body: z.string().trim().min(1).max(10000), clientId: z.string().optional() }).safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid message");
  const clientId = isStaff(session) ? parsed.data.clientId : session.user.id;
  if (!clientId) return jsonError("clientId required");
  if (isStaff(session) && !(await prisma.user.findFirst({ where: { id: clientId, role: "CLIENT" }, select: { id: true } }))) return jsonError("Client not found", 404);
  const thread = await prisma.$transaction(async tx => {
    const created = await tx.messageThread.create({ data: { clientId, subject: parsed.data.subject, messages: { create: { senderId: session.user.id, bodyEncrypted: encryptSensitiveText(parsed.data.body) } } } });
    await tx.auditLog.create({ data: { actorId: session.user.id, clientId, action: "MESSAGE_THREAD_CREATED", entityType: "MessageThread", entityId: created.id } });
    return created;
  });
  await notifyMessageRecipients({ actorId: session.user.id, clientId, subject: thread.subject, senderRole: session.user.role });
  return NextResponse.json(thread, { status: 201 });
}
