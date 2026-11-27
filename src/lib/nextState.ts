import type { WesyState } from "../vendor/wesy-real";
import { tr } from "./i18n";

/* حالات كرت «الجاي لكم» وويسي معه (NextCardsD/M · CeoStates):
   يوم أول (حقل الموضوع) · منتصف (خطوة + زر برتقالي) · ينتظرون الدكتورة (كرت كريمي بدون برتقالي) · خلص كل شي · تحميل */

export type NextState = "loading" | "first" | "middle" | "waiting" | "done";

export function nextState(o: { loading: boolean; topic: string; waitingDoc: number; step: number | null }): NextState {
  if (o.loading) return "loading";
  if (!o.topic.trim()) return "first";
  if (o.step !== null && o.step >= 10) return "done";
  if (o.waitingDoc > 0) return "waiting";
  return "middle";
}

export function wesyFor(s: NextState, docName: string): { state: WesyState; line: string } {
  switch (s) {
    case "loading":
      return { state: "thinking", line: tr("لحظة، أرتّب أوراقكم…") };
    case "first":
      return { state: "greet", line: tr("هلا والله! وش موضوع بحثكم؟") };
    case "waiting":
      return { state: "wait", line: tr("الكرة عند {0}. ارتاحوا ☕", docName) };
    case "done":
      return { state: "success", line: tr("خلصتوا الرحلة كلها. فخور فيكم.") };
    default:
      return { state: "typing", line: tr("عندي لكم خطوة وحدة اليوم 👇") };
  }
}
