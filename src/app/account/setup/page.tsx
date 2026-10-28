import {registrationContact} from "@/lib/auth/validation";
import {requireUser} from "@/lib/auth/require-user";
import {CompleteProfileForm} from "@/components/auth/complete-profile-form";
import {Stack,Box,Heading,Text,NavLink,Grid,Flex,Icon} from "@sd/ui";
export const dynamic="force-dynamic";
export const metadata={title:"Complete your profile | PappyLummy",robots:{index:false,follow:false}};
export default async function Setup(){
 const {client,userId,user}=await requireUser();
 const contact=registrationContact(user.user_metadata);
 let profile:{full_name:string|null;phone:string|null}|null=null;
 try{const {data,error}=await client.from("profiles").select("full_name, phone").eq("id",userId).maybeSingle();if(!error)profile=data;}catch{/* Show a recoverable state without exposing private diagnostics. */}
 return <Grid layout="split"><Stack gap="8"><Stack gap="3"><Text look="eyebrow">WELCOME TO PAPPYLUMMY</Text><Heading as="h1" look="heading-lg" measure>Complete your profile.</Heading><Text muted measure>Your email is verified. Add a few details to make this account yours.</Text></Stack>
 <Box surface="muted" p="6" radius="md"><Stack gap="6"><Flex gap="3"><Icon name="user"/><Stack gap="1"><Text look="body">Your email is confirmed</Text><Text look="small">{user.email}</Text></Stack></Flex><Stack gap="3"><Text look="eyebrow">YOUR NEXT STEP</Text><Heading as="h2" look="heading">A name behind the shirt.</Heading><Text muted>Save your details to continue to My Account, your personal space for your profile.</Text></Stack></Stack></Box><NavLink href="/shop">Continue browsing the shop</NavLink></Stack>
 <Box as="section" surface="paper" border radius="md" p="6" aria-labelledby="setup-details-heading"><Stack gap="6"><Stack gap="2"><Text look="eyebrow">PROFILE DETAILS</Text><Heading as="h2" id="setup-details-heading">Let’s get to know you.</Heading><Text muted>Review your details, then save to continue to My Account.</Text>{contact?.address && <Stack gap="2"><Text look="small" muted>Registered address</Text><Text>{[contact.address, contact.city, contact.state].filter(Boolean).join(", ")}</Text></Stack>}</Stack>{profile?<CompleteProfileForm name={profile.full_name??contact?.full_name??""} phone={profile.phone??contact?.phone??""}/>:<Stack gap="3"><Text role="status">Your profile could not be loaded. Please refresh this page to try again.</Text><NavLink href="/account">Go to My Account</NavLink></Stack>}</Stack></Box></Grid>;
}
