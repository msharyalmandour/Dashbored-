import type { ProposalSectionRow, ResearchStageRow, Task } from "../data/types";

export interface NextStep {
  id: string;
  title: string;
  why: string;
  to: string;
  cta: string;
  tone: "urgent" | "normal" | "calm";
}

/** وين تودّي المرحلة الحالية — الصفحة اللي فيها شغل هالمرحلة فعليًا */
export const STAGE_ACTION: Record<string, { title: string; why: string; to: string; cta: string }> = {
  topic: { title: "ثبّتوا عنوان بحثكم", why: "كل شي بعده يبني عليه — اكتبوه بجملة واضحة (الفئة + المتغير).", to: "/proposal", cta: "افتحوا المقترح" },
  proposal: { title: "كمّلوا أقسام المقترح", why: "المقترح هو أساس البحث، والمشرفة تراجعه أول شي.", to: "/proposal", cta: "افتحوا المقترح" },
  "literature-review": { title: "دوّروا دراسات وأضيفوها لمكتبتكم", why: "مراجعة الأدبيات تحدد فجوتكم البحثية.", to: "/research-search", cta: "ابدأوا البحث" },
  "research-gap": { title: "اكتبوا الفجوة البحثية", why: "الفجوة تبرر ليش بحثكم مهم — اربطوها بالدراسات اللي جمعتوها.", to: "/proposal", cta: "اكتبوا الفجوة" },
  "research-questions": { title: "صيغوا أسئلة البحث", why: "استخدموا إطار PICO — سؤال لكل متغير رئيسي.", to: "/proposal", cta: "افتحوا الأسئلة" },
  methodology: { title: "حدّدوا منهجيتكم", why: "التصميم والعينة والأداة — وبعدها تحسبون حجم العينة.", to: "/methodology", cta: "افتحوا المنهجية" },
  "data-collection": { title: "جهّزوا الاستبيان والموافقات", why: "قبل ما توزعون أي شي: موافقة الأخلاقيات وإذن الأداة والنماذج.", to: "/study-kit", cta: "افتحوا الحقيبة" },
  analysis: { title: "حلّلوا بياناتكم", why: "الصقوا الجدول واختاروا الاختبار، والنتيجة تطلع مشروحة.", to: "/stats", cta: "افتحوا الإحصاء" },
  writing: { title: "اكتبوا وصدّروا بحثكم", why: "جمّعوا الأقسام ورتّبوا المراجع ثم صدّروه.", to: "/proposal/export", cta: "افتحوا التصدير" },
  "final-submission": { title: "جهّزوا التسليم النهائي", why: "راجعوا الموعد وهامش الأمان، وتدرّبوا على المناقشة.", to: "/viva", cta: "تدرّبوا على المناقشة" },
};

export function computeNextSteps(input: {
  todayIso: string;
  currentUserId: string;
  tasks: Task[];
  stages: ResearchStageRow[];
  sections: ProposalSectionRow[];
  hasDeadline: boolean;
  /** المرحلة الحالية مكتملة — بطاقة «انتقلوا للجاية» تتولى التوجيه، فما نكرر الخطوة */
  stageReady?: boolean;
}): NextStep[] {
  const steps: NextStep[] = [];
  const open = input.tasks.filter((t) => t.status !== "done");
  const late = (t: Task) => t.status === "overdue" || (!!t.dueDate && t.dueDate < input.todayIso);

  const myLate = open.filter((t) => t.assigneeId === input.currentUserId && late(t));
  if (myLate.length > 0) {
    steps.push({
      id: "my-late",
      title: myLate.length === 1 ? "عندك مهمة متأخرة" : `عندك ${myLate.length} مهام متأخرة`,
      why: `«${myLate[0].title}»${myLate.length > 1 ? " وغيرها" : ""} — خلّصوها أول شي أو غيّروا موعدها لو ما تناسب.`,
      to: myLate.length === 1 ? `/tasks?task=${myLate[0].id}` : "/tasks",
      cta: "افتحوا مهامكم",
      tone: "urgent",
    });
  }

  const teamLate = open.filter((t) => t.assigneeId !== input.currentUserId && late(t));
  if (teamLate.length > 0) {
    steps.push({
      id: "team-late",
      title: `${teamLate.length} ${teamLate.length === 1 ? "مهمة متأخرة" : "مهام متأخرة"} عند الفريق`,
      why: "ذكّروا زملاءكم بلطف أو أعيدوا توزيع الحمل.",
      to: "/team",
      cta: "شوفوا الفريق",
      tone: "urgent",
    });
  }

  if (!input.hasDeadline) {
    steps.push({
      id: "deadline",
      title: "حدّدوا موعد التسليم",
      why: "بدونه ما نقدر نبني لكم جدول واقعي — المخطط يوزّع الوقت على المراحل تلقائيًا.",
      to: "/planner",
      cta: "افتحوا المخطط",
      tone: "normal",
    });
  }

  const active = input.stages.find((s) => s.status === "active") ?? input.stages.find((s) => s.status === "upcoming");
  const action = active ? STAGE_ACTION[active.stageKey] : undefined;
  if (active && action && !input.stageReady) {
    steps.push({ id: `stage-${active.stageKey}`, title: action.title, why: `${action.why} (مرحلتكم الحالية: ${active.titleAr})`, to: action.to, cta: action.cta, tone: "normal" });
  }

  const empty = input.sections.filter((s) => s.status === "not-started");
  if (empty.length > 0 && active && ["topic", "proposal", "literature-review", "research-gap", "research-questions"].includes(active.stageKey)) {
    steps.push({
      id: "empty-sections",
      title: `${empty.length} ${empty.length === 1 ? "قسم" : "أقسام"} بالمقترح لسا ما بدأت`,
      why: `مثل «${empty[0].labelAr}». ابدأوا بأسهلها وخذوا زخم.`,
      to: "/proposal",
      cta: "افتحوا المقترح",
      tone: "calm",
    });
  }

  const dueSoon = open.filter((t) => !late(t) && t.dueDate && t.dueDate >= input.todayIso && daysBetween(input.todayIso, t.dueDate) <= 7);
  if (dueSoon.length > 0) {
    steps.push({
      id: "due-week",
      title: `${dueSoon.length} ${dueSoon.length === 1 ? "مهمة تستحق" : "مهام تستحق"} خلال أسبوع`,
      why: "شوفوا مين مسؤول عن كل وحدة وتأكدوا إنها ماشية.",
      to: "/tasks",
      cta: "افتحوا المهام",
      tone: "calm",
    });
  }

  return steps;
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);
}
