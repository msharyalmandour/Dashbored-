import type { DropItemRow, DropResult, DropRow } from "../../lib/drops";

/* بيانات تجريبية لهيرو «ارموا» (للتطوير بس: #/?hero=drag|absorb|reveal|landed) — نفس مثال التصميم */
export const heroDemo = (): string | null => {
  if (!import.meta.env.DEV) return null;
  const q = window.location.hash.split("?")[1] ?? "";
  return new URLSearchParams(q).get("hero");
};

const base = { drop_id: "demo", item_id: "i1", included: true, created_entities: [], filed_note: null, undone_at: null };
export const DEMO_DROP: DropRow = { id: "demo", status: "ready", error_code: null, source: "global", summary: "", created_at: new Date().toISOString(), filed_at: null };
export const DEMO_ITEMS: DropItemRow[] = [
  { id: "i1", kind: "file", name: "Burnout ICU nurses.pdf", mime: "application/pdf", size: 1, page_count: 4, ocr_used: false },
  { id: "i2", kind: "file", name: "واتساب د. إسراء.png", mime: "image/png", size: 1, page_count: null, ocr_used: true },
];
export const DEMO_RESULTS: DropResult[] = [
  { ...base, id: "r1", ord: 1, destination: "library", title: "Burnout among ICU nurses in Saudi Arabia", confidence: 0.92, payload: { country: "السعودية", design: "Cross-sectional", sample: "312 ممرض", finding: "54% إجهاد عالي" } },
  { ...base, id: "r2", ord: 2, item_id: "i2", destination: "supervisor_note", title: "تعديل البند 7 بالأداة", confidence: 0.9, payload: { comments: [{ text: "عدّلوا البند 7 وخلّوا الصياغة أوضح، وأرسلوا العينة النهائية قبل الخميس.", section: "other" }] } },
  { ...base, id: "r3", ord: 3, item_id: "i2", destination: "tasks", title: "من كلام د. إسراء", confidence: 0.6, payload: { tasks: [{ title: "تعديل صياغة البند 7", owner_id: null, due: "2026-11-17" }, { title: "إرسال العينة النهائية", owner_id: null, due: "2026-11-19" }] } },
  { ...base, id: "r4", ord: 4, item_id: "i2", destination: "calendar", title: "موعد جديد", confidence: 0.88, payload: { events: [{ title: "اجتماع مع الدكتورة", date: "2026-11-16", time: "12:00" }] } },
];
