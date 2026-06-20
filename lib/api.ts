import { NextResponse } from "next/server";
import type { Session } from "next-auth";
export const jsonError=(message:string,status=400)=>NextResponse.json({error:message},{status});
export const isStaff=(session:Session|null)=>session?.user.role==='STAFF'||session?.user.role==='ADMIN';
