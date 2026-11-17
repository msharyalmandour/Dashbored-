import type { TeamStage } from "./teamStage";
import { tr } from "./i18n";

/* «Wesync يكبر مع بحثكم»: القائمة تبدأ بأبواب قليلة، والباقي ينفتح من شغلهم الحقيقي (مو من التاريخ).
   الصفحات نفسها ما تنقفل أبدًا — أي رابط مباشر يفتح — بس القائمة ما تعرضها قبل وقتها، عشان الطالب ما يغرق.
   المراجع: الكشف التدريجي (Nielsen)، والتقدّم المُهدى (Nunes & Drèze 2006) — انظر docs/GROWTH_RESEARCH.md */

/** الأبواب اللي تنقفل وتنفتح. الباقي (الرئيسية، المحادثة، الفريق، أبحث) مفتوح من أول يوم */
export type DoorId = "write" | "methodology" | "supervisor" | "calendar" | "collect";

export interface DoorSignals {
  papers: number;
  /** أقسام المقترح اللي فيها نص */
  sectionsWritten: number;
  /** أجزاء المنهجية الجاهزة (من 7) */
  methodReady: number;
  /** الدكتورة مفعّلة الإيميل */
  supervisorLinked: boolean;
  meetings: number;
  events: number;
  files: number;
  surveys: number;
  /** «بدأتوا قبل؟» — الفريق قال وين وصل */
  stage: TeamStage | null;
}

export const EMPTY_SIGNALS: DoorSignals = { papers: 0, sectionsWritten: 0, methodReady: 0, supervisorLinked: false, meetings: 0, events: 0, files: 0, surveys: 0, stage: null };

/** ترتيب الانفتاح (الباب «الجاي» المقفل اللي يطلع بالقائمة هو أول واحد مقفل بهالترتيب) */
export const DOOR_ORDER: DoorId[] = ["write", "methodology", "supervisor", "calendar", "collect"];

const level = (s: TeamStage | null) => (s === "proposal" ? 2 : s === "ethics" ? 3 : s === "collecting" ? 4 : 0);

export function openDoors(s: DoorSignals): Set<DoorId> {
  const lv = level(s.stage);
  const open = new Set<DoorId>();
  if (s.papers > 0 || s.sectionsWritten > 0 || lv >= 2) open.add("write");
  if (s.sectionsWritten > 0 || s.methodReady > 0 || lv >= 3) open.add("methodology");
  if (s.supervisorLinked || s.meetings > 0 || s.sectionsWritten > 0 || lv >= 3) open.add("supervisor");
  if (s.events > 0 || s.files > 0 || s.meetings > 0 || open.has("supervisor")) open.add("calendar");
  if (s.methodReady >= 4 || s.surveys > 0 || lv >= 4) open.add("collect");
  return open;
}

/** «الجاي»: أول باب مقفل، ووش يفتحه (سطر واحد) */
export function nextDoor(open: Set<DoorId>): DoorId | null {
  return DOOR_ORDER.find((d) => !open.has(d)) ?? null;
}

export const DOOR_HINT: Record<DoorId, string> = {
  write: tr("ينفتح لما تضيفون أول دراسة"),
  methodology: tr("تنفتح لما تكتبون أول قسم بالمقترح"),
  supervisor: tr("ينفتح مع أول قسم أو اجتماع"),
  calendar: tr("ينفتح مع أول موعد أو ملف"),
  collect: tr("ينفتح لما تجهز المنهجية (4 من 7)"),
};

export const DOOR_UNLOCKED: Record<DoorId, { title: string; sub: string; to: string }> = {
  write: { title: tr("انفتح لكم: المقترح"), sub: tr("اكتبوا أول قسم من دراساتكم"), to: "/proposal" },
  methodology: { title: tr("انفتحت لكم: المنهجية"), sub: tr("وكمان الموافقة الأخلاقية"), to: "/methodology" },
  supervisor: { title: tr("انفتح لكم: المشرف/ة"), sub: tr("خلّوا الدكتورة تشوف شغلكم"), to: "/meeting-minutes" },
  calendar: { title: tr("انفتح لكم: التقويم والملفات"), sub: tr("مواعيدكم وملفاتكم بمكان واحد"), to: "/calendar" },
  collect: { title: tr("انفتح لكم: جمع البيانات"), sub: tr("الاستبيانات والميدان والإحصاء"), to: "/collect" },
};

/** وين ينتمي كل قسم بالقائمة (navSections id) — «write» يحوي المنهجية والأخلاقيات كتبويبات */
export const SECTION_DOOR: Record<string, DoorId | undefined> = {
  write: "write",
  supervisor: "supervisor",
  calendar: "calendar",
  collect: "collect",
};

/** صفحات داخل قسم مفتوح بس بابها الخاص لسا مقفل (المنهجية والأخلاقيات داخل «أكتب») */
export const PAGE_DOOR: Record<string, DoorId | undefined> = {
  "/methodology": "methodology",
  "/ethical-approval": "methodology",
};

/** الأبواب اللي انفتحت من آخر مرة (عشان لحظة الانفتاح تطلع مرة وحدة بس) */
export function newlyOpened(open: Set<DoorId>, seen: DoorId[] | null): DoorId[] {
  if (seen === null) return []; // أول زيارة: ما نحتفل بالموجود، نحفظه بس
  return DOOR_ORDER.filter((d) => open.has(d) && !seen.includes(d));
}

/** رحلة البحث بعشر نقاط — تبدأ من 2 لأن إنشاء الفريق وكتابة الموضوع محسوبين فعلًا (تقدّم صادق، مو مزيّف) */
export function journeyStep(s: DoorSignals, open: Set<DoorId>): number {
  let n = 2;
  if (s.papers >= 1) n++;
  if (s.papers >= 3) n++;
  if (open.has("write") && s.sectionsWritten >= 1) n++;
  if (s.sectionsWritten >= 4) n++;
  if (s.methodReady >= 4) n++;
  if (s.methodReady >= 7) n++;
  if (s.surveys > 0) n++;
  if (level(s.stage) >= 4) n = Math.max(n, 9);
  return Math.min(n, 10);
}
