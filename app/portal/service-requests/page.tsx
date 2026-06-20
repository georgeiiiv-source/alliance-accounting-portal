import { ServiceRequests } from "@/components/portal/ServiceRequests";import { requireClient } from "@/lib/authz";import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireClient();const rows=await prisma.serviceRequest.findMany({where:{clientId:user.id},orderBy:{createdAt:'desc'}});return <ServiceRequests requests={rows.map(r=>({...r,createdAt:r.createdAt.toISOString()}))}/>}
