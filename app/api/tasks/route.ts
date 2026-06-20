import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: Request) {
  const session = await auth(); if (!session?.user) return jsonError("Unauthorized", 401);
  const clientId = isStaff(session) ? new URL(request.url).searchParams.get("clientId") : session.user.id;
  if (!clientId) return jsonError("clientId required");
  return NextResponse.json(await prisma.clientTask.findMany({ where: { clientId }, orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }] }));
}

export async function POST(request: Request) {
  const session = await auth(); if (!isStaff(session)) return jsonError("Forbidden", 403);
  const parsed = z.object({ clientId: z.string(), title: z.string().min(2).max(200), dueAt: z.string().datetime().nullable().optional() }).safeParse(await request.json()); if (!parsed.success) return jsonError("Invalid task");
  const client = await prisma.user.findFirst({ where: { id: parsed.data.clientId, role: "CLIENT" } }); if (!client) return jsonError("Client not found", 404);
  const task = await prisma.clientTask.create({ data: { clientId: client.id, title: parsed.data.title, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null, createdById: session!.user.id } });
  await audit({ actorId: session!.user.id, clientId: client.id, action: "CLIENT_TASK_CREATED", entityType: "ClientTask", entityId: task.id });
  return NextResponse.json(task, { status: 201 });
}
