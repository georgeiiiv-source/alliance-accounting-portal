import { TaxOrganizerQuestionnaire,type OrganizerAnswers } from "@/components/portal/TaxOrganizerQuestionnaire";
import { requireClient } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveText } from "@/lib/security";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireClient();const profile=await prisma.clientProfile.findUnique({where:{userId:user.id}});const taxYear=profile?.taxYear??new Date().getFullYear()-1;const organizer=await prisma.taxOrganizer.findUnique({where:{clientId_taxYear:{clientId:user.id,taxYear}}});const initial=organizer?JSON.parse(decryptSensitiveText(organizer.answersEncrypted)) as OrganizerAnswers:undefined;return <TaxOrganizerQuestionnaire taxYear={taxYear} initial={initial} status={organizer?.status}/>}
