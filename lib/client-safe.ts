import type { Prisma } from "@prisma/client";

export const CLIENT_SENSITIVE_FIELDS = ["passwordHash", "mfaSecretEncrypted", "addressEncrypted", "storageKey", "accounts", "sessions"] as const;

export const safeClientSelect = {
  id: true, name: true, email: true, emailVerified: true, role: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
  profile: { select: { id: true, fullName: true, phone: true, taxYear: true, filingType: true, assignedStaff: { select: { id: true, name: true, email: true } } } },
} satisfies Prisma.UserSelect;

export const safeClientDetailSelect = {
  ...safeClientSelect,
  taxReturns: { select: { id: true, taxYear: true, filingType: true, status: true, statusUpdatedAt: true }, orderBy: { taxYear: "desc" as const } },
  ownedDocuments: { select: { id: true, category: true, displayName: true, mimeType: true, byteSize: true, scanStatus: true, reviewStatus: true, reviewNote: true, reviewedAt: true, createdAt: true }, orderBy: { createdAt: "desc" as const } },
  invoices: { select: { id: true, number: true, description: true, amountCents: true, currency: true, status: true, dueAt: true, paidAt: true, createdAt: true }, orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.UserSelect;

type ClientListRecord = Prisma.UserGetPayload<{ select: typeof safeClientSelect }>;
type ClientDetailRecord = Prisma.UserGetPayload<{ select: typeof safeClientDetailSelect }>;

export function serializeSafeClient(client: ClientListRecord) {
  return {
    id: client.id, name: client.name, email: client.email, emailVerified: client.emailVerified,
    role: client.role, lastLoginAt: client.lastLoginAt, createdAt: client.createdAt, updatedAt: client.updatedAt,
    profile: client.profile ? {
      id: client.profile.id, fullName: client.profile.fullName, phone: client.profile.phone,
      taxYear: client.profile.taxYear, filingType: client.profile.filingType,
      assignedStaff: client.profile.assignedStaff ? { id: client.profile.assignedStaff.id, name: client.profile.assignedStaff.name, email: client.profile.assignedStaff.email } : null,
    } : null,
  };
}

export function serializeSafeClientDetail(client: ClientDetailRecord) {
  return {
    ...serializeSafeClient(client),
    taxReturns: client.taxReturns.map(item => ({ id: item.id, taxYear: item.taxYear, filingType: item.filingType, status: item.status, statusUpdatedAt: item.statusUpdatedAt })),
    ownedDocuments: client.ownedDocuments.map(document => ({ id: document.id, category: document.category, displayName: document.displayName, mimeType: document.mimeType, byteSize: document.byteSize.toString(), scanStatus: document.scanStatus, reviewStatus: document.reviewStatus, reviewNote: document.reviewNote, reviewedAt: document.reviewedAt, createdAt: document.createdAt })),
    invoices: client.invoices.map(invoice => ({ id: invoice.id, number: invoice.number, description: invoice.description, amountCents: invoice.amountCents, currency: invoice.currency, status: invoice.status, dueAt: invoice.dueAt, paidAt: invoice.paidAt, createdAt: invoice.createdAt })),
  };
}
