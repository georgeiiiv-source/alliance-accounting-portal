import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { notificationEmail, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const loginUrl = new URL("/login", request.url);
  if (!token) { loginUrl.searchParams.set("error", "invalid-token"); return NextResponse.redirect(loginUrl); }
  const digest = createHash("sha256").update(token).digest("hex");
  const record = await prisma.verificationToken.findFirst({ where: { token: digest, identifier: { startsWith: "verify:" }, expires: { gt: new Date() } } });
  if (!record) { loginUrl.searchParams.set("error", "expired-token"); return NextResponse.redirect(loginUrl); }
  const userId = record.identifier.slice(7);
  const user = await prisma.$transaction(async tx => {
    const updated = await tx.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
    await tx.verificationToken.delete({ where: { identifier_token: { identifier: record.identifier, token: record.token } } });
    await tx.auditLog.create({ data: { actorId: userId, clientId: userId, action: "AUTH_EMAIL_VERIFIED", entityType: "User", entityId: userId } });
    return updated;
  });
  await sendEmail(user.email, "Your Alliance Accounting account is ready", notificationEmail("Email verified", "Your secure client portal is ready. You can now sign in.", `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`, "Sign in"));
  loginUrl.searchParams.set("verified", "1");
  return NextResponse.redirect(loginUrl);
}
