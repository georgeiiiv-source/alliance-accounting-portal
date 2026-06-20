import { Download, FileText } from "lucide-react";
import { FileUpload } from "@/components/portal/FileUpload";
import { requireClient } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireClient();
  const files = await prisma.document.findMany({ where: { clientId: user.id }, orderBy: { createdAt: "desc" } });
  return <div className="portal-content"><div className="welcome"><div><h1>Documents</h1><span>Securely send and manage your financial files.</span></div></div><FileUpload/><section className="panel files-panel"><div className="file-table"><div className="file-row heading"><span>DOCUMENT</span><span>CATEGORY</span><span>UPLOADED</span><span>SIZE</span><span/></div>{files.map(file=><div className="file-row" key={file.id}><span><i className="pdf"><FileText/></i><b>{file.displayName}</b></span><span><em>{file.category}</em></span><span>{file.createdAt.toLocaleDateString()}</span><span>{Math.round(Number(file.byteSize)/1024)} KB</span><span>{file.scanStatus === "CLEAN"?<a aria-label={`Download ${file.displayName}`} href={`/api/documents/${file.id}/download`}><Download/></a>:<i className={`file-status ${file.scanStatus.toLowerCase()}`}>{file.scanStatus}</i>}</span></div>)}{!files.length&&<div className="empty-state">No documents have been uploaded.</div>}</div></section></div>;
}
