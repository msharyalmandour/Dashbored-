"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CategoryId, Vehicle } from "@/lib/types";

const FAVORITES_KEY = "diqa:favorites";
const CART_KEY = "diqa:cart";

interface PlatformState {
  vehicle: Vehicle | null;
  setVehicle: (v: Vehicle | null) => void;

  categoryFilter: CategoryId | null;
  setCategoryFilter: (c: CategoryId | null) => void;
  brandFilter: string | null;
  setBrandFilter: (b: string | null) => void;

  favorites: Set<string>;
  toggleFavorite: (partId: string) => void;
  favoritesOpen: boolean;
  setFavoritesOpen: (v: boolean) => void;

  cart: Record<string, number>;
  addToCart: (partId: string) => void;
  removeFromCart: (partId: string) => void;
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;

  openPartId: string | null;
  openPart: (id: string) => void;
  closePart: () => void;
}

const PlatformCtx = createContext<PlatformState | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [openPartId, setOpenPartId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawFav = window.localStorage.getItem(FAVORITES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (rawFav) setFavorites(new Set(JSON.parse(rawFav)));
      const rawCart = window.localStorage.getItem(CART_KEY);
      if (rawCart) setCart(JSON.parse(rawCart));
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

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const toggleFavorite = useCallback((partId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  }, []);

  const addToCart = useCallback((partId: string) => {
    setCart((prev) => ({ ...prev, [partId]: (prev[partId] ?? 0) + 1 }));
  }, []);

  const removeFromCart = useCallback((partId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[partId];
      return next;
    });
  }, []);

  const openPart = useCallback((id: string) => setOpenPartId(id), []);
  const closePart = useCallback(() => setOpenPartId(null), []);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, n) => sum + n, 0),
    [cart]
  );

  const value = useMemo<PlatformState>(
    () => ({
      vehicle,
      setVehicle,
      categoryFilter,
      setCategoryFilter,
      brandFilter,
      setBrandFilter,
      favorites,
      toggleFavorite,
      favoritesOpen,
      setFavoritesOpen,
      cart,
      addToCart,
      removeFromCart,
      cartCount,
      cartOpen,
      setCartOpen,
      openPartId,
      openPart,
      closePart,
    }),
    [
      vehicle,
      categoryFilter,
      brandFilter,
      favorites,
      toggleFavorite,
      favoritesOpen,
      cart,
      addToCart,
      removeFromCart,
      cartCount,
      cartOpen,
      openPartId,
      openPart,
      closePart,
    ]
  );

  return <PlatformCtx.Provider value={value}>{children}</PlatformCtx.Provider>;
}

export function usePlatform(): PlatformState {
  const ctx = useContext(PlatformCtx);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
