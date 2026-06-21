import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { jsonError } from "@/lib/api";
import { createAuthToken, hashPassword, normalizeEmail, passwordSchema } from "@/lib/auth-security";
import { emailFailureMessage, notificationEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const input = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email(), password: passwordSchema });
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid registration details");
  const email = normalizeEmail(parsed.data.email);
  if (await prisma.user.findUnique({ where: { email } })) return jsonError("Account already exists", 409);
  const { rawToken, digest, expires } = createAuthToken(24 * 60 * 60 * 1000);
  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({ data: { name: parsed.data.name, email, passwordHash: await hashPassword(parsed.data.password), role: "CLIENT", profile: { create: { fullName: parsed.data.name } } } });
    await tx.verificationToken.create({ data: { identifier: `verify:${created.id}`, token: digest, expires } });
    await tx.auditLog.create({ data: { actorId: created.id, clientId: created.id, action: "AUTH_REGISTER", entityType: "User", entityId: created.id } });
    return created;
  });
  const href = appUrl(`/api/auth/verify-email?token=${rawToken}`);
  const delivery = await sendEmail(email, "Verify your Alliance Accounting account", notificationEmail("Verify your email", "Confirm your email address to activate your secure client portal. This link expires in 24 hours.", href, "Verify email"));
  await prisma.auditLog.create({ data: { actorId: user.id, clientId: user.id, action: delivery.delivered ? "EMAIL_VERIFICATION_SENT" : "EMAIL_NOTIFICATION_SKIPPED", entityType: "Email", metadata: { emailId: delivery.id, code: delivery.code, status: delivery.status, reason: delivery.reason, verificationUrlOrigin: new URL(href).origin } } });
  const localPreview = process.env.NODE_ENV !== "production" && process.env.LOCAL_EMAIL_PREVIEW === "true" ? href : undefined;
  return NextResponse.json({ id: user.id, verificationRequired: true, emailDelivered: delivery.delivered, emailError: delivery.delivered ? undefined : emailFailureMessage(delivery), verificationUrl: localPreview }, { status: 201 });
}
