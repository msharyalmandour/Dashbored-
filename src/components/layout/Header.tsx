"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="p-2 text-foreground lg:hidden"
          aria-label="فتح القائمة"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex flex-col items-center leading-none">
          <span className="font-display gold-gradient-text text-2xl tracking-[0.2em] sm:text-3xl">
            {SITE.name}
          </span>
          <span className="mt-1 text-[10px] tracking-[0.35em] text-muted uppercase">
            {SITE.nameLatin}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm tracking-wide text-foreground/85 transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="بحث"
            className="hidden text-foreground/85 transition-colors hover:text-gold sm:block"
          >
            <Search size={20} />
          </button>
          <Link
            href="/cart"
            aria-label="سلة المشتريات"
            className="relative text-foreground/85 transition-colors hover:text-gold"
          >
            <ShoppingBag size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -left-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-background">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border transition-[max-height] duration-300 lg:hidden",
          menuOpen ? "max-h-80" : "max-h-0 border-t-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm text-foreground/85 transition-colors hover:bg-surface hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
