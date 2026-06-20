import { TaxStatusTracker } from "@/components/portal/TaxStatusTracker";import { requireClient } from "@/lib/authz";import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireClient();const tax=await prisma.taxReturn.findFirst({where:{clientId:user.id},orderBy:{taxYear:'desc'}});return <TaxStatusTracker status={tax?.status} updatedAt={tax?.statusUpdatedAt}/>}
