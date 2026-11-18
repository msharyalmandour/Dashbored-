import { supabase } from "./supabaseClient";

/* ختم الأصالة (B04Seal): سجل مين كتب وش — مو كشف ذكاء اصطناعي.
   مصدرين بس: human (كتبه الطالب بنفسه) و ai_suggestion_edited (اقتراح من ويسي الطالب قبله وعدّله).
   نحسب بالحروف المضافة بكل حفظ، والنتيجة يشوفها الفريق والمشرفة بس (RLS بالفريق). */

export function authorshipDelta(prev: string, next: string): number {
  return Math.max(0, (next ?? "").trim().length - (prev ?? "").trim().length);
}

export async function recordAuthorship(section: string, prev: string, next: string, source: "human" | "ai_suggestion_edited"): Promise<void> {
  const n = authorshipDelta(prev, next);
  if (!n || !supabase) return;
  await supabase.rpc("add_authorship", { p_section: section, p_human: source === "human" ? n : 0, p_ai_edited: source === "human" ? 0 : n }).then(() => undefined, () => undefined);
}

export function sealPercent(human: number, ai: number): { human: number; ai: number } | null {
  const t = human + ai;
  if (!t) return null;
  const h = Math.round((human / t) * 100);
  return { human: h, ai: 100 - h };
}
