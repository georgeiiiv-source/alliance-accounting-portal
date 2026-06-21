import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { safeClientSelect, serializeSafeClient } from "@/lib/client-safe";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const clients = await prisma.user.findMany({ where: { role: "CLIENT" }, select: safeClientSelect, orderBy: { createdAt: "desc" } });
  if (new URL(request.url).searchParams.get("format") === "csv") {
    const rows = ["name,email,phone,tax_year,filing_type", ...clients.map(client => [client.profile?.fullName ?? client.name, client.email, client.profile?.phone, client.profile?.taxYear, client.profile?.filingType].map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))];
    return new Response(rows.join("\n"), { headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=\"alliance-clients.csv\"" } });
  }
  return NextResponse.json(clients.map(serializeSafeClient));
}
