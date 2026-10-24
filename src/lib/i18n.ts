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

/** يحمّل قاموس الإنجليزي قبل تشغيل التطبيق (للعربي ما يحمّل شي) */
export async function loadDictionary(): Promise<void> {
  if (!isEn) return;
  const files = import.meta.glob<{ default: Record<string, string> }>("../i18n/en/*.json");
  const parts = await Promise.all(Object.values(files).map((load) => load()));
  dict = Object.assign({}, ...parts.map((p) => p.default));
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

function lookup(s: string): string {
  if (!isEn) return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  if (!m || !m[2]) return s;
  const hit = dict[norm(m[2])];
  return hit === undefined ? s : `${m[1]}${hit}${m[3]}`;
}

/** نص مترجم. {0} {1}… أماكن القيم */
export function tr(s: string, ...args: unknown[]): string {
  const out = lookup(s);
  if (!args.length) return out;
  return out.replace(/\{(\d+)\}/g, (_, i: string) => {
    const v = args[Number(i)];
    return v === null || v === undefined || v === false ? "" : String(v);
  });
}

/** مثل tr لكن القيم ممكن تكون عناصر React (روابط، خط عريض…) */
export function trx(s: string, ...args: ReactNode[]): ReactNode {
  const out = lookup(s);
  if (!args.length) return out;
  const pieces = out.split(/\{(\d+)\}/);
  return createElement(Fragment, null, ...pieces.map((p, i) => (i % 2 ? args[Number(p)] : p)));
}
