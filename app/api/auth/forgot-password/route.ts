import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { createAuthToken, normalizeEmail } from "@/lib/auth-security";
import { notificationEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json());
  const response = NextResponse.json({ message: "If that account exists, a reset link has been sent." });
  if (!parsed.success) return response;
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(parsed.data.email) } });
  if (!user) return response;
  await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${user.id}` } });
  const { rawToken, digest, expires } = createAuthToken(60 * 60 * 1000);
  await prisma.verificationToken.create({ data: { identifier: `reset:${user.id}`, token: digest, expires } });
  const href = appUrl(`/reset-password?token=${rawToken}`);
  const delivery = await sendEmail(user.email, "Reset your Alliance Accounting password", notificationEmail("Reset your password", "A password reset was requested for your secure portal account. This link expires in one hour.", href, "Reset password"));
  await prisma.auditLog.create({ data: { actorId: user.id, clientId: user.role === "CLIENT" ? user.id : null, action: "AUTH_PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id, metadata: { emailDelivered: delivery.delivered, emailId: delivery.id, reason: delivery.reason, resetUrlOrigin: new URL(href).origin } } });
  return response;
}
