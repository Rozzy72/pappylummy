"use client";
import {usePathname} from "next/navigation";
import {Flex,NavLink} from "@sd/ui";
export function StoreNavigation({links}:{links:readonly {href:string;label:string}[]}){const pathname=usePathname();return <Flex gap="4">{links.map(link=><NavLink key={link.href} href={link.href} emphasis={link.href===pathname} aria-current={link.href===pathname?"page":undefined}>{link.label}</NavLink>)}</Flex>;}
