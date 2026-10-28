import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
export const RECEIPT_COOKIE="pappylummy_order_receipt";
export const RECEIPT_SECONDS=24*60*60;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function signReceipt(reference:string,secret:string,now=Date.now()):string{
 if(!uuid.test(reference)||!secret)throw new Error("Invalid receipt configuration");
 const payload=Buffer.from(JSON.stringify({reference,expires:Math.floor(now/1000)+RECEIPT_SECONDS})).toString("base64url");
 const signature=createHmac("sha256",secret).update("pappylummy-order-receipt-v1:"+payload).digest("base64url");
 return payload+"."+signature;
}
export function verifyReceipt(token:unknown,secret:string,now=Date.now()):string|null{
 if(typeof token!=="string"||token.length>512||!secret)return null;
 const parts=token.split(".");if(parts.length!==2||!/^[A-Za-z0-9_-]+$/.test(parts[0])||!/^[A-Za-z0-9_-]{43}$/.test(parts[1]))return null;
 const signature=createHmac("sha256",secret).update("pappylummy-order-receipt-v1:"+parts[0]).digest();
 const supplied=Buffer.from(parts[1],"base64url");
 if(supplied.length!==signature.length||!timingSafeEqual(signature,supplied))return null;
 try{const p=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));const seconds=Math.floor(now/1000);return typeof p.reference==="string"&&uuid.test(p.reference)&&Number.isInteger(p.expires)&&p.expires>seconds&&p.expires<=seconds+RECEIPT_SECONDS?p.reference:null;}catch{return null;}
}
