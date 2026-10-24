import { createElement, Fragment, type ReactNode } from "react";

/** لغة الواجهة: العربي هو الأساس، والإنجليزي ترجمة مفتاحها النص العربي نفسه (أي نص بدون ترجمة يطلع عربي).
    تبديل اللغة يعيد تحميل الصفحة، فكل النصوص (حتى الثوابت على مستوى الملفات) تنحسب باللغة الجديدة. */
export type Lang = "ar" | "en";

const KEY = "wesync.lang";

function initialLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "ar") return v;
  } catch {
    // بدون تخزين: عربي
  }
  return "ar";
}

export const lang: Lang = initialLang();
export const isEn = lang === "en";
/** للتواريخ والأرقام */
export const locale = isEn ? "en-GB" : "ar-SA";

if (typeof document !== "undefined") {
  document.documentElement.lang = lang;
  document.documentElement.dir = isEn ? "ltr" : "rtl";
}

let dict: Record<string, string> = {};
/** صفحات البحث (المقترح، المنهجية، الأدبيات، الإحصاء) إنجليزي دايمًا — قاموسها الصغير يتحمّل حتى بالعربي */
let researchDict: Record<string, string> = {};

/** يحمّل قاموس الإنجليزي قبل تشغيل التطبيق: كامل بالإنجليزي، وقاموس صفحات البحث بس بالعربي */
export async function loadDictionary(): Promise<void> {
  if (!isEn) {
    researchDict = (await import("../i18n/research-en.json")).default as Record<string, string>;
    return;
  }
  const files = import.meta.glob<{ default: Record<string, string> }>("../i18n/en/*.json");
  const parts = await Promise.all(Object.values(files).map((load) => load()));
  dict = Object.assign({}, ...parts.map((p) => p.default));
  researchDict = dict;
}

export function setLang(next: Lang) {
  if (next === lang) return;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // ما نقدر نحفظ: نبدّل لهالزيارة بس
  }
  window.location.reload();
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function lookupIn(d: Record<string, string>, s: string): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  if (!m || !m[2]) return s;
  const hit = d[norm(m[2])];
  return hit === undefined ? s : `${m[1]}${hit}${m[3]}`;
}

const lookup = (s: string) => (isEn ? lookupIn(dict, s) : s);
const lookupResearch = (s: string) => lookupIn(researchDict, s);

function fill(out: string, args: unknown[]): string {
  if (!args.length) return out;
  return out.replace(/\{(\d+)\}/g, (_, i: string) => {
    const v = args[Number(i)];
    return v === null || v === undefined || v === false ? "" : String(v);
  });
}

function fillNodes(out: string, args: ReactNode[]): ReactNode {
  if (!args.length) return out;
  const pieces = out.split(/\{(\d+)\}/);
  return createElement(Fragment, null, ...pieces.map((p, i) => (i % 2 ? args[Number(p)] : p)));
}

/** نص مترجم. {0} {1}… أماكن القيم */
export function tr(s: string, ...args: unknown[]): string {
  return fill(lookup(s), args);
}

/** مثل tr لكن القيم ممكن تكون عناصر React (روابط، خط عريض…) */
export function trx(s: string, ...args: ReactNode[]): ReactNode {
  return fillNodes(lookup(s), args);
}

/** نص صفحات البحث: إنجليزي بأي لغة (منهج التمريض بالإنجليزي) */
export function tre(s: string, ...args: unknown[]): string {
  return fill(lookupResearch(s), args);
}

export function trxe(s: string, ...args: ReactNode[]): ReactNode {
  return fillNodes(lookupResearch(s), args);
}
