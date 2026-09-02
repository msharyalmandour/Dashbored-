import type {
  Car,
  ImageRecognitionResult,
  Part,
  PartCategory,
  VinCheckResult,
} from "./types";

export const partCategories: PartCategory[] = [
  { id: "exterior", label: "خارجية", labelEn: "Exterior" },
  { id: "engine", label: "المحرك", labelEn: "Engine" },
  { id: "tires", label: "الإطارات", labelEn: "Tires" },
  { id: "brakes", label: "الفرامل", labelEn: "Brakes" },
  { id: "suspension", label: "التعليق", labelEn: "Suspension" },
];

/**
 * إحداثيات النقاط التفاعلية والتركيز مبنية على نفس هندسة رسم السيارة
 * في CarDiagram.tsx (viewBox 0 0 800 320). أي تعديل على شكل السيارة
 * يتطلب مراجعة هذه الإحداثيات.
 */
export const parts: Part[] = [
  {
    id: "front-bumper",
    name: "مصدّة أمامية",
    categoryId: "exterior",
    hotspot: { x: 722, y: 225 },
    focus: { x: 722, y: 225, scale: 3 },
    description:
      "المصدّة الأمامية تمتص الصدمات الخفيفة وتحمي هيكل السيارة والمبرّد عند الاصطدام.",
    relatedPartIds: ["front-lights", "radiator"],
    keywords: ["مصدة", "مصدة امامية", "صدام", "bumper", "front bumper"],
  },
  {
    id: "rear-bumper",
    name: "مصدّة خلفية",
    categoryId: "exterior",
    hotspot: { x: 78, y: 225 },
    focus: { x: 78, y: 225, scale: 3 },
    description: "المصدّة الخلفية تحمي هيكل السيارة من الخلف وتحمل حساسات الرجوع غالباً.",
    relatedPartIds: ["rear-lights"],
    keywords: ["مصدة خلفية", "صدام خلفي", "rear bumper"],
  },
  {
    id: "front-lights",
    name: "إضاءة أمامية",
    categoryId: "exterior",
    hotspot: { x: 712, y: 187 },
    focus: { x: 712, y: 187, scale: 3.4 },
    description: "المصابيح الأمامية (الشمعات) توفر الإضاءة الرئيسية والإشارات الأمامية.",
    relatedPartIds: ["front-bumper"],
    keywords: ["ضو", "ضوء", "شمعة", "شمعات", "امامي", "headlight", "لمبة"],
  },
  {
    id: "rear-lights",
    name: "إضاءة خلفية",
    categoryId: "exterior",
    hotspot: { x: 88, y: 187 },
    focus: { x: 88, y: 187, scale: 3.4 },
    description: "المصابيح الخلفية تشمل إشارة الانعطاف وضوء الفرامل والإضاءة الخلفية.",
    relatedPartIds: ["rear-bumper", "rear-brakes"],
    keywords: ["ضو خلفي", "شمعة خلفية", "taillight", "خلفي"],
  },
  {
    id: "mirrors",
    name: "مرايا جانبية",
    categoryId: "exterior",
    hotspot: { x: 430, y: 150 },
    focus: { x: 430, y: 150, scale: 3.6 },
    description: "المرايا الجانبية تعطي رؤية جانبية وخلفية، وقد تشمل إشارة انعطاف مدمجة.",
    relatedPartIds: [],
    keywords: ["مراية", "مرايا", "مرآة", "mirror"],
  },
  {
    id: "engine",
    name: "المحرك",
    categoryId: "engine",
    hotspot: { x: 600, y: 212 },
    focus: { x: 615, y: 195, scale: 2.4 },
    description: "المحرك هو قلب السيارة ومصدر الحركة، ويحدد نوعه توافق الكثير من القطع الأخرى.",
    relatedPartIds: ["air-filter", "radiator"],
    keywords: ["محرك", "موتور", "engine", "وين المحرك"],
  },
  {
    id: "air-filter",
    name: "فلتر الهواء",
    categoryId: "engine",
    hotspot: { x: 645, y: 192 },
    focus: { x: 645, y: 192, scale: 3.6 },
    description: "فلتر الهواء ينقّي الهواء الداخل للمحرك ويحمي الاسطوانات من الأتربة.",
    relatedPartIds: ["engine"],
    keywords: ["فلتر", "فلتر هواء", "air filter", "فلتر مكينة"],
  },
  {
    id: "radiator",
    name: "الرديتر",
    categoryId: "engine",
    hotspot: { x: 686, y: 210 },
    focus: { x: 686, y: 210, scale: 3.4 },
    description: "الرديتر (المبرّد) يخفض حرارة سائل التبريد ويمنع سخونة المحرك.",
    relatedPartIds: ["engine", "front-bumper"],
    keywords: ["رديتر", "مبرد", "تبريد", "radiator", "وين الرديتر"],
  },
  {
    id: "front-tire",
    name: "إطار أمامي",
    categoryId: "tires",
    hotspot: { x: 595, y: 236 },
    focus: { x: 595, y: 236, scale: 2.8 },
    description: "الإطارات الأمامية تتحمل التوجيه والكبح الأساسي وتحتاج فحص دوري للضغط والتآكل.",
    relatedPartIds: ["front-brakes", "front-suspension"],
    keywords: ["اطار", "دولاب", "عجلة", "امامي", "tire", "wheel"],
  },
  {
    id: "rear-tire",
    name: "إطار خلفي",
    categoryId: "tires",
    hotspot: { x: 215, y: 236 },
    focus: { x: 215, y: 236, scale: 2.8 },
    description: "الإطارات الخلفية تحافظ على ثبات السيارة وتوزيع الوزن أثناء القيادة.",
    relatedPartIds: ["rear-brakes", "rear-suspension"],
    keywords: ["اطار خلفي", "دولاب خلفي", "rear tire"],
  },
  {
    id: "front-brakes",
    name: "فرامل أمامية",
    categoryId: "brakes",
    hotspot: { x: 615, y: 236 },
    focus: { x: 605, y: 236, scale: 3.6 },
    description: "الفرامل الأمامية تتحمل الجزء الأكبر من قوة الكبح وتشمل الأقراص والتيل.",
    relatedPartIds: ["front-tire"],
    keywords: ["فرامل", "فرامل امامية", "تيل", "دسك", "brake", "وين الفرامل"],
  },
  {
    id: "rear-brakes",
    name: "فرامل خلفية",
    categoryId: "brakes",
    hotspot: { x: 235, y: 236 },
    focus: { x: 225, y: 236, scale: 3.6 },
    description: "الفرامل الخلفية تعمل مع الأمامية لتوزيع قوة الكبح بأمان.",
    relatedPartIds: ["rear-tire"],
    keywords: ["فرامل خلفية", "تيل خلفي", "rear brake"],
  },
  {
    id: "front-suspension",
    name: "تعليق أمامي",
    categoryId: "suspension",
    hotspot: { x: 595, y: 198 },
    focus: { x: 595, y: 205, scale: 3.4 },
    description: "نظام التعليق الأمامي (المساعدات والزنبركات) يمتص اهتزازات الطريق ويحافظ على ثبات القيادة.",
    relatedPartIds: ["front-tire"],
    keywords: ["تعليق", "مساعد", "مساعدات", "زنبرك", "suspension", "شوك"],
  },
  {
    id: "rear-suspension",
    name: "تعليق خلفي",
    categoryId: "suspension",
    hotspot: { x: 215, y: 198 },
    focus: { x: 215, y: 205, scale: 3.4 },
    description: "نظام التعليق الخلفي يوازن حمل السيارة ويحسّن ثبات المقصورة الخلفية.",
    relatedPartIds: ["rear-tire"],
    keywords: ["تعليق خلفي", "مساعد خلفي", "rear suspension"],
  },
];

export const partById = (id: string): Part | undefined =>
  parts.find((p) => p.id === id);

export const partsByCategory = (categoryId: string): Part[] =>
  parts.filter((p) => p.categoryId === categoryId);

/** محاكاة نتيجة فحص رقم الشاصي — بيانات وهمية ثابتة للعرض التجريبي فقط */
export function mockVinCheck(vin: string): VinCheckResult {
  const car: Car = {
    make: "تويوتا",
    model: "كامري",
    year: 2021,
    trim: "GLE",
    engine: "4 سلندر 2.5 لتر",
    vin: vin.toUpperCase(),
    compatibleParts: [
      { categoryId: "engine", categoryLabel: "المحرك", count: 42 },
      { categoryId: "brakes", categoryLabel: "الفرامل", count: 18 },
      { categoryId: "suspension", categoryLabel: "التعليق", count: 26 },
      { categoryId: "tires", categoryLabel: "الإطارات", count: 12 },
      { categoryId: "exterior", categoryLabel: "خارجية", count: 35 },
    ],
  };
  return { car };
}

/** محاكاة نتيجة التعرف على صورة القطعة — بيانات وهمية ثابتة للعرض التجريبي فقط */
export function mockImageRecognition(): ImageRecognitionResult {
  return {
    partName: "طقم تيل فرامل أمامي",
    categoryId: "brakes",
    confidence: 0.93,
    compatibleParts: [
      { name: "تيل فرامل أمامي — أصلي", brand: "Toyota Genuine", price: 185 },
      { name: "تيل فرامل أمامي — بديل ممتاز", brand: "Brembo", price: 240 },
      { name: "تيل فرامل أمامي — اقتصادي", brand: "Bosch", price: 130 },
    ],
  };
}
