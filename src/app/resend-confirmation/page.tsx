import {AuthBackdrop,Stack,Heading,Text,NavLink} from '@sd/ui';
import {ResendConfirmationForm} from '@/components/auth/resend-confirmation-form';
export const metadata={title:'Confirm your email | PappyLummy',robots:{index:false,follow:false}};
export default function ResendPage(){return <AuthBackdrop><Stack gap='6'><Heading as='h1'>Confirm your email</Heading><Text>Enter the email you used to register. Open only the newest confirmation email, then continue setting up your profile.</Text><ResendConfirmationForm/><NavLink href='/login'>Back to sign in</NavLink><NavLink href='/forgot-password'>Forgot password?</NavLink></Stack></AuthBackdrop>;}
