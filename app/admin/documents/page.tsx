import { Search } from "lucide-react";
import { DocumentReviewTable } from "@/components/admin/DocumentReviewTable";
import { requireStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { DocumentReviewStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
const value = (params: Params, key: string) => { const item = params[key]; return Array.isArray(item) ? item[0] ?? "" : item ?? ""; };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  await requireStaff();
  const params = await searchParams;
  const clientId = value(params, "clientId");
  const category = value(params, "category");
  const status = value(params, "status") as DocumentReviewStatus | "";
  const from = value(params, "from");
  const to = value(params, "to");
  const where: Prisma.DocumentWhereInput = {
    clientId: clientId || undefined,
    category: category || undefined,
    reviewStatus: status || undefined,
    createdAt: from || to ? { gte: from ? new Date(`${from}T00:00:00.000Z`) : undefined, lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined } : undefined,
  };
  const [documents, total, pending, clients, categories] = await prisma.$transaction([
    prisma.document.findMany({ where, include: { client: { include: { profile: true } }, reviewedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.document.count({ where }),
    prisma.document.count({ where: { reviewStatus: "PENDING" } }),
    prisma.user.findMany({ where: { role: "CLIENT", ownedDocuments: { some: {} } }, select: { id: true, name: true, email: true, profile: { select: { fullName: true } } }, orderBy: { email: "asc" } }),
    prisma.document.groupBy({ by: ["category"], orderBy: { category: "asc" } }),
  ]);

  return <div className="admin-body admin-documents-page">
    <div className="welcome"><div><p>SECURE DOCUMENT WORKFLOW</p><h1>Client documents</h1><span>{pending} awaiting staff review · {total} matching current filters</span></div></div>
    {pending > 0 && <div className="document-notification" role="status"><b>{pending} new document{pending === 1 ? "" : "s"} awaiting review.</b><span>Client uploads remain protected and cannot be opened until security scanning reports Clean.</span></div>}
    <form className="panel document-filters">
      <label><Search />Client<select name="clientId" defaultValue={clientId}><option value="">All clients</option>{clients.map(client => <option value={client.id} key={client.id}>{client.profile?.fullName ?? client.name ?? client.email}</option>)}</select></label>
      <label>Category<select name="category" defaultValue={category}><option value="">All categories</option>{categories.map(item => <option key={item.category}>{item.category}</option>)}</select></label>
      <label>Review status<select name="status" defaultValue={status}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="REVIEWED">Reviewed</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option><option value="NEEDS_REPLACEMENT">Needs Replacement</option></select></label>
      <label>From<input name="from" type="date" defaultValue={from} /></label>
      <label>To<input name="to" type="date" defaultValue={to} /></label>
      <button className="btn">Apply filters</button>
    </form>
    <DocumentReviewTable documents={documents.map(document => ({
      id: document.id,
      clientName: document.client.profile?.fullName ?? document.client.name ?? "Client",
      clientEmail: document.client.email,
      displayName: document.displayName,
      category: document.category,
      byteSize: document.byteSize.toString(),
      scanStatus: document.scanStatus,
      reviewStatus: document.reviewStatus,
      reviewNote: document.reviewNote,
      reviewedBy: document.reviewedBy?.name ?? null,
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
    }))} />
  </div>;
}
