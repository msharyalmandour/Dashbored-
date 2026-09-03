/**
 * نموذج بيانات مطابق لجداول قاعدة بيانات مستقبلية (BRANDS, MODELS, VEHICLES,
 * PART_CATEGORIES, PARTS, PART_COMPATIBILITY, FAVORITES, CART_ITEMS).
 * البيانات هنا وهمية وثابتة (mock) بهذه المرحلة — بدون باك إند فعلي —
 * لكن الأشكال (types) مصممة لتُستبدل لاحقاً بجداول حقيقية بأقل تعديل ممكن.
 */

export interface Brand {
  id: string;
  name: string;
  nameEn: string;
  hue: number; // لتلوين رسومات العلامة (SVG) بشكل مميز لكل علامة
}

export interface Model {
  id: string;
  brandId: string;
  name: string;
  yearFrom: number;
  yearTo: number;
}

/** تمثيل "سيارتي" بعد اختيار العلامة + الموديل + السنة */
export interface Vehicle {
  brandId: string;
  modelId: string;
  year: number;
}

export type CategoryId =
  | "engine"
  | "exhaust"
  | "brakes"
  | "wheels"
  | "suspension"
  | "performance"
  | "exterior"
  | "interior"
  | "lighting";

export interface PartCategory {
  id: CategoryId;
  name: string;
  line: string;
  icon: string;
}

export interface PartSpec {
  label: string;
  value: string;
}

export interface Part {
  id: string;
  categoryId: CategoryId;
  name: string;
  brandLabel: string; // العلامة المصنّعة للقطعة (أصلي/بديل)، وليست علامة السيارة
  price: number;
  stockCount: number;
  hue: number;
  /** التوافق: النماذج المتوافقة + مدى السنوات (تبسيط لجدول PART_COMPATIBILITY) */
  compatibleModelIds: string[];
  yearFrom: number;
  yearTo: number;
  specs: PartSpec[];
  description: string;
  installNote: string;
  related: string[];
  popular?: boolean;
}

export function isCompatible(part: Part, vehicle: Vehicle): boolean {
  return (
    part.compatibleModelIds.includes(vehicle.modelId) &&
    vehicle.year >= part.yearFrom &&
    vehicle.year <= part.yearTo
  );
}
