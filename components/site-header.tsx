"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Club, Menu, X } from "lucide-react";
import { useState } from "react";
import siteMetadata from "@/data/site-metadata.json";
import { formatUpdatedAt } from "@/lib/format";
import type { SiteMetadata } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

const generatedMetadata: SiteMetadata = siteMetadata;

const navigation = [
  { label: "Home", href: "/" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Cash games", href: "/cash-games" },
  { label: "Standings", href: "/standings" },
  { label: "Players", href: "/players" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between gap-3 sm:gap-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="A-Town Poker home"
            onClick={() => setOpen(false)}
          >
            <Club className="size-4.5 fill-current text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight">A-Town Poker</span>
          </Link>

          <div className="shrink-0 border-l pl-2.5 sm:pl-3">
            <p className="text-[10px] font-medium leading-none text-muted-foreground">
              Last updated
            </p>
            <time
              dateTime={generatedMetadata.lastUpdated}
              className="numeric mt-1 block whitespace-nowrap text-[11px] font-medium leading-none text-foreground"
            >
              <span className="sm:hidden">
                {formatUpdatedAt(generatedMetadata.lastUpdated, true)}
              </span>
              <span className="hidden sm:inline">
                {formatUpdatedAt(generatedMetadata.lastUpdated)}
              </span>
            </time>
          </div>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isActive(item.href) && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid size-10 place-items-center rounded-lg border bg-card text-foreground shadow-sm lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav className="page-shell grid gap-1 border-t py-3 lg:hidden" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground",
                isActive(item.href) && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
