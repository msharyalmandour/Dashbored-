import { parts } from "./mock-data";
import type { Part } from "./types";

/**
 * محاكاة "بحث بالذكاء الاصطناعي" — في الواقع مجرد مطابقة كلمات مفتاحية
 * بسيطة (mock matching) وليست نموذج معالجة لغة طبيعية حقيقياً. تُستخدم
 * هنا فقط لتوضيح فكرة المنتج داخل الـ MVP.
 */
export function mockAiPartSearch(query: string): Part | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  let best: { part: Part; score: number } | null = null;

  for (const part of parts) {
    let score = 0;
    if (part.name.toLowerCase().includes(normalized)) score += 3;
    for (const keyword of part.keywords) {
      const kw = keyword.toLowerCase();
      if (normalized.includes(kw) || kw.includes(normalized)) {
        score += 2;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { part, score };
    }
  }

  return best?.part ?? null;
}
