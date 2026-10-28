import { NIGERIAN_STATES } from "@/lib/delivery";
import { parsePersonalization } from "@/lib/personalization";
import type { CartItem } from "@/types/cart";
export type DeliveryDetails = { name:string; email:string; phone:string; address:string; city:string; state:string };
export type OrderRequest = { key:string; items:CartItem[]; delivery:DeliveryDetails; expectedTotalKobo:number };
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const text=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v)?v.trim():null;
export function parseOrderRequest(value:unknown):OrderRequest|null {
 if(!record(value)||!keys(value,["key","items","delivery","expectedTotalKobo"])||typeof value.key!=="string"||!uuid.test(value.key)||!Array.isArray(value.items)||value.items.length<1||value.items.length>20||!record(value.delivery)||!keys(value.delivery,["name","email","phone","address","city","state"]))return null;
 const d=value.delivery;
 const name=text(d.name,100),email=text(d.email,254)?.toLowerCase(),phone=text(d.phone,30),address=text(d.address,200),city=text(d.city,100),state=text(d.state,40);
 if(!name||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!phone||!/^\+?[0-9]{7,15}$/.test(phone)||!address||!city||!state||!NIGERIAN_STATES.some(s=>s===state))return null;
 if(typeof value.expectedTotalKobo!=="number"||!Number.isSafeInteger(value.expectedTotalKobo)||value.expectedTotalKobo<1||value.expectedTotalKobo>1000000000)return null;
 const items:CartItem[]=[];const allocated=new Map<string,number>();let total=0;
 for(const item of value.items){
  if(!record(item)||!keys(item,["productId","selectedSize","quantity","personalization"])||typeof item.productId!=="string"||!uuid.test(item.productId)||typeof item.selectedSize!=="string"||!["XS","S","M","L","XL","2XL","3XL","4XL"].includes(item.selectedSize)||typeof item.quantity!=="number"||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10)return null;
  let personalization;
  if(item.personalization!==undefined){if(!record(item.personalization)||!keys(item.personalization,["name","number","font"]))return null;personalization=parsePersonalization(item.personalization);if(!personalization)return null;personalization={...personalization,font:personalization.font??"Classic"};}
  const id=item.productId.toLowerCase(),group=id+":"+item.selectedSize;const quantity=(allocated.get(group)??0)+item.quantity;allocated.set(group,quantity);total+=item.quantity;if(quantity>10||total>100)return null;
  items.push({productId:id,selectedSize:item.selectedSize as CartItem["selectedSize"],quantity:item.quantity,...(personalization?{personalization}:{})});
 }
 return {key:value.key.toLowerCase(),items,delivery:{name,email,phone,address,city,state},expectedTotalKobo:value.expectedTotalKobo};
}
