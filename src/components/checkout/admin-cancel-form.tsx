"use client";
import {useActionState,useState} from "react";
import {Button,Form,Stack,Text} from "@sd/ui";
import {cancelUnpaidRequest,type CancelState} from "@/app/admin/orders/actions";
const initial:CancelState={status:"idle",message:""};
export function AdminCancelForm({id}:{id:string}){const [confirmed,setConfirmed]=useState(false);const [state,action,pending]=useActionState(cancelUnpaidRequest,initial);return <Form action={action} aria-busy={pending}><input type="hidden" name="orderId" value={id}/><Stack gap="3"><label><input type="checkbox" name="confirm" value="yes" checked={confirmed} disabled={pending||state.status==="success"} onChange={e=>setConfirmed(e.target.checked)}/> Confirm cancellation of this unpaid request</label><Button type="submit" disabled={!confirmed||pending||state.status==="success"}>{pending?"Cancelling…":"Cancel unpaid request"}</Button><Text role="status" aria-live="polite">{state.message}</Text></Stack></Form>;}
