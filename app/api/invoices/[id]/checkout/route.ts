import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createStripeCheckout } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") return jsonError("Forbidden", 403);
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({ where: { id, clientId: session.user.id }, include: { client: { select: { email: true } } } });
  if (!invoice) return jsonError("Invoice not found", 404);
  if (!['UNPAID', 'OVERDUE'].includes(invoice.status)) return jsonError("This invoice is not payable", 409);
  try {
    const checkout = await createStripeCheckout({ invoiceId: invoice.id, number: invoice.number, description: invoice.description, amountCents: invoice.amountCents, currency: invoice.currency, clientEmail: invoice.client.email });
    await prisma.$transaction([
      prisma.invoice.update({ where: { id: invoice.id }, data: { stripeCheckoutSessionId: checkout.id } }),
      prisma.payment.create({ data: { invoiceId: invoice.id, checkoutSessionId: checkout.id, amountCents: invoice.amountCents, currency: invoice.currency } })
    ]);
    await audit({ actorId: session.user.id, clientId: session.user.id, action: "STRIPE_CHECKOUT_CREATED", entityType: "Invoice", entityId: invoice.id });
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to start payment", 503);
  }
}
