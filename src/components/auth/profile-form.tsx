"use client";
import {useActionState} from "react";
import {Stack,Heading,Text,Form,FieldLabel,Input,Button,Grid,Select} from "@sd/ui";
import {NIGERIAN_STATES} from "@/lib/delivery";
import {saveProfile} from "@/app/account/actions";
import type {AuthState} from "@/lib/auth/validation";
const initial:AuthState={status:"idle",message:""};
export function ProfileForm({name,phone,address="",city="",stateName=""}:{name:string;phone:string;address?:string;city?:string;stateName?:string}) {
 const [state,action,pending]=useActionState(saveProfile,initial);
 return <Stack gap="4"><Heading as="h2">Edit profile</Heading><Form action={action} aria-busy={pending}>
 <Stack gap="2"><FieldLabel htmlFor="profile-name">Full name</FieldLabel><Input id="profile-name" name="full_name" autoComplete="name" maxLength={100} defaultValue={name}/></Stack>
 <Stack gap="2"><FieldLabel htmlFor="profile-phone">Phone number</FieldLabel><Input id="profile-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={phone} aria-describedby="profile-phone-help"/><Text id="profile-phone-help" look="small" muted>Include your country code, for example +234. Name and phone are optional.</Text></Stack>
 <Stack gap="2"><FieldLabel htmlFor="profile-address">Address</FieldLabel><Input id="profile-address" name="address" autoComplete="address-line1" maxLength={300} defaultValue={address} disabled={pending}/></Stack>
 <Grid layout="form"><Stack gap="2"><FieldLabel htmlFor="profile-city">City</FieldLabel><Input id="profile-city" name="city" autoComplete="address-level2" maxLength={100} defaultValue={city} disabled={pending}/></Stack><Stack gap="2"><FieldLabel htmlFor="profile-state">State</FieldLabel><Select id="profile-state" name="state" autoComplete="address-level1" defaultValue={stateName} disabled={pending}><option value="">Choose your state</option>{NIGERIAN_STATES.map(value=><option key={value} value={value}>{value}</option>)}</Select></Stack></Grid>
 <Text look="small" muted>Provide all three address fields, or leave all three blank to remove your address.</Text>
 <Button type="submit" disabled={pending}>{pending?"Saving…":"Save profile"}</Button><Text role="status" aria-live="polite">{state.message}</Text>
 </Form></Stack>;
}
