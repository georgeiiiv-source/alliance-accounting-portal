import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { notifyMessageRecipients } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { encryptSensitiveText } from "@/lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const thread = await prisma.messageThread.findUnique({ where: { id } });
  if (!thread || (!isStaff(session) && thread.clientId !== session.user.id)) return jsonError("Not found", 404);
  const parsed = z.object({ body: z.string().trim().min(1).max(10000) }).safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid message");
  const message = await prisma.$transaction(async tx => {
    const created = await tx.message.create({ data: { threadId: id, senderId: session.user.id, bodyEncrypted: encryptSensitiveText(parsed.data.body) } });
    await tx.messageThread.update({ where: { id }, data: { status: session.user.role === "CLIENT" ? "OPEN" : "PENDING", updatedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: session.user.id, clientId: thread.clientId, action: "MESSAGE_SENT", entityType: "Message", entityId: created.id } });
    return created;
  });
  await notifyMessageRecipients({ actorId: session.user.id, clientId: thread.clientId, subject: thread.subject, senderRole: session.user.role });
  return NextResponse.json({ id: message.id, createdAt: message.createdAt }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  if (!isStaff(session)) return jsonError("Forbidden", 403);
  const { id } = await params;
  const parsed = z.object({ status: z.enum(["OPEN", "PENDING", "RESOLVED"]) }).safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid status");
  const thread = await prisma.messageThread.update({ where: { id }, data: { status: parsed.data.status }, select: { id: true, clientId: true, subject: true, status: true, createdAt: true, updatedAt: true } }).catch(() => null);
  return thread ? NextResponse.json(thread) : jsonError("Not found", 404);
}
