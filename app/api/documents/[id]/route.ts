import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_REVIEW_ACTIONS } from "@/lib/document-workflow";
import { notifyDocumentReviewUpdated } from "@/lib/notifications";

const reviewInput = z.object({
  status: z.enum(DOCUMENT_REVIEW_ACTIONS),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isStaff(session)) return jsonError("Unauthorized", 401);
  const parsed = reviewInput.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid document review update");
  const { id } = await params;
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return jsonError("Document not found", 404);
  if (existing.scanStatus !== "CLEAN") return jsonError("Document review is locked until security scanning completes", 409);

  const document = await prisma.$transaction(async tx => {
    const updated = await tx.document.update({
      where: { id },
      data: {
        reviewStatus: parsed.data.status,
        reviewNote: parsed.data.note || null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        clientId: existing.clientId,
        action: "DOCUMENT_REVIEW_STATUS_UPDATED",
        entityType: "Document",
        entityId: id,
        metadata: { from: existing.reviewStatus, to: parsed.data.status, note: parsed.data.note || undefined },
      },
    });
    return updated;
  });
  await notifyDocumentReviewUpdated(session.user.id, document.clientId, document.displayName, document.reviewStatus);
  return NextResponse.json({ ...document, byteSize: document.byteSize.toString() });
}
