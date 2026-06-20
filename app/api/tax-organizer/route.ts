import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveText, encryptSensitiveText } from "@/lib/security";
import { NextResponse } from "next/server";
import { z } from "zod";

const answers = z.object({ filingStatus: z.string().max(80), dependents: z.string().max(500), incomeSources: z.array(z.string().max(80)).max(20), lifeChanges: z.array(z.string().max(80)).max(20), deductions: z.string().max(2000), estimatedPayments: z.string().max(1000), foreignAccounts: z.boolean(), digitalAssets: z.boolean(), notes: z.string().max(3000) });
const input = z.object({ taxYear: z.number().int().min(2000).max(2100), answers, submit: z.boolean().default(false) });

export async function GET(request: Request) {
  const session = await auth(); if (!session?.user) return jsonError("Unauthorized", 401);
  const query = new URL(request.url).searchParams;
  const clientId = isStaff(session) ? query.get("clientId") : session.user.id;
  if (!clientId) return jsonError("clientId required");
  const rows = await prisma.taxOrganizer.findMany({ where: { clientId }, orderBy: { taxYear: "desc" } });
  return NextResponse.json(rows.map(row => ({ ...row, answersEncrypted: undefined, answers: JSON.parse(decryptSensitiveText(row.answersEncrypted)) })));
}

export async function PUT(request: Request) {
  const session = await auth(); if (!session?.user || session.user.role !== "CLIENT") return jsonError("Forbidden", 403);
  const parsed = input.safeParse(await request.json()); if (!parsed.success) return jsonError("Invalid organizer answers");
  const status = parsed.data.submit ? "SUBMITTED" : "DRAFT";
  const organizer = await prisma.taxOrganizer.upsert({ where: { clientId_taxYear: { clientId: session.user.id, taxYear: parsed.data.taxYear } }, create: { clientId: session.user.id, taxYear: parsed.data.taxYear, answersEncrypted: encryptSensitiveText(JSON.stringify(parsed.data.answers)), status, submittedAt: parsed.data.submit ? new Date() : null }, update: { answersEncrypted: encryptSensitiveText(JSON.stringify(parsed.data.answers)), status, submittedAt: parsed.data.submit ? new Date() : undefined } });
  await audit({ actorId: session.user.id, clientId: session.user.id, action: parsed.data.submit ? "TAX_ORGANIZER_SUBMITTED" : "TAX_ORGANIZER_SAVED", entityType: "TaxOrganizer", entityId: organizer.id, metadata: { taxYear: organizer.taxYear } });
  return NextResponse.json({ id: organizer.id, status: organizer.status });
}

export async function PATCH(request: Request) {
  const session = await auth(); if (!isStaff(session)) return jsonError("Forbidden", 403);
  const parsed = z.object({ id: z.string(), status: z.enum(["NEEDS_UPDATE", "REVIEWED"]) }).safeParse(await request.json()); if (!parsed.success) return jsonError("Invalid review status");
  const current = await prisma.taxOrganizer.findUnique({ where: { id: parsed.data.id } }); if (!current) return jsonError("Not found", 404);
  const result = await prisma.taxOrganizer.update({ where: { id: current.id }, data: { status: parsed.data.status, reviewedById: session!.user.id, reviewedAt: parsed.data.status === "REVIEWED" ? new Date() : null } });
  await audit({ actorId: session!.user.id, clientId: current.clientId, action: "TAX_ORGANIZER_REVIEWED", entityType: "TaxOrganizer", entityId: current.id, metadata: { status: result.status } });
  return NextResponse.json(result);
}
