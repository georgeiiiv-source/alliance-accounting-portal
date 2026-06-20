import { AppointmentScheduler } from "@/components/portal/AppointmentScheduler";
import { requireClient } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireClient();const rows=await prisma.appointmentRequest.findMany({where:{clientId:user.id},orderBy:{requestedStart:'desc'}});return <AppointmentScheduler appointments={rows.map(x=>({id:x.id,requestedStart:x.requestedStart.toISOString(),timeZone:x.timeZone,mode:x.mode,topic:x.topic,status:x.status,meetingUrl:x.meetingUrl}))}/>}
