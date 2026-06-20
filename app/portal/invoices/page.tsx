import { InvoiceCenter } from "@/components/portal/InvoiceCenter";import { requireClient } from "@/lib/authz";import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireClient();const invoices=await prisma.invoice.findMany({where:{clientId:user.id},orderBy:{createdAt:'desc'}});return <InvoiceCenter invoices={invoices}/>}
