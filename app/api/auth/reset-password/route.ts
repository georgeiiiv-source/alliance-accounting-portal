import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { digestAuthToken, hashPassword, passwordSchema } from "@/lib/auth-security";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const parsed = z.object({ token: z.string().min(32), password: passwordSchema }).safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid reset request");

  const record = await prisma.verificationToken.findFirst({
    where: { token: digestAuthToken(parsed.data.token), identifier: { startsWith: "reset:" }, expires: { gt: new Date() } },
  });
  if (!record) return jsonError("Reset link is invalid or expired", 410);

  const userId = record.identifier.slice(6);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return jsonError("Reset link is invalid or expired", 410);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    prisma.verificationToken.delete({ where: { identifier_token: { identifier: record.identifier, token: record.token } } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.auditLog.create({ data: { actorId: userId, clientId: user.role === "CLIENT" ? userId : null, action: "AUTH_PASSWORD_RESET", entityType: "User", entityId: userId } }),
  ]);
  return NextResponse.json({ message: "Password updated. You can now sign in." });
}
