import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { encryptSensitiveText } from "@/lib/security";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: Request) {
  const session = await auth(); if (!session?.user) return jsonError("Unauthorized", 401);
  const clientId = isStaff(session) ? new URL(request.url).searchParams.get("clientId") ?? undefined : session.user.id;
  return NextResponse.json(await prisma.appointmentRequest.findMany({ where: { clientId }, include: { client: { select: { name: true, email: true } }, assignedStaff: { select: { name: true } } }, orderBy: { requestedStart: "asc" }, take: 100 }));
}

export async function POST(request: Request) {
  const session = await auth(); if (!session?.user || session.user.role !== "CLIENT") return jsonError("Forbidden", 403);
  const parsed = z.object({ requestedStart: z.string().datetime(), alternateStart: z.string().datetime().nullable().optional(), timeZone: z.string().min(2).max(100), durationMinutes: z.number().int().min(15).max(120), mode: z.enum(["PHONE", "VIDEO", "IN_PERSON"]), topic: z.string().min(2).max(200), notes: z.string().max(3000).optional() }).safeParse(await request.json()); if (!parsed.success) return jsonError("Invalid appointment request");
  if (new Date(parsed.data.requestedStart) <= new Date()) return jsonError("Choose a future appointment time");
  const appointment = await prisma.appointmentRequest.create({ data: { clientId: session.user.id, requestedStart: new Date(parsed.data.requestedStart), alternateStart: parsed.data.alternateStart ? new Date(parsed.data.alternateStart) : null, timeZone: parsed.data.timeZone, durationMinutes: parsed.data.durationMinutes, mode: parsed.data.mode, topic: parsed.data.topic, notesEncrypted: parsed.data.notes ? encryptSensitiveText(parsed.data.notes) : null } });
  await audit({ actorId: session.user.id, clientId: session.user.id, action: "APPOINTMENT_REQUESTED", entityType: "AppointmentRequest", entityId: appointment.id });
  return NextResponse.json(appointment, { status: 201 });
}
