// فهم ردود الواتساب — بدون ذكاء اصطناعي (سريع، مجاني، ومتوقع).
// «تم» / «تم 2» / «خلصت» · «أجّل» / «أجل 2» / «أجل 2 يومين» / «أجل ٣ أيام» · «مهامي» · «وقف» / «ابدأ»
// · «ربط ABC123» · أزرار: done:<id> / snooze:<id> / list

export type Command =
  | { kind: "link"; code: string }
  | { kind: "done"; n?: number; taskId?: string }
  | { kind: "snooze"; n?: number; days: number; taskId?: string }
  | { kind: "list" }
  | { kind: "pause" }
  | { kind: "resume" }
  | { kind: "help" };

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** توحيد النص: أرقام لاتينية، بدون تشكيل ولا تطويل، والهمزات ألف */
export function normalize(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[✓✔️☑️✅!؟?.,،]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DAY_WORDS: Record<string, number> = { "يوم": 1, "يومين": 2, "اسبوع": 7, "اسبوعين": 14, "بكره": 1, "بكرة": 1 };

function numbersIn(words: string[]): number[] {
  return words.map((w) => Number(w)).filter((n) => Number.isInteger(n) && n > 0 && n < 100);
}

export function parseCommand(raw: string): Command {
  const trimmed = raw.trim();
  // أزرار الرسائل التفاعلية (id) — نتحقق من شكل المعرّف قبل ما نثق فيه
  const btn = /^(done|snooze):(.+)$/.exec(trimmed);
  if (btn && UUID.test(btn[2])) return btn[1] === "done" ? { kind: "done", taskId: btn[2] } : { kind: "snooze", days: 1, taskId: btn[2] };
  if (trimmed === "list") return { kind: "list" };

  const t = normalize(raw);
  const link = /^(ربط|link)\s*([a-z0-9]{6})$/i.exec(t);
  if (link) return { kind: "link", code: link[2].toUpperCase() };

  const words = t.split(" ");
  const head = words[0] ?? "";
  const rest = words.slice(1);

  if (/^(تم|خلصت|خلصتها|خلصناها|انتهيت|done)$/.test(head)) {
    const [n] = numbersIn(rest);
    return { kind: "done", n };
  }
  if (/^(اجل|اجلها|اجلي|تاجيل|snooze|later)$/.test(head)) {
    const nums = numbersIn(rest);
    const dayWord = rest.find((w) => w in DAY_WORDS);
    // «أجل 2 يومين» = المهمة 2 يومين · «أجل 3 ايام» = 3 أيام · «أجل 2» = المهمة 2 يوم واحد
    const daysFromWord = dayWord ? DAY_WORDS[dayWord] : undefined;
    const hasDaysUnit = rest.some((w) => /^(ايام|يوم|days?)$/.test(w));
    let n: number | undefined;
    let days = daysFromWord ?? 1;
    if (nums.length >= 2) {
      n = nums[0];
      days = nums[1];
    } else if (nums.length === 1) {
      if (hasDaysUnit && !daysFromWord) days = nums[0];
      else n = nums[0];
    }
    return { kind: "snooze", n, days: Math.min(Math.max(days, 1), 30) };
  }
  if (/^(مهامي|مهام|المهام|وش علي|tasks|list)$/.test(t) || /^(مهامي|tasks)$/.test(head)) return { kind: "list" };
  if (/^(وقف|اوقف|stop|كفايه|كفاية)$/.test(t)) return { kind: "pause" };
  if (/^(ابدا|كمل|رجع|start|resume)$/.test(t)) return { kind: "resume" };
  return { kind: "help" };
}

/** رقم الواتساب بصيغة دولية بدون + (Meta يرسل «9665…») */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^00/, "");
}

/** تاريخ اليوم بتوقيت الرياض (UTC+3 بدون توقيت صيفي) بصيغة YYYY-MM-DD، مع إزاحة أيام */
export function riyadhDate(offsetDays = 0, now = new Date()): string {
  const d = new Date(now.getTime() + 3 * 3600_000 + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function riyadhHour(now = new Date()): number {
  return new Date(now.getTime() + 3 * 3600_000).getUTCHours();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** متغيرات قالب Meta ما تقبل أسطر جديدة ولا أكثر من ٤ مسافات متتالية، وحدها الأقصى ~1024 حرف */
export function templateSafe(s: string, max = 900): string {
  return s.replace(/[\r\n\t]+/g, " · ").replace(/ {4,}/g, "   ").slice(0, max);
}
