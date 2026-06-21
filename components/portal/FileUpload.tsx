"use client";
import { useState } from "react";
import { ShieldCheck, Upload } from "lucide-react";
const categories = ["W-2","1099","Bank statements","Business expenses","ID documents","Prior tax return","IRS letters","Payroll documents","Bookkeeping documents"];
export function FileUpload() {
  const [progress,setProgress] = useState(0); const [message,setMessage] = useState(""); const [sending,setSending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setProgress(15); setMessage("");
    const data = new FormData(event.currentTarget); setProgress(45);
    const response = await fetch("/api/documents", { method: "POST", body: data });
    const result = await response.json().catch(() => ({}));
    setProgress(response.ok ? 100 : 0); setMessage(response.ok ? "Document uploaded successfully. It is awaiting security scanning and staff review." : result.error ?? "Upload could not be completed."); setSending(false);
    if (response.ok) setTimeout(() => location.reload(), 700);
  }
  return <form className="upload-box" onSubmit={submit}><div className="upload-icon"><Upload/></div><h3>Secure file upload</h3><p>PDF, JPG, PNG, DOCX, XLSX or CSV · 25 MB maximum</p><select name="category" required defaultValue=""><option value="" disabled>Select document category</option>{categories.map(category=><option key={category}>{category}</option>)}</select><input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv"/><button className="btn" disabled={sending} type="submit"><Upload/> {sending?"Uploading…":"Upload document"}</button>{progress>0&&<div className="upload-progress"><i style={{width:`${progress}%`}}/></div>}<small><ShieldCheck/> Every file is restricted, encrypted, and quarantined until scanning completes</small>{message&&<p role="status">{message}</p>}</form>;
}
