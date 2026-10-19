"use client";
import {useId,useState} from "react";
import {Button,CardShopping,Flex,Text} from "@sd/ui";
import {useCartStore,MAX_CART_QUANTITY} from "@/store/cart-store";
import {useCartHydration} from "@/components/cart/use-cart-hydration";
import type {Product,JerseySize} from "@/types/product";
/** Uses the existing validated cart action; no prices or merchandise are persisted. */
export function ProductCardActions({product}:{product:Product}){
 const [size,setSize]=useState<JerseySize|null>(null),[feedback,setFeedback]=useState("");
 const hydrated=useCartHydration(),addItem=useCartStore(s=>s.addItem),helpId=useId();
 return <CardShopping><fieldset disabled={!product.inStock||!product.sizes.length}><legend>Size for {product.name}</legend><Flex gap="1" wrap>{product.sizes.map(value=><Button key={value} size="1" variant={size===value?"solid":"surface"} aria-pressed={size===value} aria-label={value+" — "+product.name} onClick={()=>{setSize(value);setFeedback("");}}>{value}</Button>)}</Flex></fieldset><Button fullWidth size="1" aria-describedby={helpId} disabled={!hydrated||!product.inStock||!product.sizes.length} onClick={()=>{if(!size){setFeedback("Choose a size first.");return;}setFeedback(addItem(product,size,1)?"Added to cart · "+size:"Cart limit: "+MAX_CART_QUANTITY+" per jersey and size.");}}>{product.inStock?"Add to Cart":"Out of stock"}</Button><Text id={helpId} look="small" role="status">{feedback}</Text></CardShopping>;
}
