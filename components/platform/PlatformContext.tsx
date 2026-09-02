"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { emptyFilters, type FilterState } from "@/lib/filters";
import type { CategoryId, Feeling } from "@/lib/types";

const FAVORITES_KEY = "velocita:favorites";

type ArrayFilterKey = "brands" | "categories" | "fuels" | "drives" | "transmissions" | "priceBuckets" | "hpBuckets" | "sprintBuckets";

interface PlatformState {
  filters: FilterState;
  setQuery: (q: string) => void;
  toggleFilterValue: (key: ArrayFilterKey, value: string) => void;
  toggleYear: (year: number) => void;
  clearFilters: () => void;
  setCategoryOnly: (cat: CategoryId) => void;
  setFeelingOnly: (feeling: Feeling) => void;

  favorites: Set<string>;
  toggleFavorite: (slug: string) => void;
  favoritesOpen: boolean;
  setFavoritesOpen: (open: boolean) => void;

  compare: string[];
  toggleCompare: (slug: string) => void;
  isComparing: (slug: string) => boolean;

  detailSlug: string | null;
  openDetail: (slug: string) => void;
  closeDetail: () => void;

  scrollToDiscover: () => void;
}

const PlatformCtx = createContext<PlatformState | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [detailSlug, setDetailSlug] = useState<string | null>(null);

  useEffect(() => {
    // One-time hydration from localStorage, intentionally deferred to the
    // client so server and first-paint markup match (avoids a hydration
    // mismatch on favorite state).
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setFavorites(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  const setQuery = useCallback((q: string) => {
    setFilters((f) => ({ ...f, query: q }));
  }, []);

  const toggleFilterValue = useCallback((key: ArrayFilterKey, value: string) => {
    setFilters((f) => {
      const list = f[key] as string[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, [key]: next };
    });
  }, []);

  const toggleYear = useCallback((year: number) => {
    setFilters((f) => {
      const next = f.years.includes(year) ? f.years.filter((y) => y !== year) : [...f.years, year];
      return { ...f, years: next };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters);
  }, []);

  const setCategoryOnly = useCallback((cat: CategoryId) => {
    setFilters({ ...emptyFilters, categories: [cat] });
  }, []);

  const setFeelingOnly = useCallback((feeling: Feeling) => {
    setFilters({ ...emptyFilters, feelings: [feeling] });
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((slug: string) => {
    setCompare((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 3) return prev;
      return [...prev, slug];
    });
  }, []);

  const isComparing = useCallback((slug: string) => compare.includes(slug), [compare]);

  const openDetail = useCallback((slug: string) => setDetailSlug(slug), []);
  const closeDetail = useCallback(() => setDetailSlug(null), []);

  const scrollToDiscover = useCallback(() => {
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const value = useMemo<PlatformState>(
    () => ({
      filters,
      setQuery,
      toggleFilterValue,
      toggleYear,
      clearFilters,
      setCategoryOnly,
      setFeelingOnly,
      favorites,
      toggleFavorite,
      favoritesOpen,
      setFavoritesOpen,
      compare,
      toggleCompare,
      isComparing,
      detailSlug,
      openDetail,
      closeDetail,
      scrollToDiscover,
    }),
    [
      filters,
      setQuery,
      toggleFilterValue,
      toggleYear,
      clearFilters,
      setCategoryOnly,
      setFeelingOnly,
      favorites,
      toggleFavorite,
      favoritesOpen,
      compare,
      toggleCompare,
      isComparing,
      detailSlug,
      openDetail,
      closeDetail,
      scrollToDiscover,
    ]
  );

  return <PlatformCtx.Provider value={value}>{children}</PlatformCtx.Provider>;
}

export function usePlatform(): PlatformState {
  const ctx = useContext(PlatformCtx);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
