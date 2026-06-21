import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { notifyDocumentScanResult } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") return jsonError("Not found", 404);
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);
  const { id } = await params;
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return jsonError("Document not found", 404);

  const document = await prisma.$transaction(async tx => {
    const updated = await tx.document.update({ where: { id }, data: { scanStatus: "CLEAN" } });
    await tx.auditLog.create({ data: { actorId: session.user.id, clientId: existing.clientId, action: "DOCUMENT_SCAN_OVERRIDE_LOCAL", entityType: "Document", entityId: id, metadata: { from: existing.scanStatus, to: "CLEAN", localTestingOnly: true } } });
    return updated;
  });
  await notifyDocumentScanResult(document.clientId, document.displayName, true, session.user.id);
  return NextResponse.json({ id: document.id, scanStatus: document.scanStatus });
}
