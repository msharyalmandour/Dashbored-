const arabicMonths = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const arabicWeekdays = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const arabicWeekdaysShort = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLong(value: string): string {
  const date = parseDate(value);
  return `${date.getDate()} ${arabicMonths[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShort(value: string): string {
  const date = parseDate(value);
  return `${date.getDate()} ${arabicMonths[date.getMonth()]}`;
}

export function formatWeekday(value: string): string {
  const date = parseDate(value);
  return arabicWeekdays[date.getDay()];
}

export function daysUntil(value: string, from: Date = new Date()): number {
  const target = parseDate(value);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = target.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** تاريخ YYYY-MM-DD صحيح فعلًا (يرفض 2026-02-31 وغيره) */
export function isValidISODate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = parseDate(value);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
}

/** «الأربعاء 21 أكتوبر 2026» — اليوم + التاريخ الميلادي كاملين */
export function formatDateFull(value: string): string {
  if (!isValidISODate(value)) return value;
  return `ال${formatWeekday(value)} ${formatDateLong(value)}`;
}

/** التاريخ الهجري (أم القرى) مثل «10 جمادى الأولى 1448 هـ». يرجع "" لو المتصفح ما يدعمه */
export function formatHijri(value: string): string {
  if (!isValidISODate(value)) return "";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parseDate(value));
  } catch {
    return "";
  }
}

/** «شهر سنة» لعناوين التجميع: «أكتوبر 2026» */
export function formatMonthYear(value: string): string {
  if (!isValidISODate(value)) return "";
  const d = parseDate(value);
  return `${arabicMonths[d.getMonth()]} ${d.getFullYear()}`;
}

/** إزاحة تاريخ بعدد أيام (سالب = للخلف) وترجيعه بصيغة ISO */
export function addDaysISO(value: string, days: number): string {
  const d = parseDate(value);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** «اليوم» / «أمس» / «قبل 5 أيام» / «بعد 3 أيام» */
export function relativeDayLabel(value: string, from: Date = new Date()): string {
  if (!isValidISODate(value)) return "";
  const n = daysUntil(value, from);
  if (n === 0) return "اليوم";
  if (n === -1) return "أمس";
  if (n === 1) return "بكرة";
  if (n === -2) return "قبل يومين";
  if (n === 2) return "بعد يومين";
  if (n < 0) return `قبل ${-n} ${n >= -10 ? "أيام" : "يوم"}`;
  return `بعد ${n} ${n <= 10 ? "أيام" : "يوم"}`;
}

export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

export interface Greeting {
  text: string;
  period: GreetingPeriod;
}

export function getGreeting(date: Date = new Date()): Greeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return { text: "صباح الخير", period: "morning" };
  if (hour >= 12 && hour < 17) return { text: "يعطيك العافية", period: "afternoon" };
  if (hour >= 17 && hour < 22) return { text: "مساء الخير", period: "evening" };
  return { text: "سهران على بحثك؟", period: "night" };
}

export { arabicMonths, arabicWeekdays, arabicWeekdaysShort };
