import type { ResearchStageRow } from "../data/types";
import { getStageAutoProgress } from "./progress";

type AutoInputs = Parameters<typeof getStageAutoProgress>[1];

/** المرحلة الحالية = أول مرحلة ما خلصت (نفس تعريف getCurrentStage) */
export function nextStageOf(stages: ResearchStageRow[], current: ResearchStageRow): ResearchStageRow | undefined {
  return [...stages].sort((a, b) => a.order - b.order).find((s) => s.order > current.order);
}

export function previousStageOf(stages: ResearchStageRow[], current: ResearchStageRow): ResearchStageRow | undefined {
  return [...stages].sort((a, b) => b.order - a.order).find((s) => s.order < current.order);
}

/** هل معايير إنهاء المرحلة متحققة فعلاً من بيانات الفريق؟
    topic: عنوان البحث مكتوب. المراحل اللي لها بيانات حقيقية: نسبتها المحسوبة 100%.
    باقي المراحل (جمع/تحليل/كتابة/تسليم) ما فيها معيار آلي — الفريق يقرر يدويًا. */
export function isStageReady(stage: ResearchStageRow, data: AutoInputs, projectTitle: string): boolean {
  if (stage.stageKey === "topic") return projectTitle.trim().length > 0;
  const auto = getStageAutoProgress(stage.stageKey, data);
  return auto !== null && auto >= 100;
}
