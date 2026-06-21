import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { safeClientDetailSelect, serializeSafeClientDetail } from "@/lib/client-safe";
import { prisma } from "@/lib/prisma";

const input = z.object({ fullName: z.string().min(2).optional(), phone: z.string().max(30).optional(), taxYear: z.number().int().min(2000).max(2100).optional(), filingType: z.string().max(60).optional(), assignedStaffId: z.string().nullable().optional() });

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: jsonError("Unauthorized", 401) };
  if (session.user.role !== "ADMIN") return { error: jsonError("Forbidden", 403) };
  return { session };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  const { id } = await params;
  const client = await prisma.user.findFirst({ where: { id, role: "CLIENT" }, select: safeClientDetailSelect });
  if (!client) return jsonError("Not found", 404);
  return NextResponse.json(serializeSafeClientDetail(client));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  const { id } = await params;
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid profile");
  const client = await prisma.user.findFirst({ where: { id, role: "CLIENT" }, select: { id: true, name: true } });
  if (!client) return jsonError("Not found", 404);
  const profile = await prisma.clientProfile.upsert({
    where: { userId: id },
    update: parsed.data,
    create: { userId: id, fullName: parsed.data.fullName ?? client.name ?? "Client", ...parsed.data },
    select: { id: true, userId: true, fullName: true, phone: true, taxYear: true, filingType: true, assignedStaffId: true },
  });
  return NextResponse.json(profile);
}
