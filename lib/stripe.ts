import { createHmac, timingSafeEqual } from "node:crypto";

type CheckoutInput = { invoiceId: string; number: string; description: string; amountCents: number; currency: string; clientEmail: string };

export async function createStripeCheckout(input: CheckoutInput) {
  const key = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!key || !baseUrl) throw new Error("Stripe checkout is not configured");
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${baseUrl}/portal/invoices?payment=success`,
    cancel_url: `${baseUrl}/portal/invoices?payment=cancelled`,
    client_reference_id: input.invoiceId,
    customer_email: input.clientEmail,
    "metadata[invoiceId]": input.invoiceId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": `Invoice ${input.number}`,
    "line_items[0][price_data][product_data][description]": input.description.slice(0, 500)
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" }, body });
  const result = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !result.id || !result.url) throw new Error(result.error?.message ?? "Stripe could not create a checkout session");
  return { id: result.id, url: result.url };
}

export function verifyStripeSignature(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const parts = signature.split(",").map(x => x.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  return signatures.some(value => { const actual = Buffer.from(value ?? ""); return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer); });
}
