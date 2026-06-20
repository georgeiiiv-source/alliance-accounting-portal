import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { notifyDocumentScanResult } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { safeSecretEqual } from "@/lib/security";

const payload = z.object({ storageKey: z.string().min(1), status: z.enum(["CLEAN", "QUARANTINED", "REJECTED"]), scannerReference: z.string().max(200).optional() });
export async function POST(request: Request) {
  if (!safeSecretEqual(request.headers.get("x-scan-webhook-secret"), process.env.DOCUMENT_SCAN_WEBHOOK_SECRET)) return jsonError("Unauthorized", 401);
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid scan result");
  const existing = await prisma.document.findUnique({ where: { storageKey: parsed.data.storageKey } });
  if (!existing) return jsonError("Document not found", 404);
  const document = await prisma.$transaction(async tx => {
    const updated = await tx.document.update({ where: { id: existing.id }, data: { scanStatus: parsed.data.status } });
    await tx.auditLog.create({ data: { clientId: existing.clientId, action: "DOCUMENT_SCAN_RESULT", entityType: "Document", entityId: existing.id, metadata: { status: parsed.data.status, scannerReference: parsed.data.scannerReference } } });
    return updated;
  });
  await notifyDocumentScanResult(document.clientId, document.displayName, document.scanStatus === "CLEAN");
  return NextResponse.json({ id: document.id, status: document.scanStatus });
}
