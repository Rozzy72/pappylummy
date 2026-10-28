'use client';
import {useActionState} from 'react';
import {Form,Stack,Text,FieldLabel,Input,Button} from '@sd/ui';
import {resendConfirmation} from '@/app/login/actions';
import type {AuthState} from '@/lib/auth/validation';
const initial:AuthState={status:'idle',message:''};
export function ResendConfirmationForm(){const [state,action,pending]=useActionState(resendConfirmation,initial);return <Form action={action} aria-busy={pending}><Stack gap='4'><FieldLabel htmlFor='confirmation-email'>Email address</FieldLabel><Input id='confirmation-email' name='email' type='email' autoComplete='email' required maxLength={254}/><Text role='status' aria-live='polite'>{state.message}</Text><Button type='submit' disabled={pending}>{pending?'Sending…':'Resend confirmation email'}</Button></Stack></Form>;}
