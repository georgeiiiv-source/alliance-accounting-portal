import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaff, jsonError } from "@/lib/api";
import { notifyDocumentUploaded } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { allowedMimeTypes, hashIp, MAX_FILE_BYTES } from "@/lib/security";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  const clientId = isStaff(session) ? new URL(request.url).searchParams.get("clientId") : session.user.id;
  if (!clientId) return jsonError("clientId required");
  const documents = await prisma.document.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(documents.map(d => ({ ...d, byteSize: d.byteSize.toString(), downloadUrl: d.scanStatus === "CLEAN" ? `/api/documents/${d.id}/download` : null })));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);
  if (!process.env.S3_BUCKET) return jsonError("Secure file storage is not configured", 503);
  const data = await request.formData();
  const file = data.get("file");
  const category = String(data.get("category") ?? "").trim();
  if (!(file instanceof File) || !category) return jsonError("File and category are required");
  if (file.size <= 0 || file.size > MAX_FILE_BYTES || !allowedMimeTypes.has(file.type)) return jsonError("Unsupported file type or size", 415);
  const clientId = isStaff(session) ? String(data.get("clientId") ?? "") : session.user.id;
  if (!clientId) return jsonError("clientId required");
  if (isStaff(session) && !(await prisma.user.findFirst({ where: { id: clientId, role: "CLIENT" }, select: { id: true } }))) return jsonError("Client not found", 404);

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `clients/${clientId}/${new Date().getUTCFullYear()}/${randomUUID()}`;
  const checksum = createHash("sha256").update(bytes).digest("base64");
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: key, Body: bytes, ContentType: file.type,
    ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    ChecksumSHA256: checksum,
    ServerSideEncryption: process.env.S3_KMS_KEY_ID ? "aws:kms" : "AES256",
    SSEKMSKeyId: process.env.S3_KMS_KEY_ID || undefined,
    Metadata: { originalName: encodeURIComponent(file.name), clientId, scanStatus: "pending" }
  }));

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const document = await prisma.$transaction(async tx => {
    const created = await tx.document.create({ data: { clientId, uploadedById: session.user.id, category, displayName: file.name, storageKey: key, mimeType: file.type, byteSize: file.size, scanStatus: "PENDING" } });
    await tx.auditLog.create({ data: { actorId: session.user.id, clientId, action: "DOCUMENT_UPLOAD", entityType: "Document", entityId: created.id, ipHash: hashIp(ip), userAgent: request.headers.get("user-agent"), metadata: { scanStatus: "PENDING", checksumSha256: checksum } } });
    return created;
  });
  await notifyDocumentUploaded(session.user.id, clientId, file.name);
  return NextResponse.json({ ...document, byteSize: document.byteSize.toString() }, { status: 201 });
}
