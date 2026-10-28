import "server-only";
import {notFound} from "next/navigation";
import {requireUser} from "./require-user";
export function isAdminUser(userId:string){return (process.env.ADMIN_USER_IDS??"").split(",").map(id=>id.trim()).filter(Boolean).includes(userId);}
export async function requireAdmin(writableCookies=false){const auth=await requireUser(writableCookies);if(!isAdminUser(auth.userId))notFound();return auth;}
