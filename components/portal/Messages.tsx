"use client";
import { useState } from "react";
import { Plus, Send, X } from "lucide-react";

type Thread = { id: string; subject: string; status: string; updatedAt: string; messages: { id: string; body: string; senderName: string; mine: boolean; createdAt: string }[] };

export function Messages({ threads }: { threads: Thread[] }) {
  const [selected, setSelected] = useState(threads[0]?.id);
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const thread = threads.find(t => t.id === selected);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSending(true); setError("");
    const response = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject, body: newBody }) });
    if (!response.ok) { const data = await response.json(); setError(data.error ?? "Message could not be created"); setSending(false); return; }
    location.reload();
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!thread || !body) return; setSending(true); setError("");
    const response = await fetch(`/api/messages/${thread.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
    if (!response.ok) { const data = await response.json(); setError(data.error ?? "Message could not be sent"); setSending(false); return; }
    location.reload();
  }

  return <div className="portal-content messages-page"><div className="welcome"><div><h1>Messages</h1><span>Encrypted conversations with your Alliance team.</span></div><button className="btn" onClick={() => setCreating(true)}><Plus/> New message</button></div>{creating&&<div className="upload-modal"><form className="new-message" onSubmit={create}><button type="button" onClick={()=>setCreating(false)} aria-label="Close"><X/></button><h2>New secure message</h2><label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)} minLength={2} maxLength={160} required/></label><label>Message<textarea value={newBody} onChange={e=>setNewBody(e.target.value)} maxLength={10000} required/></label>{error&&<p role="alert">{error}</p>}<button className="btn" disabled={sending}>{sending?"Sending…":"Create conversation"}</button></form></div>}<div className="messages-shell panel"><div className="threads">{threads.map(t=><button className={`thread ${selected===t.id?"active":""}`} onClick={()=>setSelected(t.id)} key={t.id}><div><b>{t.subject}</b><p>{t.status}</p><small>{new Date(t.updatedAt).toLocaleDateString()}</small></div></button>)}{!threads.length&&<div className="empty-state">No conversations yet.</div>}</div><div className="conversation"><header><div><b>{thread?.subject??"Select a conversation"}</b><small>{thread?.status}</small></div></header><div className="messages">{thread?.messages.map(message=><div className={`bubble ${message.mine?"mine":"staff"}`} key={message.id}><div><b>{message.senderName} <small>{new Date(message.createdAt).toLocaleString()}</small></b><p>{message.body}</p></div></div>)}</div>{thread&&<form className="compose" onSubmit={send}><input value={body} onChange={e=>setBody(e.target.value)} maxLength={10000} placeholder="Write a secure message..."/><button className="send" disabled={sending} aria-label="Send"><Send/></button></form>}{error&&!creating&&<p className="form-error" role="alert">{error}</p>}</div></div></div>;
}
