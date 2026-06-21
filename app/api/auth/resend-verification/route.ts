import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { createAuthToken, normalizeEmail } from "@/lib/auth-security";
import { notificationEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json());
  const response = NextResponse.json({ message: "If an unverified account exists, a new verification link has been sent." });
  if (!parsed.success) return response;
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(parsed.data.email) } });
  if (!user || user.emailVerified) return response;
  await prisma.verificationToken.deleteMany({ where: { identifier: `verify:${user.id}` } });
  const { rawToken, digest, expires } = createAuthToken(24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({ data: { identifier: `verify:${user.id}`, token: digest, expires } });
  const href = appUrl(`/api/auth/verify-email?token=${rawToken}`);
  await sendEmail(user.email, "Verify your Alliance Accounting account", notificationEmail("Verify your email", "Confirm your email address to activate your secure client portal. This link expires in 24 hours.", href, "Verify email"));
  return response;
}
