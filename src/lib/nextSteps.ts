import type { ProposalSectionRow, ResearchStageRow, Task } from "../data/types";
import { tr } from "./i18n";

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
  topic: { title: tr("ثبّتوا عنوان بحثكم"), why: tr("كل شي بعده يبني عليه — اكتبوه بجملة واضحة (الفئة + المتغير)."), to: "/proposal", cta: tr("افتحوا المقترح") },
  proposal: { title: tr("كمّلوا أقسام المقترح"), why: tr("المقترح هو أساس البحث، والمشرفة تراجعه أول شي."), to: "/proposal", cta: tr("افتحوا المقترح") },
  "literature-review": { title: tr("دوّروا دراسات وأضيفوها لمكتبتكم"), why: tr("مراجعة الأدبيات تحدد فجوتكم البحثية."), to: "/research-search?tab=studies", cta: tr("ابدأوا البحث") },
  "research-gap": { title: tr("اكتبوا الفجوة البحثية"), why: tr("الفجوة تبرر ليش بحثكم مهم — اربطوها بالدراسات اللي جمعتوها."), to: "/proposal", cta: tr("اكتبوا الفجوة") },
  "research-questions": { title: tr("صيغوا أسئلة البحث"), why: tr("استخدموا إطار PICO — سؤال لكل متغير رئيسي."), to: "/proposal", cta: tr("افتحوا الأسئلة") },
  methodology: { title: tr("حدّدوا منهجيتكم"), why: tr("التصميم والعينة والأداة — وبعدها تحسبون حجم العينة."), to: "/methodology", cta: tr("افتحوا المنهجية") },
  "data-collection": { title: tr("جهّزوا الاستبيان والموافقات"), why: tr("قبل ما توزعون أي شي: موافقة الأخلاقيات وإذن الأداة والنماذج."), to: "/study-kit", cta: tr("افتحوا الحقيبة") },
  analysis: { title: tr("حلّلوا بياناتكم"), why: tr("الصقوا الجدول واختاروا الاختبار، والنتيجة تطلع مشروحة."), to: "/stats", cta: tr("افتحوا الإحصاء") },
  writing: { title: tr("اكتبوا وصدّروا بحثكم"), why: tr("جمّعوا الأقسام ورتّبوا المراجع ثم صدّروه."), to: "/proposal/export", cta: tr("افتحوا التصدير") },
  "final-submission": { title: tr("جهّزوا التسليم النهائي"), why: tr("راجعوا الموعد وهامش الأمان، وتدرّبوا على المناقشة."), to: "/viva", cta: tr("تدرّبوا على المناقشة") },
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
  /** عدد الدراسات المحفوظة بمكتبة الأدلة وهل كتبوا عنوان — لتقترح «جهّزوا البداية بالوكيل» لما العنوان جاهز والمكتبة فاضية */
  evidenceCount?: number;
  hasTitle?: boolean;
}): NextStep[] {
  const steps: NextStep[] = [];
  const open = input.tasks.filter((t) => t.status !== "done");
  const late = (t: Task) => t.status === "overdue" || (!!t.dueDate && t.dueDate < input.todayIso);

  const myLate = open.filter((t) => t.assigneeId === input.currentUserId && late(t));
  if (myLate.length > 0) {
    steps.push({
      id: "my-late",
      title: myLate.length === 1 ? tr("عندك مهمة متأخرة") : tr("عندك {0} مهام متأخرة", myLate.length),
      why: tr("«{0}»{1} — خلّصوها أول شي أو غيّروا موعدها لو ما تناسب.", myLate[0].title, myLate.length > 1 ? tr(" وغيرها") : ""),
      to: myLate.length === 1 ? `/tasks?task=${myLate[0].id}` : "/tasks",
      cta: tr("افتحوا مهامكم"),
      tone: "urgent",
    });
  }

  const teamLate = open.filter((t) => t.assigneeId !== input.currentUserId && late(t));
  if (teamLate.length > 0) {
    steps.push({
      id: "team-late",
      title: tr("{0} {1} عند الفريق", teamLate.length, teamLate.length === 1 ? tr("مهمة متأخرة") : tr("مهام متأخرة")),
      why: tr("ذكّروا زملاءكم بلطف أو أعيدوا توزيع الحمل."),
      to: "/team",
      cta: tr("شوفوا الفريق"),
      tone: "urgent",
    });
  }

  if (!input.hasDeadline) {
    steps.push({
      id: "deadline",
      title: tr("حدّدوا موعد التسليم"),
      why: tr("بدونه ما نقدر نبني لكم جدول واقعي — المخطط يوزّع الوقت على المراحل تلقائيًا."),
      to: "/planner",
      cta: tr("افتحوا المخطط"),
      tone: "normal",
    });
  }

  if (input.hasTitle && input.evidenceCount === 0) {
    steps.push({
      id: "agent-kickstart",
      title: tr("خلّوا الوكيل يجهّز لكم البداية"),
      why: tr("يدوّر بدراسات منشورة عن عنوانكم ويطلّع دراسات ومسودة فجوة وأسئلة ومهام — وأنتم توافقون على اللي يعجبكم."),
      to: "/research-search",
      cta: tr("جهّزوا البداية"),
      tone: "normal",
    });
  }

  const active = input.stages.find((s) => s.status === "active") ?? input.stages.find((s) => s.status === "upcoming");
  const action = active ? STAGE_ACTION[active.stageKey] : undefined;
  if (active && action && !input.stageReady) {
    steps.push({ id: `stage-${active.stageKey}`, title: action.title, why: tr("{0} (مرحلتكم الحالية: {1})", action.why, active.titleAr), to: action.to, cta: action.cta, tone: "normal" });
  }

  const empty = input.sections.filter((s) => s.status === "not-started");
  if (empty.length > 0 && active && ["topic", "proposal", "literature-review", "research-gap", "research-questions"].includes(active.stageKey)) {
    steps.push({
      id: "empty-sections",
      title: tr("{0} {1} بالمقترح لسا ما بدأت", empty.length, empty.length === 1 ? tr("قسم") : tr("أقسام")),
      why: tr("مثل «{0}». ابدأوا بأسهلها وخذوا زخم.", empty[0].labelAr),
      to: "/proposal",
      cta: tr("افتحوا المقترح"),
      tone: "calm",
    });
  }

  const dueSoon = open.filter((t) => !late(t) && t.dueDate && t.dueDate >= input.todayIso && daysBetween(input.todayIso, t.dueDate) <= 7);
  if (dueSoon.length > 0) {
    steps.push({
      id: "due-week",
      title: tr("{0} {1} خلال أسبوع", dueSoon.length, dueSoon.length === 1 ? tr("مهمة تستحق") : tr("مهام تستحق")),
      why: tr("شوفوا مين مسؤول عن كل وحدة وتأكدوا إنها ماشية."),
      to: "/tasks",
      cta: tr("افتحوا المهام"),
      tone: "calm",
    });
  }

  return steps;
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);
}
