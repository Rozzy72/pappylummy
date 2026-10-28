import { redirect } from "next/navigation";
import { readConfirmation } from "@/lib/auth/validation";
import { AuthBackdrop, Stack, Heading, Text, Button, NavLink } from "@sd/ui";

export const dynamic="force-dynamic";
export const metadata={title:"Confirm your email | PappyLummy",robots:{index:false,follow:false},referrer:"same-origin" as const};

export default async function ConfirmEmail({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  const params=new URLSearchParams();
  for(const key of ["token_hash","type"]) {
    const value=query[key];
    if(Array.isArray(value)) for(const item of value) params.append(key,item);
    else if(value!==undefined) params.append(key,value);
  }
  const verification=readConfirmation(params);
  if(!verification) redirect("/login?confirmation=failed");
  return <AuthBackdrop><Stack gap="6"><Heading as="h1">Confirm your email</Heading><Text>One last step. Confirm your email address to continue setting up your PappyLummy account.</Text><form action="/auth/confirm" method="post"><input type="hidden" name="token_hash" value={verification.token_hash}/><input type="hidden" name="type" value="email"/><Button type="submit" fullWidth>Confirm email and continue</Button></form><Text look="small" muted>Already confirmed your email? You can sign in to your account.</Text><NavLink href="/login">Sign in</NavLink></Stack></AuthBackdrop>;
}
