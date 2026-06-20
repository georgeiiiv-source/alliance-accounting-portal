import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!isStaff(session)) return jsonError("Forbidden", 403);
  const { id } = await params; const current = await prisma.appointmentRequest.findUnique({ where: { id } }); if (!current) return jsonError("Not found", 404);
  const parsed = z.object({ status: z.enum(["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"]), requestedStart: z.string().datetime().optional(), meetingUrl: z.string().url().max(500).nullable().optional(), assignedStaffId: z.string().nullable().optional() }).safeParse(await request.json()); if (!parsed.success) return jsonError("Invalid appointment update");
  const updated = await prisma.appointmentRequest.update({ where: { id }, data: { ...parsed.data, requestedStart: parsed.data.requestedStart ? new Date(parsed.data.requestedStart) : undefined } });
  await audit({ actorId: session!.user.id, clientId: current.clientId, action: "APPOINTMENT_UPDATED", entityType: "AppointmentRequest", entityId: id, metadata: { status: updated.status } });
  return NextResponse.json(updated);
}
