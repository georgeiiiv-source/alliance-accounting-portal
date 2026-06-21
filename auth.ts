import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { normalizeEmail, passwordMatches, passwordSchema } from "@/lib/auth-security";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8, updateAge: 60 * 15 },
  pages: { signIn: "/login" },
  providers: [Credentials({
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      const parsed = z.object({ email: z.string().email(), password: passwordSchema }).safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: normalizeEmail(parsed.data.email) } });
      if (!user?.passwordHash || !user.emailVerified || !(await passwordMatches(parsed.data.password, user.passwordHash))) return null;
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await prisma.auditLog.create({ data: { actorId: user.id, clientId: user.role === "CLIENT" ? user.id : null, action: "AUTH_LOGIN", entityType: "User", entityId: user.id } });
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }
  })],
  callbacks: {
    jwt({ token, user }) { if (user) { token.id = user.id!; token.role = user.role; } return token; },
    session({ session, token }) { session.user.id = token.id as string; session.user.role = token.role as UserRole; return session; },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/portal")) return session?.user.role === "CLIENT";
      if (path.startsWith("/admin")) return session?.user.role === "STAFF" || session?.user.role === "ADMIN";
      return true;
    }
  }
});
