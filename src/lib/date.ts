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
