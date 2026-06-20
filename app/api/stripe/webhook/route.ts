import { prisma } from "@/lib/prisma";
import { verifyStripeSignature } from "@/lib/stripe";
import { Prisma } from "@prisma/client";

type StripeEvent = { id: string; type: string; data: { object: { id: string; client_reference_id?: string | null; metadata?: { invoiceId?: string }; payment_intent?: string | null; amount_total?: number | null; currency?: string | null; payment_status?: string } } };

export async function POST(request: Request) {
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) return new Response("Invalid signature", { status: 400 });
  let event: StripeEvent;
  try { event = JSON.parse(payload) as StripeEvent; } catch { return new Response("Invalid payload", { status: 400 }); }
  if (!event.id || !event.type) return new Response("Invalid event", { status: 400 });
  const object = event.data.object;
  const invoiceId = object.metadata?.invoiceId ?? object.client_reference_id;
  try {
    await prisma.$transaction(async tx => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
      if (event.type === "checkout.session.completed" && invoiceId && object.payment_status === "paid") {
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice || (object.amount_total != null && object.amount_total !== invoice.amountCents) || (object.currency && object.currency.toUpperCase() !== invoice.currency.toUpperCase())) throw new Error("Payment does not match invoice");
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: object.payment_intent ?? undefined, stripeCheckoutSessionId: object.id } });
        await tx.payment.upsert({ where: { checkoutSessionId: object.id }, create: { invoiceId: invoice.id, checkoutSessionId: object.id, providerPaymentId: object.payment_intent ?? null, amountCents: invoice.amountCents, currency: invoice.currency, status: "SUCCEEDED" }, update: { providerPaymentId: object.payment_intent ?? undefined, status: "SUCCEEDED" } });
        await tx.auditLog.create({ data: { clientId: invoice.clientId, action: "INVOICE_PAID", entityType: "Invoice", entityId: invoice.id, metadata: { provider: "STRIPE", eventId: event.id } } });
      }
      if (event.type === "checkout.session.expired") await tx.payment.updateMany({ where: { checkoutSessionId: object.id, status: "PENDING" }, data: { status: "FAILED" } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return new Response("Already processed");
    return new Response(error instanceof Error ? error.message : "Webhook processing failed", { status: 500 });
  }
  return new Response("OK");
}
