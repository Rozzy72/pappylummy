"use client";
import { useRef, useState, type ReactNode } from "react";
import { Box, Stack, Button, MobilePanel, NavLink, Icon } from "@sd/ui";
export function MobileMenu({
  links,
  children,
}: {
  links: readonly { href: string; label: string }[];
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    ref.current?.focus();
  }
  return (
    <Box
      visibility="mobile"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          close();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        ref={ref}
        variant="ghost"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "close" : "menu"} />
      </Button>
      <MobilePanel
        id="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        <Stack>
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} onClick={close}>
              {l.label}
            </NavLink>
          ))}
          {children}
        </Stack>
      </MobilePanel>
    </Box>
  );
}
