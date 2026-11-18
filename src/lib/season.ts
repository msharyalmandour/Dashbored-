import type { WesyOutfit, WesyState } from "../vendor/wesy-real";
import { tr } from "./i18n";

/* ويسي يحس بالموسم (B01Seasons): من أقرب حدث بالتقويم الأكاديمي يتغير حالته وجملته وعدد المهام المقترحة.
   أسبوع اختبار: مهام أقل + thinking · تدريب ميداني: تذكير واحد بالليل · آخر 24 ساعة قبل تسليم: المكتب يظلم + زي التسليم. */

export type SeasonKind = "exam" | "training" | "deadline";
export interface AcademicEvent {
  id: string;
  kind: SeasonKind;
  title: string;
  startsOn: string;
  endsOn: string | null;
}
export interface Season {
  kind: SeasonKind | "normal";
  event: AcademicEvent | null;
  state?: WesyState;
  outfit?: WesyOutfit;
  line?: string;
  /** كم مهمة نقترح باليوم */
  taskCap: number;
  /** المكتب يظلم (آخر 24 ساعة) */
  dim: boolean;
  /** تذكير واحد بالليل بس */
  nightOnly: boolean;
}

const day = (iso: string) => Date.parse(`${iso}T00:00:00+03:00`);

export function seasonOf(events: AcademicEvent[], now = new Date()): Season {
  const t = now.getTime();
  const normal: Season = { kind: "normal", event: null, taskCap: 3, dim: false, nightOnly: false };
  // تسليم خلال 24 ساعة (نهاية يوم التسليم)
  const due = events.filter((e) => e.kind === "deadline").find((e) => {
    const end = day(e.startsOn) + 864e5;
    return end > t && end - t <= 864e5 + 1;
  });
  if (due) return { kind: "deadline", event: due, state: "deadline", outfit: "deadline", line: tr("باقي أقل من يوم على «{0}». خطوة وحدة وتخلصون.", due.title), taskCap: 1, dim: true, nightOnly: false };
  const active = (k: SeasonKind) => events.filter((e) => e.kind === k).find((e) => day(e.startsOn) - 2 * 864e5 <= t && t < day(e.endsOn ?? e.startsOn) + 864e5);
  const exam = active("exam");
  if (exam) return { kind: "exam", event: exam, state: "thinking", line: tr("أسبوع اختبارات. خففت عليكم: مهمة وحدة باليوم."), taskCap: 1, dim: false, nightOnly: false };
  const tr2 = active("training");
  if (tr2) return { kind: "training", event: tr2, state: "idle", line: tr("أيام تدريب. أذكركم مرة وحدة بالليل بس."), taskCap: 2, dim: false, nightOnly: true };
  return normal;
}
