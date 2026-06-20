import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { notificationEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const input = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email(), password: z.string().min(12).max(128) });
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid registration details");
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return jsonError("Account already exists", 409);
  const rawToken = randomBytes(32).toString("hex");
  const token = createHash("sha256").update(rawToken).digest("hex");
  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({ data: { name: parsed.data.name, email, passwordHash: await hash(parsed.data.password, 12), role: "CLIENT", profile: { create: { fullName: parsed.data.name } } } });
    await tx.verificationToken.create({ data: { identifier: `verify:${created.id}`, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await tx.auditLog.create({ data: { actorId: created.id, clientId: created.id, action: "AUTH_REGISTER", entityType: "User", entityId: created.id } });
    return created;
  });
  const href = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/verify-email?token=${rawToken}`;
  const delivery = await sendEmail(email, "Verify your Alliance Accounting account", notificationEmail("Verify your email", "Confirm your email address to activate your secure client portal. This link expires in 24 hours.", href, "Verify email"));
  await prisma.auditLog.create({ data: { actorId: user.id, clientId: user.id, action: delivery.delivered ? "EMAIL_VERIFICATION_SENT" : "EMAIL_NOTIFICATION_SKIPPED", entityType: "Email", metadata: { reason: delivery.reason } } });
  return NextResponse.json({ id: user.id, verificationRequired: true, emailDelivered: delivery.delivered }, { status: 201 });
}
