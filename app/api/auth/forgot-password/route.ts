import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notificationEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json());
  const response = NextResponse.json({ message: "If that account exists, a reset link has been sent." });
  if (!parsed.success) return response;
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) return response;
  await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${user.id}` } });
  const rawToken = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({ data: { identifier: `reset:${user.id}`, token: createHash("sha256").update(rawToken).digest("hex"), expires: new Date(Date.now() + 60 * 60 * 1000) } });
  const href = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${rawToken}`;
  const delivery = await sendEmail(user.email, "Reset your Alliance Accounting password", notificationEmail("Reset your password", "A password reset was requested for your secure portal account. This link expires in one hour.", href, "Reset password"));
  await prisma.auditLog.create({ data: { actorId: user.id, clientId: user.id, action: "AUTH_PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id, metadata: { emailDelivered: delivery.delivered } } });
  return response;
}
