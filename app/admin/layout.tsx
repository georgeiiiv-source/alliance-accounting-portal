import { AdminShell } from "@/components/admin/AdminShell";import { requireStaff } from "@/lib/authz";
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:React.ReactNode}){const user=await requireStaff();return <AdminShell name={user.name??'Staff'}>{children}</AdminShell>}
