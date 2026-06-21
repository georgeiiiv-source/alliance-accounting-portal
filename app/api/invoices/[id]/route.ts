import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { notifyInvoiceEvent } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isStaff(session)) return jsonError("Forbidden", 403);
  const { id } = await params;
  const parsed = z.object({ status: z.enum(["UNPAID", "PAID", "OVERDUE", "REFUNDED"]), stripePaymentIntentId: z.string().optional() }).safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid status");
  const current = await prisma.invoice.findUnique({ where: { id } });
  if (!current) return jsonError("Not found", 404);
  const invoice = await prisma.invoice.update({ where: { id }, data: { ...parsed.data, paidAt: parsed.data.status === "PAID" ? new Date() : undefined } });
  await prisma.auditLog.create({ data: { actorId: session!.user.id, clientId: invoice.clientId, action: "INVOICE_STATUS_UPDATED", entityType: "Invoice", entityId: invoice.id, metadata: { status: invoice.status } } });
  if (current.status !== invoice.status && ["PAID", "OVERDUE", "REFUNDED"].includes(invoice.status)) {
    await notifyInvoiceEvent({ actorId: session!.user.id, clientId: invoice.clientId, invoiceNumber: invoice.number, event: invoice.status as "PAID"|"OVERDUE"|"REFUNDED" });
  }
  return NextResponse.json(invoice);
}
