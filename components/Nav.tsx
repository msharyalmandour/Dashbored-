"use client";

import { usePlatform } from "./catalog/PlatformContext";

const links = [
  { href: "#selector", label: "اختر سيارتك" },
  { href: "#categories", label: "الفئات" },
  { href: "#brands", label: "الماركات" },
];

export default function Nav() {
  const { favorites, cartCount, setFavoritesOpen, setCartOpen } = usePlatform();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-baseline gap-1">
          <span className="font-editorial text-3xl font-semibold text-text">
            دِقّة
          </span>
          <span className="font-data text-[10px] uppercase tracking-[0.2em] text-text-soft">
            diqa
          </span>
        </a>
        <ul className="hidden items-center gap-8 sm:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-text-soft transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFavoritesOpen(true)}
            aria-label="المفضلة"
            className="relative grid h-10 w-10 place-items-center rounded-full text-text-soft transition-colors hover:bg-panel hover:text-accent"
          >
            <span className="text-lg">♡</span>
            {favorites.size > 0 && (
              <span className="absolute -left-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-data text-[10px] font-bold text-bg">
                {favorites.size}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="سلة المشتريات"
            className="relative grid h-10 w-10 place-items-center rounded-full text-text-soft transition-colors hover:bg-panel hover:text-accent"
          >
            <span className="text-lg">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -left-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-data text-[10px] font-bold text-bg">
                {cartCount}
              </span>
            )}
          </button>
          <a
            href="#selector"
            className="mr-1 hidden rounded-diqa-sm border border-primary bg-primary px-4 py-2 text-sm font-semibold text-bg transition-all hover:scale-105 hover:bg-transparent hover:text-primary sm:inline-block"
          >
            اختر سيارتك
          </a>
        </div>
      </nav>
    </header>
  );
}
