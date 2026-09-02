"use client";

import { useEffect, useState } from "react";
import { usePlatform } from "./PlatformContext";
import FavoritesPanel from "./FavoritesPanel";

const LINKS = [
  { href: "#discover", label: "Discover" },
  { href: "#brands", label: "Brands" },
  { href: "#categories", label: "Categories" },
  { href: "#compare", label: "Compare" },
  { href: "#stories", label: "Stories" },
];

export default function Nav() {
  const [condensed, setCondensed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { favorites, setFavoritesOpen, scrollToDiscover } = usePlatform();

  useEffect(() => {
    function onScroll() {
      setCondensed(window.scrollY > 48);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          condensed ? "py-2" : "py-5"
        }`}
      >
        <div
          className={`mx-auto flex max-w-[1400px] items-center justify-between rounded-full px-6 transition-all duration-300 ${
            condensed
              ? "mx-4 border border-line bg-bg-2/80 py-2.5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              : "border border-transparent bg-transparent py-3"
          }`}
        >
          <a href="#top" className="flex items-center gap-2 shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 16 L7 7 L17 7 L22 16 L19 16 L17 12 L7 12 L5 16 Z" fill="var(--accent)" />
            </svg>
            <span className="font-display text-lg tracking-wide text-text">VELOCITÀ</span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] font-medium tracking-wide text-text-soft transition-colors hover:text-accent"
              >
                {l.label.toUpperCase()}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                scrollToDiscover();
                window.setTimeout(() => document.getElementById("search-input")?.focus(), 500);
              }}
              className="grid h-9 w-9 place-items-center rounded-full text-text-soft transition-colors hover:bg-bg-3 hover:text-accent"
            >
              <SearchIcon />
            </button>

            <button
              type="button"
              aria-label="Favorites"
              onClick={() => setFavoritesOpen(true)}
              className="relative grid h-9 w-9 place-items-center rounded-full text-text-soft transition-colors hover:bg-bg-3 hover:text-accent"
            >
              <HeartIcon filled={favorites.size > 0} />
              {favorites.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-data text-[10px] font-bold text-accent-ink">
                  {favorites.size}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label="Profile"
                onClick={() => setProfileOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full text-text-soft transition-colors hover:bg-bg-3 hover:text-accent"
              >
                <ProfileIcon />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-lg border border-line bg-bg-2 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <p className="text-sm text-text">Guest</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-soft">
                    Sign in to save your garage, comparisons, and quiz results across visits.
                  </p>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-full bg-accent py-2 text-xs font-semibold text-accent-ink"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <FavoritesPanel />
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? "var(--accent)" : "none"} aria-hidden="true">
      <path
        d="M12 20 C7 16 2 12.5 2 8.2 C2 5.3 4.3 3 7.2 3 C9 3 10.6 3.9 12 5.5 C13.4 3.9 15 3 16.8 3 C19.7 3 22 5.3 22 8.2 C22 12.5 17 16 12 20 Z"
        stroke={filled ? "var(--accent)" : "currentColor"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20 C4 16 7.5 14 12 14 C16.5 14 20 16 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
