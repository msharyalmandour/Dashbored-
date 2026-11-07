import { tr } from "./i18n";
import type { EvidencePaper, ProposalSectionRow, Task } from "../data/types";

/* ربط المهمة بمكان شغلها: كل مهمة تعرف «وين» تنسوّى، و«كم» لو فيها رقم (٥ دراسات)،
   والموقع يتأكد من البيانات قبل ما تنحسب خلصت. المكان ينحفظ بخانة section_key الموجودة
   (أقسام المقترح + أماكن الموقع)، ولو المهمة قديمة بدون مكان نستنتجه من عنوانها. */

export type PlaceKey =
  | "background"
  | "problem"
  | "gap"
  | "aim"
  | "questions"
  | "literature-review"
  | "methodology"
  | "evidence"
  | "literature"
  | "ethics"
  | "surveys"
  | "stats"
  | "meetings"
  | "supervisor"
  | "files";

export interface Place {
  key: PlaceKey;
  label: string;
  route: string;
  /** قسم من أقسام المقترح (له محتوى نكتبه) */
  section?: boolean;
}

export const PLACES: Place[] = [
  { key: "evidence", label: tr("مكتبة الأدلة"), route: "/evidence" },
  { key: "literature", label: tr("جدول الأدبيات"), route: "/literature-review" },
  { key: "background", label: tr("خلفية البحث"), route: "/proposal?section=background", section: true },
  { key: "problem", label: tr("مشكلة البحث"), route: "/proposal?section=problem", section: true },
  { key: "gap", label: tr("الفجوة المعرفية"), route: "/proposal?section=gap", section: true },
  { key: "aim", label: tr("هدف الدراسة"), route: "/proposal?section=aim", section: true },
  { key: "questions", label: tr("أسئلة البحث"), route: "/proposal?section=questions", section: true },
  { key: "literature-review", label: tr("كتابة مراجعة الأدبيات"), route: "/proposal?section=literature-review", section: true },
  { key: "methodology", label: tr("المنهجية"), route: "/methodology", section: true },
  { key: "ethics", label: tr("الموافقة الأخلاقية"), route: "/ethical-approval" },
  { key: "surveys", label: tr("الاستبيانات"), route: "/surveys" },
  { key: "stats", label: tr("التحليل"), route: "/stats" },
  { key: "meetings", label: tr("الاجتماعات"), route: "/meeting-minutes" },
  { key: "supervisor", label: tr("المشرف/ة"), route: "/meeting-minutes?tab=decisions" },
  { key: "files", label: tr("الملفات"), route: "/files" },
];

const byKey = new Map(PLACES.map((p) => [p.key, p]));
export const placeByKey = (k: string | null | undefined): Place | null => (k ? byKey.get(k as PlaceKey) ?? null : null);

/** يشيل التشكيل والهمزات عشان المطابقة تكون مرنة */
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

// الترتيب مهم: الأدق أول
const RULES: [PlaceKey, RegExp][] = [
  ["literature", /جدول (ال)?ادبيات|جدول الدراسات|literature table|synthesis table/],
  ["ethics", /اخلاق|لجنه|irb|ethic|موافقه/],
  ["surveys", /استبيان|استبانه|survey|questionnaire|توزيع/],
  ["stats", /تحليل|احصا|spss|stat/],
  ["meetings", /اجتماع|محضر|meeting|minutes/],
  ["supervisor", /مشرف|دكتور|supervisor/],
  ["methodology", /منهج|عينه|اداه|methodolog|sample|design/],
  ["questions", /اسئله|سؤال البحث|research question/],
  ["aim", /هدف|اهداف|aim|objective/],
  ["gap", /فجوه|gap/],
  ["problem", /مشكله|problem statement/],
  ["background", /خلفيه|مقدمه|background|introduction/],
  ["literature-review", /مراجعه (ال)?ادبيات|literature review/],
  ["evidence", /دراس|مرجع|مراجع|مقال|بحوث سابقه|papers?|studies|articles?|references?/],
  ["files", /ملف|رفع|upload|file/],
];

export function inferPlace(title: string, description = ""): PlaceKey | null {
  const t = fold(`${title} ${description}`);
  for (const [k, re] of RULES) if (re.test(t)) return k;
  return null;
}

const WORD_NUM: Record<string, number> = {
  واحد: 1, وحده: 1, اثنين: 2, ثنتين: 2, دراستين: 2, ثلاث: 3, ثلاثه: 3, اربع: 4, اربعه: 4, خمس: 5, خمسه: 5,
  ست: 6, سته: 6, سبع: 7, سبعه: 7, ثمان: 8, ثمانيه: 8, تسع: 9, تسعه: 9, عشر: 10, عشره: 10,
};
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** «ابحث عن 5 دراسات» → 5. يفهم الأرقام العربية والكلمات (خمس دراسات) */
export function targetCount(title: string): number | null {
  const t = fold(title).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  const m = t.match(/(\d{1,2})\s*(دراس|مرجع|مراجع|مقال|بحث|stud|paper|article|ref)/);
  if (m) return Number(m[1]);
  if (/دراستين/.test(t)) return 2;
  const w = t.match(/(واحد|وحده|اثنين|ثنتين|ثلاثه|ثلاث|اربعه|اربع|خمسه|خمس|سته|ست|سبعه|سبع|ثمانيه|ثمان|تسعه|تسع|عشره|عشر)\s*(دراس|مرجع|مراجع|مقال|بحوث)/);
  return w ? WORD_NUM[w[1]] ?? null : null;
}

export const placeOf = (task: Pick<Task, "title" | "description" | "sectionKey">): Place | null =>
  placeByKey(task.sectionKey) ?? placeByKey(inferPlace(task.title, task.description));

export interface Proof {
  have: number;
  need: number;
  /** «٢ من ٥ دراسات» */
  label: string;
  met: boolean;
}

/** دليل الإنجاز من البيانات الحقيقية. null = ما نقدر نقيسها (تنعلّم يدوي عادي) */
export function proofFor(
  task: Pick<Task, "title" | "description" | "sectionKey" | "assigneeId">,
  ctx: { papers: Pick<EvidencePaper, "addedById" | "country" | "aim" | "sample" | "dataCollection">[]; sections: Pick<ProposalSectionRow, "key" | "content">[] },
): Proof | null {
  const place = placeOf(task);
  if (!place) return null;
  const mine = ctx.papers.filter((p) => !task.assigneeId || p.addedById === task.assigneeId);
  if (place.key === "evidence") {
    const need = targetCount(task.title) ?? 1;
    const have = mine.length;
    return { have: Math.min(have, need), need, met: have >= need, label: tr("{0} من {1} دراسات", Math.min(have, need), need) };
  }
  if (place.key === "literature") {
    const need = targetCount(task.title) ?? 1;
    const have = mine.filter((p) => !!(p.country?.trim() || p.aim?.trim() || p.sample?.trim() || p.dataCollection?.trim())).length;
    return { have: Math.min(have, need), need, met: have >= need, label: tr("{0} من {1} صفوف بالجدول", Math.min(have, need), need) };
  }
  if (place.section && place.key !== "methodology") {
    const sec = ctx.sections.find((s) => s.key === place.key);
    if (!sec) return null;
    const written = !!sec.content?.trim();
    return { have: written ? 1 : 0, need: 1, met: written, label: written ? tr("القسم مكتوب") : tr("القسم لسا فاضي") };
  }
  return null;
}

const normTitle = (s: string) => fold(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export interface ReviewIssue {
  id: string;
  text: string;
  fix: string;
  to: string;
  count: number;
}

/** «مراجعة صارمة»: مشاكل حقيقية مرتبة من الأخطر، كل وحدة معها طريقة تصليح */
export function strictReview(input: {
  tasks: Task[];
  papers: Pick<EvidencePaper, "addedById" | "country" | "aim" | "sample" | "dataCollection">[];
  sections: Pick<ProposalSectionRow, "key" | "content" | "ownerId" | "status">[];
  deadline: string | null | undefined;
  today: string;
  nameOf: (id: string) => string;
}): ReviewIssue[] {
  const { tasks, papers, sections, deadline, today, nameOf } = input;
  const out: ReviewIssue[] = [];
  const unproven = tasks.filter((t) => t.status === "done" && proofFor(t, { papers, sections })?.met === false);
  if (unproven.length) {
    const t = unproven[0];
    const p = proofFor(t, { papers, sections })!;
    out.push({
      id: "unproven",
      count: unproven.length,
      text:
        unproven.length === 1
          ? tr("«{0}» معلّمة خلصت، بس الموجود فعلًا {1}.", t.title, p.label)
          : tr("{0} مهام معلّمة خلصت بدون دليل، مثل «{1}» ({2}).", unproven.length, t.title, p.label),
      fix: tr("أضيفوا الشغل أو رجّعوها"),
      to: placeOf(t)?.route ?? "/tasks",
    });
  }
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const k = normTitle(t.title);
    if (k) groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const dup = [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length)[0];
  if (dup) {
    const who = [...new Set(dup.map((t) => nameOf(t.assigneeId)).filter(Boolean))].join("، ");
    out.push({
      id: "dup",
      count: dup.length,
      text: tr("{0} مهام بنفس العنوان «{1}»{2}. ما يبين مين يسوي أي جزء.", dup.length, dup[0].title, who ? ` (${who})` : ""),
      fix: tr("وزّعوها بأسماء واضحة"),
      to: "/tasks",
    });
  }
  const late = tasks.filter((t) => t.status !== "done" && !!t.dueDate && t.dueDate < today);
  if (late.length) out.push({ id: "late", count: late.length, text: tr("{0} مهام عدّى موعدها وما خلصت.", late.length), fix: tr("حدّثوا الموعد أو خلّصوها"), to: "/tasks" });
  const noOwner = sections.filter((s) => !s.ownerId);
  if (sections.length && noOwner.length) out.push({ id: "owners", count: noOwner.length, text: tr("{0} من {1} أقسام المقترح بدون مسؤول. القسم اللي ما له اسم ما أحد بيكتبه.", noOwner.length, sections.length), fix: tr("وزّعوا الأقسام"), to: "/proposal" });
  if (!deadline) out.push({ id: "deadline", count: 1, text: tr("ما فيه موعد تسليم. بدونه ما نقدر نقول لكم إذا أنتم متأخرين."), fix: tr("حطّوا الموعد"), to: "/" });
  const unplaced = tasks.filter((t) => t.status !== "done" && !placeOf(t));
  if (unplaced.length) out.push({ id: "unplaced", count: unplaced.length, text: tr("{0} مهام ما ندري وين شغلها بالموقع.", unplaced.length), fix: tr("حددوا وين الشغل"), to: "/tasks" });
  return out;
}
