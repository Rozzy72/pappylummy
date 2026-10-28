import "server-only";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { registrationContact } from "@/lib/auth/validation";

/** Called only after successful OTP verification, using the verified Auth user. */
export async function initializeRegistrationProfile(client:SupabaseClient<Database>,user:User) {
 const contact=registrationContact(user.user_metadata);
 if(!user.id || !contact)return;
 try {
  // The signup trigger creates this row. Never overwrite subsequent profile edits.
  await client.from("profiles").update({full_name:contact.full_name,phone:contact.phone}).eq("id",user.id).is("full_name",null).is("phone",null);
 } catch { /* The completion form remains available to retry a failed save. */ }
}
