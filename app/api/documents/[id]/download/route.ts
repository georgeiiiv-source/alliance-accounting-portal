import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  if (!process.env.S3_BUCKET) return jsonError("Secure file storage is not configured", 503);
  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document || (!isStaff(session) && document.clientId !== session.user.id)) return jsonError("Not found", 404);
  if (document.scanStatus !== "CLEAN") return jsonError("Document is not available until security scanning completes", 423);
  const inline = new URL(request.url).searchParams.get("disposition") === "inline";
  const disposition = inline ? "inline" : "attachment";
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: document.storageKey, ResponseContentDisposition: `${disposition}; filename*=UTF-8''${encodeURIComponent(document.displayName)}`, ResponseContentType: document.mimeType }), { expiresIn: 60 });
  await prisma.auditLog.create({ data: { actorId: session.user.id, clientId: document.clientId, action: inline ? "DOCUMENT_VIEW" : "DOCUMENT_DOWNLOAD", entityType: "Document", entityId: document.id } });
  return NextResponse.redirect(url, 303);
}
