import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { notifyTaxStatusUpdated } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { TaxReturnStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  const clientId = isStaff(session) ? new URL(request.url).searchParams.get("clientId") : session.user.id;
  if (!clientId) return jsonError("clientId required");
  return NextResponse.json(await prisma.taxReturn.findMany({ where: { clientId }, include: { events: true }, orderBy: { taxYear: "desc" } }));
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!isStaff(session)) return jsonError("Forbidden", 403);
  const parsed = z.object({ taxReturnId: z.string(), status: z.nativeEnum(TaxReturnStatus), note: z.string().max(1000).optional() }).safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid tax status");
  const current = await prisma.taxReturn.findUnique({ where: { id: parsed.data.taxReturnId } });
  if (!current) return jsonError("Not found", 404);
  const result = await prisma.$transaction([
    prisma.taxReturn.update({ where: { id: current.id }, data: { status: parsed.data.status, statusUpdatedAt: new Date() } }),
    prisma.taxStatusEvent.create({ data: { taxReturnId: current.id, status: parsed.data.status, note: parsed.data.note, createdById: session!.user.id } }),
    prisma.auditLog.create({ data: { actorId: session!.user.id, clientId: current.clientId, action: "TAX_STATUS_UPDATED", entityType: "TaxReturn", entityId: current.id, metadata: { status: parsed.data.status } } })
  ]);
  if (current.status !== parsed.data.status) await notifyTaxStatusUpdated(session!.user.id, current.clientId, parsed.data.status);
  return NextResponse.json(result[0]);
}
