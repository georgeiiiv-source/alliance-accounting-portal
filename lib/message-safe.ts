import type { Prisma } from "@prisma/client";
import { decryptSensitiveText } from "@/lib/security";

export const MESSAGE_SENSITIVE_FIELDS = ["bodyEncrypted", "passwordHash", "mfaSecretEncrypted", "addressEncrypted"] as const;

export const safeMessageThreadSelect = {
  id: true, clientId: true, subject: true, status: true, createdAt: true, updatedAt: true,
  client: { select: { id: true, name: true, email: true, profile: { select: { fullName: true } } } },
  messages: {
    select: { id: true, senderId: true, readAt: true, createdAt: true, bodyEncrypted: true, sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.MessageThreadSelect;

type SafeMessageThreadRecord = Prisma.MessageThreadGetPayload<{ select: typeof safeMessageThreadSelect }>;

export function serializeMessageThread(thread: SafeMessageThreadRecord, viewerId: string) {
  return {
    id: thread.id, clientId: thread.clientId, subject: thread.subject, status: thread.status,
    createdAt: thread.createdAt, updatedAt: thread.updatedAt,
    client: { id: thread.client.id, name: thread.client.profile?.fullName ?? thread.client.name ?? "Client", email: thread.client.email },
    messages: thread.messages.map(message => ({
      id: message.id, senderId: message.senderId, senderName: message.sender.name ?? (message.sender.role === "CLIENT" ? "Client" : "Alliance team"),
      senderRole: message.sender.role, mine: message.senderId === viewerId,
      body: decryptSensitiveText(message.bodyEncrypted), readAt: message.readAt, createdAt: message.createdAt,
    })),
  };
}
