import { Search } from "lucide-react";
import { AdminMessageInbox } from "@/components/admin/AdminMessageInbox";
import { requireStaff } from "@/lib/authz";
import { safeMessageThreadSelect, serializeMessageThread } from "@/lib/message-safe";
import { prisma } from "@/lib/prisma";
import type { MessageStatus, Prisma } from "@prisma/client";

export const dynamic="force-dynamic";type Params=Record<string,string|string[]|undefined>;const value=(params:Params,key:string)=>{const item=params[key];return Array.isArray(item)?item[0]??"":item??""};

export default async function Page({searchParams}:{searchParams:Promise<Params>}){
  const user=await requireStaff();const params=await searchParams;const clientId=value(params,"clientId");const status=value(params,"status") as MessageStatus|"";const from=value(params,"from");const to=value(params,"to");
  const where:Prisma.MessageThreadWhereInput={clientId:clientId||undefined,status:status||undefined,createdAt:from||to?{gte:from?new Date(`${from}T00:00:00.000Z`):undefined,lte:to?new Date(`${to}T23:59:59.999Z`):undefined}:undefined};
  const[rows,clients]=await prisma.$transaction([
    prisma.messageThread.findMany({where,select:safeMessageThreadSelect,orderBy:{updatedAt:"desc"},take:500}),
    prisma.user.findMany({where:{role:"CLIENT",messageThreads:{some:{}}},select:{id:true,name:true,email:true,profile:{select:{fullName:true}}},orderBy:{email:"asc"}}),
  ]);
  const threads=rows.map(row=>{const item=serializeMessageThread(row,user.id);return{...item,createdAt:item.createdAt.toISOString(),updatedAt:item.updatedAt.toISOString(),messages:item.messages.map(message=>({...message,readAt:message.readAt?.toISOString()??null,createdAt:message.createdAt.toISOString()}))}});
  return <div className="admin-body admin-messages-page"><div className="welcome"><div><p>SECURE CLIENT COMMUNICATIONS</p><h1>Messages</h1><span>{threads.length} conversation{threads.length===1?"":"s"} matching current filters.</span></div></div>
    <form className="panel message-filters"><label><Search/>Client<select name="clientId" defaultValue={clientId}><option value="">All clients</option>{clients.map(client=><option value={client.id} key={client.id}>{client.profile?.fullName??client.name??client.email}</option>)}</select></label><label>Status<select name="status" defaultValue={status}><option value="">All statuses</option><option value="OPEN">Open</option><option value="PENDING">Pending</option><option value="RESOLVED">Resolved</option></select></label><label>From<input name="from" type="date" defaultValue={from}/></label><label>To<input name="to" type="date" defaultValue={to}/></label><button className="btn">Apply filters</button></form>
    <AdminMessageInbox threads={threads}/>
  </div>;
}
