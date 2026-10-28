import "server-only";
import {createClient} from "@/lib/supabase/server";
import {profileAddress} from "@/lib/auth/validation";
export type CheckoutDetails = {name:string;email:string;phone:string;address:string;city:string;state:string};
export async function getCheckoutProfile():Promise<{signedIn:boolean;details:CheckoutDetails|null}> {
  try {
    const client=await createClient();
    const {data:identity,error:authError}=await client.auth.getUser();
    if(authError || !identity.user?.id)return {signedIn:false,details:null};
    const user=identity.user;
    const {data,error}=await client.from("profiles").select("full_name, phone").eq("id",user.id).maybeSingle();
    const address=profileAddress(user.user_metadata);
    return {signedIn:true,details:{name:!error && data?.full_name || "",email:user.email??"",phone:!error && data?.phone?data.phone.replace(/[ ()-]/g,""):"",address:address?.address??"",city:address?.city??"",state:address?.state??""}};
  }catch{return {signedIn:false,details:null};}
}
