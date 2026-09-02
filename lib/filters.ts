import type { Car, CategoryId, DriveType, Feeling, FuelType } from "./types";

export type TransmissionKind = "Automatic" | "Dual-Clutch" | "Manual" | "Direct-Drive";

export function transmissionKind(car: Car): TransmissionKind {
  const t = car.transmission.toLowerCase();
  if (t.includes("dct")) return "Dual-Clutch";
  if (t.includes(" mt") || t === "manual") return "Manual";
  if (t.includes("single-speed") || t.includes("2-speed")) return "Direct-Drive";
  return "Automatic";
}

export const PRICE_BUCKETS = [
  { id: "u500", label: "Under 500K", test: (p: number) => p < 500000 },
  { id: "500-1m", label: "500K – 1M", test: (p: number) => p >= 500000 && p < 1000000 },
  { id: "1-2m", label: "1M – 2M", test: (p: number) => p >= 1000000 && p < 2000000 },
  { id: "2mp", label: "2M+", test: (p: number) => p >= 2000000 },
] as const;

export const HP_BUCKETS = [
  { id: "400", label: "400+ HP", test: (hp: number) => hp >= 400 },
  { id: "600", label: "600+ HP", test: (hp: number) => hp >= 600 },
  { id: "800", label: "800+ HP", test: (hp: number) => hp >= 800 },
  { id: "1000", label: "1000+ HP", test: (hp: number) => hp >= 1000 },
] as const;

export const SPRINT_BUCKETS = [
  { id: "u3", label: "Under 3.0s", test: (s: number) => s < 3.0 },
  { id: "u35", label: "Under 3.5s", test: (s: number) => s < 3.5 },
  { id: "u4", label: "Under 4.0s", test: (s: number) => s < 4.0 },
] as const;

export interface FilterState {
  query: string;
  brands: string[];
  categories: CategoryId[];
  fuels: FuelType[];
  drives: DriveType[];
  transmissions: TransmissionKind[];
  priceBuckets: string[];
  hpBuckets: string[];
  sprintBuckets: string[];
  years: number[];
  feelings: Feeling[];
}

export const emptyFilters: FilterState = {
  query: "",
  brands: [],
  categories: [],
  fuels: [],
  drives: [],
  transmissions: [],
  priceBuckets: [],
  hpBuckets: [],
  sprintBuckets: [],
  years: [],
  feelings: [],
};

export function hasActiveFilters(f: FilterState): boolean {
  return (
    f.query.trim().length > 0 ||
    f.brands.length > 0 ||
    f.categories.length > 0 ||
    f.fuels.length > 0 ||
    f.drives.length > 0 ||
    f.transmissions.length > 0 ||
    f.priceBuckets.length > 0 ||
    f.hpBuckets.length > 0 ||
    f.sprintBuckets.length > 0 ||
    f.years.length > 0 ||
    f.feelings.length > 0
  );
}

export function filterCars(cars: Car[], f: FilterState): Car[] {
  const q = f.query.trim().toLowerCase();

  return cars.filter((car) => {
    if (q) {
      const haystack = `${car.brand} ${car.model} ${car.category} ${car.tagline}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.brands.length && !f.brands.includes(car.brand)) return false;
    if (f.categories.length && !f.categories.includes(car.category)) return false;
    if (f.fuels.length && !f.fuels.includes(car.fuelType)) return false;
    if (f.drives.length && !f.drives.includes(car.drive)) return false;
    if (f.transmissions.length && !f.transmissions.includes(transmissionKind(car))) return false;
    if (f.priceBuckets.length) {
      const match = PRICE_BUCKETS.some((b) => f.priceBuckets.includes(b.id) && b.test(car.priceFrom));
      if (!match) return false;
    }
    if (f.hpBuckets.length) {
      const match = HP_BUCKETS.some((b) => f.hpBuckets.includes(b.id) && b.test(car.horsepower));
      if (!match) return false;
    }
    if (f.sprintBuckets.length) {
      const match = SPRINT_BUCKETS.some((b) => f.sprintBuckets.includes(b.id) && b.test(car.zeroToHundred));
      if (!match) return false;
    }
    if (f.years.length && !f.years.includes(car.year)) return false;
    if (f.feelings.length && !f.feelings.some((fl) => car.feelings.includes(fl))) return false;
    return true;
  });
}
