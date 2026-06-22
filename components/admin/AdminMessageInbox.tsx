"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export type AdminThread = { id:string;clientId:string;subject:string;status:string;createdAt:string;updatedAt:string;client:{id:string;name:string;email:string};messages:{id:string;senderName:string;senderRole:string;mine:boolean;body:string;readAt:string|null;createdAt:string}[] };

export function AdminMessageInbox({threads}:{threads:AdminThread[]}){
  const router=useRouter();
  const[selected,setSelected]=useState(threads[0]?.id);
  const[body,setBody]=useState("");
  const[sending,setSending]=useState(false);
  const[error,setError]=useState("");
  const thread=threads.find(item=>item.id===selected);

  async function reply(event:React.FormEvent){event.preventDefault();if(!thread||!body.trim())return;setSending(true);setError("");const response=await fetch(`/api/messages/${thread.id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({body})});const result=await response.json().catch(()=>({}));if(!response.ok){setError(result.error??"Reply failed");setSending(false);return}setBody("");setSending(false);router.refresh()}
  async function updateStatus(status:string){if(!thread)return;setError("");const response=await fetch(`/api/messages/${thread.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});if(!response.ok){const result=await response.json().catch(()=>({}));setError(result.error??"Status update failed");return}router.refresh()}

  return <div className="messages-shell admin-message-shell panel">
    <div className="threads">{threads.map(item=><button className={`thread ${selected===item.id?"active":""}`} onClick={()=>setSelected(item.id)} key={item.id}><div><b>{item.subject}</b><p>{item.client.name} · {item.status}</p><small>{new Date(item.updatedAt).toLocaleDateString()}</small></div></button>)}{!threads.length&&<div className="empty-state">No conversations match these filters.</div>}</div>
    <div className="conversation"><header><div><b>{thread?.subject??"Select a conversation"}</b><small>{thread?`${thread.client.name} · ${thread.client.email}`:"All client threads appear here"}</small></div>{thread&&<select aria-label="Thread status" value={thread.status} onChange={event=>updateStatus(event.target.value)}><option value="OPEN">Open</option><option value="PENDING">Pending</option><option value="RESOLVED">Resolved</option></select>}</header>
      <div className="messages">{thread?.messages.map(message=><div className={`bubble ${message.mine?"mine":"staff"}`} key={message.id}><div><b>{message.senderName} <small>{message.senderRole} · {new Date(message.createdAt).toLocaleString()}</small></b><p>{message.body}</p></div></div>)}</div>
      {thread&&<form className="compose" onSubmit={reply}><input aria-label="Reply" value={body} onChange={event=>setBody(event.target.value)} maxLength={10000} required placeholder="Reply securely to this client..."/><button className="send" disabled={sending} aria-label="Send reply"><Send/></button></form>}
      {error&&<p className="form-error" role="alert">{error}</p>}
    </div>
  </div>;
}
