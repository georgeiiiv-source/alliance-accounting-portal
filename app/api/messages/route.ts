import { NextResponse } from "next/server";
import type { MessageStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { safeMessageThreadSelect, serializeMessageThread } from "@/lib/message-safe";
import { notifyMessageRecipients } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { encryptSensitiveText } from "@/lib/security";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  if (request.headers.get("accept")?.includes("text/html")) return jsonError("Use the secure Messages page to view conversations", 406);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as MessageStatus | null;
  if (status && !["OPEN", "PENDING", "RESOLVED"].includes(status)) return jsonError("Invalid status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const requestedClientId = url.searchParams.get("clientId");
  const where: Prisma.MessageThreadWhereInput = {
    clientId: isStaff(session) ? requestedClientId || undefined : session.user.id,
    status: status || undefined,
    createdAt: from || to ? { gte: from ? new Date(`${from}T00:00:00.000Z`) : undefined, lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined } : undefined,
  };
  if (!isStaff(session)) await prisma.message.updateMany({ where: { thread: { clientId: session.user.id }, senderId: { not: session.user.id }, readAt: null }, data: { readAt: new Date() } });
  const threads = await prisma.messageThread.findMany({ where, select: safeMessageThreadSelect, orderBy: { updatedAt: "desc" }, take: 500 });
  return NextResponse.json(threads.map(thread => serializeMessageThread(thread, session.user.id)));
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
    const created = await tx.messageThread.create({ data: { clientId, subject: parsed.data.subject, messages: { create: { senderId: session.user.id, bodyEncrypted: encryptSensitiveText(parsed.data.body) } } }, select: { id: true, subject: true, status: true, createdAt: true, updatedAt: true } });
    await tx.auditLog.create({ data: { actorId: session.user.id, clientId, action: "MESSAGE_THREAD_CREATED", entityType: "MessageThread", entityId: created.id } });
    return created;
  });
  await notifyMessageRecipients({ actorId: session.user.id, clientId, subject: thread.subject, senderRole: session.user.role });
  return NextResponse.json(thread, { status: 201 });
}
