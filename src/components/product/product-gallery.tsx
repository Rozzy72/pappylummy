"use client";
import {useState} from "react";
import {Stack,ImageFrame,Text,ProductGalleryPanel,GalleryLayout,Button} from "@sd/ui";
import {ProductImage} from "./product-image";
import type {Product} from "@/types/product";
import {getProductGallery,productPlaceholder} from "@/utils/product-image";
export function ProductGallery({product}:{product:Pick<Product,"id"|"name"|"image"|"images">}){
 const images=getProductGallery(product.image,product.images,product.id),[selected,setSelected]=useState(0);
 const index=selected<images.length?selected:0;
 const alt=(src:string,i:number)=>src===productPlaceholder?"Placeholder for "+product.name+"; product photography coming soon":product.name+", view "+(i+1);
 return <ProductGalleryPanel><Stack as="section" aria-label={"Images of "+product.name} gap="3"><GalleryLayout rail={images.map((src,i)=><Button key={src} variant={index===i?"solid":"surface"} aria-label={"Show view "+(i+1)+" of "+product.name} aria-pressed={index===i} onClick={()=>setSelected(i)}><ImageFrame kind="thumb"><ProductImage reference={src} productId={product.id} alt={alt(src,i)} fill sizes="64px"/></ImageFrame></Button>)}><ImageFrame kind="detail"><ProductImage reference={images[index]} productId={product.id} alt={alt(images[index],index)} loading="eager" fill sizes="(min-width:1024px) 44vw, 90vw"/></ImageFrame></GalleryLayout><Text look="small" muted>Collection imagery is a development preview.</Text></Stack></ProductGalleryPanel>;
}
