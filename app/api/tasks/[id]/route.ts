import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!session?.user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const task = await prisma.clientTask.findUnique({ where: { id } }); if (!task || (!isStaff(session) && task.clientId !== session.user.id)) return jsonError("Not found", 404);
  const parsed = z.object({ completed: z.boolean(), title: z.string().min(2).max(200).optional(), dueAt: z.string().datetime().nullable().optional() }).safeParse(await request.json()); if (!parsed.success) return jsonError("Invalid task update");
  if (!isStaff(session) && (parsed.data.title !== undefined || parsed.data.dueAt !== undefined)) return jsonError("Forbidden", 403);
  const updated = await prisma.clientTask.update({ where: { id }, data: { completedAt: parsed.data.completed ? new Date() : null, title: parsed.data.title, dueAt: parsed.data.dueAt === undefined ? undefined : parsed.data.dueAt ? new Date(parsed.data.dueAt) : null } });
  await audit({ actorId: session.user.id, clientId: task.clientId, action: parsed.data.completed ? "CLIENT_TASK_COMPLETED" : "CLIENT_TASK_REOPENED", entityType: "ClientTask", entityId: task.id });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!isStaff(session)) return jsonError("Forbidden", 403);
  const { id } = await params; const task = await prisma.clientTask.findUnique({ where: { id } }); if (!task) return jsonError("Not found", 404);
  await prisma.clientTask.delete({ where: { id } });
  await audit({ actorId: session!.user.id, clientId: task.clientId, action: "CLIENT_TASK_DELETED", entityType: "ClientTask", entityId: id });
  return new Response(null, { status: 204 });
}
