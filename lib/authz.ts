import { auth } from "@/auth";
import { redirect } from "next/navigation";
export async function requireClient(){const session=await auth();if(!session?.user||session.user.role!=="CLIENT")redirect('/login');return session.user}
export async function requireStaff(){const session=await auth();if(!session?.user||!['STAFF','ADMIN'].includes(session.user.role))redirect('/admin-login');return session.user}
