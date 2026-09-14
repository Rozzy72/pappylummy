import Link from "next/link";

const sections = [
  {
    title: "Shop",
    links: [
      { label: "New Arrivals", href: "/shop" },
      { label: "Club Jerseys", href: "/clubs" },
      { label: "International Jerseys", href: "#" },
      { label: "Retro Jerseys", href: "#" },
    ],
  },
  {
    title: "Customer Service",
    links: [
      { label: "Contact", href: "#" },
      { label: "Delivery", href: "#" },
      { label: "Returns", href: "#" },
      { label: "Size Guide", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Account", href: "/account" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="sm:col-span-3 lg:col-span-1">
            <Link href="/" className="rounded-sm text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4">
              Naija Kits
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600">
              Football jerseys for every club, country and era.
            </p>
          </div>
          {sections.map((section) => (
            <nav key={section.title} aria-label={`Footer ${section.title}`}>
              <h2 className="text-sm font-semibold">{section.title}</h2>
              <ul className="mt-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center rounded-sm text-sm text-neutral-600 hover:text-neutral-950 hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-neutral-200 pt-6 text-xs leading-5 text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Naija Kits</p>
          <p>Built for football fans across Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
