export const SITE = {
  name: "أثر",
  nameLatin: "ATHAR",
  tagline: "دار عطور فاخرة",
  description:
    "عطور فاخرة مُركّبة بعناية من أجود الخامات العالمية، لتترك أثراً لا يُنسى.",
  phone: "+966500000000",
  email: "info@athar-perfume.sa",
  instagram: "https://instagram.com",
  whatsapp: "https://wa.me/966500000000",
  shippingFee: 25,
  freeShippingThreshold: 300,
} as const;

export const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/shop", label: "المتجر" },
  { href: "/shop?gender=men", label: "رجالي" },
  { href: "/shop?gender=women", label: "نسائي" },
  { href: "/#story", label: "قصتنا" },
] as const;

export const SAUDI_CITIES = [
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "الخبر",
  "الطائف",
  "تبوك",
  "أبها",
  "بريدة",
  "خميس مشيط",
  "حائل",
] as const;
