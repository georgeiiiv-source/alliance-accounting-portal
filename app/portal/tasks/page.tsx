import { TaskChecklist } from "@/components/portal/TaskChecklist";
import { requireClient } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireClient();const tasks=await prisma.clientTask.findMany({where:{clientId:user.id},orderBy:[{completedAt:'asc'},{dueAt:'asc'}]});return <TaskChecklist initialTasks={tasks.map(x=>({...x,dueAt:x.dueAt?.toISOString()??null,completedAt:x.completedAt?.toISOString()??null}))}/>}
