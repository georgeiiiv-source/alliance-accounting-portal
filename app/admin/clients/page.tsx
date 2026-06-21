import Link from "next/link";
import { Download, ShieldCheck, UsersRound } from "lucide-react";
import { requireStaff } from "@/lib/authz";
import { safeClientSelect } from "@/lib/client-safe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireStaff();
  if (user.role !== "ADMIN") return <div className="admin-body"><div className="empty-state">Administrator access is required to view the client directory.</div></div>;
  const clients = await prisma.user.findMany({ where: { role: "CLIENT" }, select: safeClientSelect, orderBy: { createdAt: "desc" } });
  return <div className="admin-body admin-clients-page">
    <div className="welcome"><div><p>SAFE CLIENT DIRECTORY</p><h1>Clients</h1><span>{clients.length} client account{clients.length === 1 ? "" : "s"} · Sensitive authentication and encrypted fields are never displayed.</span></div><Link className="btn outline" href="/api/clients?format=csv"><Download />Export safe CSV</Link></div>
    <div className="client-security-note"><ShieldCheck /><span><b>Protected client view</b>Password hashes, MFA secrets, encrypted addresses, sessions, and storage keys are excluded at the database query layer.</span></div>
    <section className="panel safe-client-table">
      <div className="safe-client-row heading"><span>CLIENT</span><span>CONTACT</span><span>TAX PROFILE</span><span>ASSIGNED STAFF</span><span>ACCESS</span></div>
      {clients.map(client => <div className="safe-client-row" key={client.id}>
        <span><i><UsersRound /></i><b>{client.profile?.fullName ?? client.name ?? "Client"}<small>Joined {client.createdAt.toLocaleDateString()}</small></b></span>
        <span><b>{client.email}</b><small>{client.profile?.phone ?? "No phone provided"}</small></span>
        <span><b>{client.profile?.filingType ?? "Not set"}</b><small>{client.profile?.taxYear ? `Tax year ${client.profile.taxYear}` : "Tax year not set"}</small></span>
        <span><b>{client.profile?.assignedStaff?.name ?? "Unassigned"}</b><small>{client.profile?.assignedStaff?.email}</small></span>
        <span><i className={`pill ${client.emailVerified ? "accepted" : "pending"}`}>{client.emailVerified ? "Verified" : "Unverified"}</i><small>{client.lastLoginAt ? `Last login ${client.lastLoginAt.toLocaleDateString()}` : "Never logged in"}</small></span>
      </div>)}
      {!clients.length && <div className="empty-state">No client accounts are available.</div>}
    </section>
  </div>;
}
