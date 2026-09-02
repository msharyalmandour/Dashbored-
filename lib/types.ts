export type CategoryId =
  | "supercars"
  | "sports"
  | "luxury"
  | "electric"
  | "suv"
  | "performance"
  | "classics";

export type FuelType = "Petrol" | "Electric" | "Hybrid";
export type DriveType = "RWD" | "AWD" | "FWD";
export type Environment =
  | "studio"
  | "mountain"
  | "night-city"
  | "desert"
  | "track"
  | "architecture";
export type Silhouette = "supercar" | "coupe" | "sedan" | "suv" | "classic";
export type Feeling = "speed" | "luxury" | "adventure" | "future" | "attention" | "technology";

export interface Car {
  slug: string;
  brand: string;
  model: string;
  category: CategoryId;
  year: number;
  priceFrom: number; // SAR
  horsepower: number;
  torqueNm: number;
  zeroToHundred: number; // seconds
  topSpeed: number; // km/h
  weightKg: number;
  fuelType: FuelType;
  transmission: string;
  drive: DriveType;
  environment: Environment;
  silhouette: Silhouette;
  hue: number; // 0-360, accent tint for this car's art
  tagline: string;
  description: string;
  interiorNote: string;
  feelings: Feeling[];
  related: string[]; // slugs
}

export interface Brand {
  name: string;
  country: string;
  founded: number;
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  line: string;
}

export interface Story {
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  hue: number;
}
