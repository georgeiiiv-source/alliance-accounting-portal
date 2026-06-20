import { prisma } from "@/lib/prisma";

type AuditInput = { actorId?: string; clientId?: string; action: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown> };
export async function audit(input: AuditInput) {
  await prisma.auditLog.create({ data: { ...input, metadata: input.metadata as never } });
}
