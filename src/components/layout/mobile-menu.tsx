"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

type MobileMenuProps = {
  children?: ReactNode;
  links: readonly { href: string; label: string }[];
};

export function MobileMenu({ links, children }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setIsOpen(false);
    toggleRef.current?.focus();
  }

  return (
    <div
      className="lg:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          closeMenu();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-11 items-center justify-center rounded-md hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-6"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            d={isOpen ? "M6 6l12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!isOpen}
        className="absolute inset-x-0 top-full z-20 max-h-[70dvh] overflow-y-auto border-b border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-6"
      >
        <ul className="mx-auto max-w-7xl space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeMenu}
                className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        {children && <div className="mx-auto max-w-7xl px-3">{children}</div>}
      </nav>
    </div>
  );
}
