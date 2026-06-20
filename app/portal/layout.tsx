import { PortalShell } from "@/components/portal/PortalShell";import { requireClient } from "@/lib/authz";
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:React.ReactNode}){const user=await requireClient();return <PortalShell name={user.name??'Client'}>{children}</PortalShell>}
