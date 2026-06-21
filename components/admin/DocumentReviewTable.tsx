"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Save } from "lucide-react";
import { DOCUMENT_REVIEW_ACTIONS as statuses, documentStatusLabel as label } from "@/lib/document-workflow";

export type DocumentRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  displayName: string;
  category: string;
  byteSize: string;
  scanStatus: string;
  reviewStatus: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};


function ReviewControl({ document }: { document: DocumentRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(document.reviewStatus === "PENDING" ? "REVIEWED" : document.reviewStatus);
  const [note, setNote] = useState(document.reviewNote ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const locked = document.scanStatus !== "CLEAN";

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/documents/${document.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Saved" : body.error ?? "Review update failed");
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return <div className="document-review-control">
    <select value={status} onChange={event => setStatus(event.target.value)} disabled={locked || saving} aria-label={`Review status for ${document.displayName}`}>
      {statuses.map(value => <option value={value} key={value}>{label(value)}</option>)}
    </select>
    <input value={note} onChange={event => setNote(event.target.value)} disabled={locked || saving} maxLength={500} placeholder={locked ? "Awaiting security scan" : "Optional staff note"} />
    <button type="button" onClick={save} disabled={locked || saving}><Save />{saving ? "Saving" : "Save"}</button>
    {message && <small className={message === "Saved" ? "review-saved" : "form-error"}>{message}</small>}
  </div>;
}

export function DocumentReviewTable({ documents }: { documents: DocumentRow[] }) {
  return <section className="panel admin-documents-table">
    <div className="document-row heading"><span>CLIENT / DOCUMENT</span><span>CATEGORY</span><span>UPLOADED</span><span>SECURITY</span><span>REVIEW STATUS</span><span>FILE</span><span>STAFF ACTION</span></div>
    {documents.map(document => <div className="document-row" key={document.id}>
      <span><b>{document.displayName}</b><small>{document.clientName} · {document.clientEmail} · {Math.max(1, Math.round(Number(document.byteSize) / 1024))} KB</small></span>
      <span>{document.category}</span>
      <time>{new Date(document.createdAt).toLocaleString()}</time>
      <span><i className={`pill ${document.scanStatus.toLowerCase()}`}>{label(document.scanStatus)}</i></span>
      <span><i className={`pill ${document.reviewStatus.toLowerCase()}`}>{label(document.reviewStatus)}</i>{document.reviewedBy && <small>{document.reviewedBy}{document.reviewedAt ? ` · ${new Date(document.reviewedAt).toLocaleDateString()}` : ""}</small>}</span>
      <span className="document-file-actions">{document.scanStatus === "CLEAN" ? <><a href={`/api/documents/${document.id}/download?disposition=inline`} target="_blank" rel="noreferrer"><ExternalLink />View</a><a href={`/api/documents/${document.id}/download`}><Download />Download</a></> : <small>Available after clean scan</small>}</span>
      <ReviewControl document={document} />
    </div>)}
    {!documents.length && <div className="empty-state">No documents match these filters.</div>}
  </section>;
}
