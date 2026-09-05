import type {
  EvidencePaper,
  Methodology,
  ProposalSectionRow,
  ResearchGap,
  ResearchQuestion,
  ResearchStageRow,
  StageKey,
} from "../data/types";

/** ========================================================================
    طبقة حساب التقدم — مصدر الحقيقة الوحيد لأي نسبة تقدّم بالتطبيق.
    ما فيه ولا نسبة مخزّنة يدويًا بأي مكان — كل رقم يُحسب من بيانات حقيقية
    وقت الطلب. تستخدمها لوحة التحكم (Overview) والجدول الزمني (Timeline)
    ولاحقًا أي تقرير — نفس المصدر، نفس الرقم، بدون تكرار منطق.
    ======================================================================== */

interface AutoProgressInputs {
  proposalSections?: ProposalSectionRow[];
  researchGap?: ResearchGap;
  researchQuestions?: ResearchQuestion[];
  methodology?: Methodology;
  evidencePapers?: EvidencePaper[];
}

/**
 * نسبة تقدّم مرحلة واحدة من رحلة البحث.
 * - المراحل اللي عندها جدول حقيقي (proposal / research-gap / research-questions /
 *   methodology / literature-review): تُحسب مباشرة من البيانات الفعلية.
 * - باقي المراحل (topic / data-collection / analysis / writing / final-submission):
 *   ما فيها جدول بيانات مخصص بعد — تُرجع null، يعني "اعتمد على القيمة المخزّنة
 *   بجدول research_stages نفسه" (قيمة حقيقية بقاعدة البيانات، بس مو مُشتقّة تلقائيًا).
 */
export function getStageAutoProgress(
  stageKey: StageKey,
  data: AutoProgressInputs,
): number | null {
  switch (stageKey) {
    case "proposal": {
      const sections = data.proposalSections;
      if (!sections || sections.length === 0) return 0;
      const done = sections.filter((s) => s.status === "done").length;
      return Math.round((done / sections.length) * 100);
    }
    case "research-gap":
      return data.researchGap?.gapStatement.trim() ? 100 : 0;
    case "research-questions":
      return (data.researchQuestions?.length ?? 0) > 0 ? 100 : 0;
    case "methodology": {
      const m = data.methodology;
      if (!m) return 0;
      const keyFields = [m.studyDesign, m.studySetting, m.population, m.sampling.sampleSize];
      const filled = keyFields.filter((f) => f.trim() !== "").length;
      return Math.round((filled / keyFields.length) * 100);
    }
    case "literature-review": {
      const papers = data.evidencePapers;
      if (!papers || papers.length === 0) return 0;
      const reviewed = papers.filter((p) => p.reviewStatus === "reviewed").length;
      return Math.round((reviewed / papers.length) * 100);
    }
    default:
      return null;
  }
}

/** يحسب نسبة كل مرحلة — تلقائيًا لو فيه بيانات حقيقية، وإلا القيمة المخزّنة بالمرحلة نفسها */
export function getEffectiveStageProgress(
  stage: ResearchStageRow,
  data: AutoProgressInputs,
): number {
  const auto = getStageAutoProgress(stage.stageKey, data);
  return auto ?? stage.progress;
}

/** نسبة تقدّم البحث الإجمالية — متوسط بسيط لتقدّم كل المراحل العشرة بوزن متساوٍ.
    ما فيها أي ترجيح مخفي، وما تُخزَّن بأي مكان — تُحسب من الصفر كل مرة. */
export function getOverallProgress(
  stages: ResearchStageRow[],
  data: AutoProgressInputs = {},
): number {
  if (stages.length === 0) return 0;
  const total = stages.reduce((sum, s) => sum + getEffectiveStageProgress(s, data), 0);
  return Math.round(total / stages.length);
}

/** أول مرحلة لسا ما خلصت — تُستخدم كـ"المرحلة الحالية" بلوحة التحكم */
export function getCurrentStage(stages: ResearchStageRow[]): ResearchStageRow | undefined {
  return [...stages].sort((a, b) => a.order - b.order).find((s) => s.status !== "done");
}
