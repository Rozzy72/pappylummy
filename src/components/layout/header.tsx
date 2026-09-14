import Link from "next/link";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { CartLink } from "@/components/cart/cart-link";
import { WishlistLink } from "@/components/wishlist/wishlist-link";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/clubs", label: "Clubs" },
  { href: "/categories", label: "Categories" },
] as const;

const accountLinks = [
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account", label: "Account" },
] as const;

const linkStyle =
  "min-h-11 items-center rounded-md px-2 text-sm font-medium text-neutral-600 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2";

export function Header() {
  return (
    <header className="relative z-10 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          href="/"
          aria-label="Naija Kits home"
          className="w-fit rounded-sm text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Naija Kits<span className="sr-only"> home</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden lg:block">
          <ul className="flex items-center gap-4">
            {navigation.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={`inline-flex ${linkStyle}`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 lg:justify-self-end">
          <button
            type="button"
            disabled
            title="Search coming soon"
            aria-label="Search (coming soon)"
            className="hidden size-11 items-center justify-center rounded-md text-neutral-400 disabled:cursor-not-allowed lg:inline-flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>
          </button>
          <WishlistLink className={`${linkStyle} hidden lg:inline-flex`} />
          <CartLink className={`inline-flex ${linkStyle}`} />
          <Link href="/account" className={`${linkStyle} hidden lg:inline-flex`}>
            Account
          </Link>
          <MobileMenu links={[...navigation, ...accountLinks]} />
        </div>
      </div>
    </header>
  );
}
