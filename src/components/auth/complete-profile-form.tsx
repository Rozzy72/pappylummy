"use client";
import {useActionState} from "react";
import {Button,FieldLabel,Form,Input,Stack,Text} from "@sd/ui";
import {completeProfile} from "@/app/account/actions";
import type {AuthState} from "@/lib/auth/validation";
const initial:AuthState={status:"idle",message:""};
export function CompleteProfileForm({name,phone}:{name:string;phone:string}){
 const [state,action,pending]=useActionState(completeProfile,initial);
 return <Form action={action} aria-busy={pending}><Stack gap="6">
 <Stack gap="2"><FieldLabel htmlFor="setup-name">Full name</FieldLabel><Input id="setup-name" name="full_name" autoComplete="name" defaultValue={name} required maxLength={100} aria-describedby="setup-name-help" disabled={pending}/><Text id="setup-name-help" look="small" muted>How would you like us to address you?</Text></Stack>
 <Stack gap="2"><FieldLabel htmlFor="setup-phone">Phone number</FieldLabel><Input id="setup-phone" name="phone" type="tel" autoComplete="tel" defaultValue={phone} required maxLength={30} aria-describedby="setup-phone-help" disabled={pending}/><Text id="setup-phone-help" look="small" muted>Include your country code, for example +234.</Text></Stack>
 <Text role="status" aria-live="polite" aria-atomic="true">{state.message}</Text>
 <Button type="submit" fullWidth disabled={pending}>{pending?"Saving your details…":"Save and continue to My Account"}</Button>
 <Text look="small" muted>You can update these details anytime in My Account.</Text>
 </Stack></Form>;
}
