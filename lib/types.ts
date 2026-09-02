export type PartCategoryId =
  | "exterior"
  | "engine"
  | "tires"
  | "brakes"
  | "suspension";

export interface PartCategory {
  id: PartCategoryId;
  label: string;
  labelEn: string;
}

export interface Part {
  id: string;
  name: string;
  categoryId: PartCategoryId;
  /** موضع النقطة التفاعلية داخل رسم السيارة (viewBox 0 0 800 320) */
  hotspot: { x: number; y: number };
  /** مركز الحركة (pan+zoom) عند فتح القطعة — قد يختلف قليلاً عن موضع النقطة */
  focus: { x: number; y: number; scale: number };
  description: string;
  relatedPartIds: string[];
  /** كلمات مفتاحية لمحاكاة بحث اللغة الطبيعية (mock NLP) */
  keywords: string[];
}

export interface CompatiblePartsSummary {
  categoryId: PartCategoryId;
  categoryLabel: string;
  count: number;
}

export interface Car {
  make: string;
  model: string;
  year: number;
  trim: string;
  engine: string;
  vin: string;
  compatibleParts: CompatiblePartsSummary[];
}

export interface VinCheckResult {
  car: Car;
}

export interface ImageRecognitionResult {
  partName: string;
  categoryId: PartCategoryId;
  confidence: number;
  compatibleParts: {
    name: string;
    brand: string;
    price: number;
    inStock: boolean;
    stockCount: number;
  }[];
}

export type OriginId = "japanese" | "chinese" | "german";

export interface BrandOrigin {
  id: OriginId;
  label: string;
  flag: string;
  brands: string[];
  partsAvailable: number;
}
