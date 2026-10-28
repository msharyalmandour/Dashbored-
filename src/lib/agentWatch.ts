import { tr } from "./i18n";

/** «عين الوكيل»: يفحص مشروعكم بقواعد ثابتة (بدون ذكاء ولا حد استخدام) ويطلع تنبيهات تستاهل انتباهكم،
    وفحص اتساق الهدف مع الأسئلة. كل تنبيه معه نص جاهز تضغطونه فيفتح الوكيل ويبدأ منه. */

export interface WatchInput {
  /** تاريخ اليوم بتوقيت الرياض YYYY-MM-DD */
  today: string;
  aim: string;
  questions: string[];
  tasks: { title: string; assigneeId: string; dueDate: string; status: string }[];
  stages: { targetDate?: string | null; progress?: number | null; status?: string | null }[];
  feedbackOpen: { assigneeId: string | null }[];
  submissionDate?: string | null;
  isLeader: boolean;
}

export interface Nudge {
  id: string;
  level: "warn" | "info";
  text: string;
  /** يُرسل للوكيل عند الضغط */
  ask: string;
}

const dayMs = 86400000;
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / dayMs);

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(["هل", "ما", "ماذا", "هي", "هو", "في", "من", "الى", "على", "عن", "بين", "الي", "التي", "الذي", "ان", "او", "و", "the", "of", "and", "to", "in", "is", "what", "how", "does"]);
const words = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));

/** تشابه جاكارد بين مجموعتي كلمات */
export function similarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return 0;
  let inter = 0;
  for (const w of x) if (y.has(w)) inter++;
  return inter / (x.size + y.size - inter);
}

/** فحص اتساق الهدف والأسئلة — يرجّع ملاحظات قصيرة، فاضي لو كل شي سليم */
export function consistencyIssues(aim: string, questions: string[]): Nudge[] {
  const out: Nudge[] = [];
  const a = aim.trim();
  const qs = questions.map((q) => q.trim()).filter(Boolean);
  if (!a && qs.length > 0)
    out.push({
      id: "no-aim",
      level: "warn",
      text: tr("عندكم أسئلة بحث بس ما فيه هدف مكتوب — الهدف يوضّح وش بتسوون، والأسئلة تحدد وش بتجاوبون."),
      ask: tr("اكتب لي هدفًا للبحث يتسق مع أسئلتنا الحالية، واعرضه عليّ قبل الحفظ"),
    });
  if (a && qs.length === 0)
    out.push({
      id: "no-questions",
      level: "warn",
      text: tr("عندكم هدف بس ما فيه أسئلة بحث — الأسئلة هي اللي تحدد وش تقيسون."),
      ask: tr("اقترح أسئلة بحث تتسق مع هدفنا، ولا تحفظها إلا بموافقتي"),
    });
  if (a && qs.some((q) => norm(q) === norm(a) || similarity(q, a) >= 0.8))
    out.push({
      id: "aim-equals-question",
      level: "warn",
      text: tr("الهدف وأحد الأسئلة شبه متطابقين. الهدف = وش بتسوون («نهدف إلى تقييم…»)، والسؤال = وش بتجاوبون («ما / هل…؟»)."),
      ask: tr("الهدف وسؤال البحث عندنا شبه نفس الصياغة، وضّح لي الفرق واقترح تعديل للهدف فقط"),
    });
  if (qs.length > 5)
    out.push({
      id: "too-many-questions",
      level: "info",
      text: trCount(qs.length),
      ask: tr("أسئلتنا كثيرة، أيها أهم ويمكن ندمجه أو نأجله؟ لا تغيّر شي بدون موافقتي"),
    });
  if (a && qs.length > 0 && qs.every((q) => similarity(q, a) === 0))
    out.push({
      id: "aim-questions-disconnected",
      level: "info",
      text: tr("ما فيه كلمات مشتركة بين الهدف والأسئلة — تأكدوا إن الأسئلة تخدم الهدف وإنهم يتكلمون عن نفس المتغيرات."),
      ask: tr("هل أسئلة بحثنا تخدم هدفنا؟ قارن بينهم وقل لي وين التعارض بدون ما تعدّل شي"),
    });
  return out;
}

const trCount = (n: number) => tr("عندكم {0} أسئلة بحث — أغلب المشاريع الجامعية تكفيها ٢–٤ أسئلة واضحة.", n);

/** تنبيهات استباقية من حالة المشروع */
export function proactiveNudges(i: WatchInput): Nudge[] {
  const out: Nudge[] = [];
  const open = i.tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < i.today);
  if (overdue.length > 0)
    out.push({
      id: "overdue",
      level: "warn",
      text: tr("{0} مهمة متأخرة عن موعدها.", overdue.length),
      ask: tr("وش المهام المتأخرة وش أقترح نسوي فيها؟"),
    });
  if (i.isLeader) {
    const unassigned = open.filter((t) => !t.assigneeId);
    if (unassigned.length > 0)
      out.push({
        id: "unassigned",
        level: "warn",
        text: tr("{0} مهمة بدون مسؤول.", unassigned.length),
        ask: tr("وزّع المهام اللي بدون مسؤول على الأعضاء، اعرضها عليّ للموافقة"),
      });
  }
  if (i.tasks.length === 0)
    out.push({
      id: "no-tasks",
      level: "info",
      text: tr("ما فيه أي مهمة بعد. تبغون خطة مهام للأسابيع الجاية؟"),
      ask: tr("اقترح لنا خطة مهام وزّعها على الأعضاء"),
    });

  const staleStage = i.stages.find((s) => s.targetDate && s.targetDate < i.today && s.status !== "done" && (s.progress ?? 0) < 100);
  if (staleStage)
    out.push({
      id: "stage-late",
      level: "warn",
      text: tr("فيه مرحلة تجاوزت تاريخها المستهدف وما اكتملت."),
      ask: tr("أي مرحلة تجاوزت تاريخها وكيف نعدل الخطة؟"),
    });

  if (i.submissionDate) {
    const left = daysBetween(i.today, i.submissionDate);
    if (left >= 0 && left <= 30)
      out.push({
        id: "submission-soon",
        level: left <= 14 ? "warn" : "info",
        text: tr("باقي {0} يوم على موعد التسليم.", left),
        ask: tr("باقي على التسليم {0} يوم، وش أولوياتنا؟ ورتّب لي أهم ٥ أشياء", left),
      });
  }

  if (i.feedbackOpen.length > 0)
    out.push({
      id: "feedback-open",
      level: "info",
      text: tr("{0} ملاحظة من المشرف/ة لسا مفتوحة.", i.feedbackOpen.length),
      ask: tr("لخّص ملاحظات المشرف المفتوحة وقل لي من يسوي كل وحدة"),
    });
  return out;
}

export function watchAll(i: WatchInput): Nudge[] {
  const rank = { warn: 0, info: 1 } as const;
  return [...consistencyIssues(i.aim, i.questions), ...proactiveNudges(i)].sort((a, b) => rank[a.level] - rank[b.level]);
}
