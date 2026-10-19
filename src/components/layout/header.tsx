import { Box, Flex, SiteHeader, Wordmark, NavLink, HeaderLayout, MobileStoreNav, StoreIconLink } from "@sd/ui";
import { StoreNavigation } from "./store-navigation";
import { isHeaderAuthenticated } from "@/lib/auth/header-auth";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { CartLink } from "@/components/cart/cart-link";
import { WishlistLink } from "@/components/wishlist/wishlist-link";
const navigation = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/clubs", label: "Clubs" },
  { href: "/shop?teamType=national", label: "National Teams" },
  { href: "/shop?category=retro", label: "Retro" },
  { href: "/customize", label: "Customize" },
  { href: "/#new-arrivals", label: "New In" },
];
export async function Header() {
  const authenticated = await isHeaderAuthenticated();
  const accountLink = authenticated
    ? { href: "/account", label: "Account" }
    : { href: "/login", label: "Sign in" };
  return (
    <SiteHeader>
      <HeaderLayout brand={<Wordmark />} navigation={<Box as="nav" visibility="desktop" aria-label="Main navigation"><StoreNavigation links={navigation}/></Box>} tools={<Flex gap="3"><Box visibility="desktop"><Flex gap="3"><StoreIconLink href="/shop" label="Browse jerseys" icon="search" /><StoreIconLink href={accountLink.href} label={accountLink.label} icon="user" />{authenticated && <SignOutForm />}</Flex></Box><CartLink icon /><MobileMenu links={[...navigation,{href:"/wishlist",label:"Wishlist"},accountLink]}>{authenticated && <SignOutForm />}</MobileMenu></Flex>} />
      {/* The same auth, cart and disclosure components retain their existing behaviour. */}
      <MobileStoreNav><NavLink href="/">Home</NavLink><NavLink href="/shop">Shop</NavLink><WishlistLink /><NavLink href={accountLink.href}>{accountLink.label}</NavLink><CartLink /></MobileStoreNav>
    </SiteHeader>
  );
}
