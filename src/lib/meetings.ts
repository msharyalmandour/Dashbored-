import type {
  ApprovalStatus,
  DecisionRequestRow,
  MeetingBookingRow,
  MinutesActionRow,
  MinutesApprovalRow,
  SupervisorAvailabilityRow,
  Task,
} from "../data/types";
import { addDaysISO, formatDateLong, parseDate } from "./date";

/** الصمت = موافقة: لو المشرفة ما ردّت خلال هذي المدة يُحسب المحضر «معتمد تلقائيًا» (يطابق قاعدة البيانات) */
export const AUTO_APPROVE_HOURS = 48;

export function effectiveApproval(
  a: Pick<MinutesApprovalRow, "status" | "requestedAt"> | undefined,
  nowMs: number = Date.now(),
): ApprovalStatus {
  if (!a) return "none";
  if (a.status === "pending" && nowMs - new Date(a.requestedAt).getTime() >= AUTO_APPROVE_HOURS * 3600_000) return "auto_approved";
  return a.status;
}

export const APPROVAL_LABEL: Record<ApprovalStatus, { label: string; tone: "muted" | "amber" | "green" | "rose" }> = {
  none: { label: "ما أُرسل للاعتماد", tone: "muted" },
  pending: { label: "بانتظار اعتماد المشرف/ة", tone: "amber" },
  approved: { label: "معتمد من المشرف/ة", tone: "green" },
  auto_approved: { label: "معتمد تلقائيًا (ما وصل اعتراض)", tone: "green" },
  changes_requested: { label: "المشرف/ة طلب تعديل", tone: "rose" },
};

/** كم بند من بنود المحضر خلص (مهمته منجزة) */
export function actionProgress(actions: MinutesActionRow[], tasks: Pick<Task, "id" | "status">[]): { total: number; done: number } {
  const done = actions.filter((a) => a.taskId && tasks.some((t) => t.id === a.taskId && t.status === "done")).length;
  return { total: actions.length, done };
}

export function isActionDone(action: MinutesActionRow, tasks: Pick<Task, "id" | "status">[]): boolean {
  return !!action.taskId && tasks.some((t) => t.id === action.taskId && t.status === "done");
}

export const supervisorLink = (origin: string, token: string) => `${origin.replace(/\/$/, "")}/#/supervisor/${token}`;
export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** ٣ أسئلة مناسبة لكل مرحلة — حتى يكفي اجتماع ١٠ دقايق */
const STAGE_QUESTIONS: Record<string, string[]> = {
  topic: ["هل عنوان بحثنا واضح ومناسب لحجم المشروع؟", "هل الفئة والمتغيرات محددة بشكل كافٍ؟", "هل توافقون على المضي بهذا الموضوع؟"],
  proposal: ["أي قسم بالمقترح تفضّلون نركّز عليه أول؟", "هل مشكلة البحث مبررة بشكل كافٍ؟", "هل صياغة الأهداف والأسئلة مناسبة؟"],
  "literature-review": ["هل الدراسات اللي جمعناها كافية وحديثة؟", "هل عندكم كلمات بحث أو قواعد بيانات إضافية تقترحونها؟", "هل ترتيبنا للدراسات حسب المحاور مناسب؟"],
  "research-gap": ["هل الفجوة اللي كتبناها مبررة بالدراسات؟", "هل الفجوة محلية بما يكفي؟", "كيف نربطها بأسئلة البحث؟"],
  "research-questions": ["هل أسئلة البحث قابلة للقياس؟", "هل عددها مناسب؟", "هل ترتيبها منطقي؟"],
  methodology: ["هل تصميم الدراسة مناسب لأسئلتنا؟", "هل حجم العينة وطريقة اختيارها مقبولين؟", "هل الأداة المختارة معتمدة ومناسبة؟"],
  "data-collection": ["هل نموذج الموافقة والخطابات جاهزة للتوزيع؟", "ما الخطوة المطلوبة قبل بدء جمع البيانات؟", "كم عدد الاستجابات المقبول للبدء بالتحليل؟"],
  analysis: ["هل الاختبارات الإحصائية المختارة مناسبة؟", "كيف نعرض النتائج بالجداول؟", "هل نتائجنا تحتاج مراجعة قبل الكتابة؟"],
  writing: ["هل بنية الفصول مناسبة؟", "هل أسلوب التوثيق (APA) مضبوط؟", "متى يناسبكم استلام المسودة الأولى؟"],
  "final-submission": ["ما المتبقي قبل التسليم النهائي؟", "هل جاهزين لتدريب المناقشة؟", "هل الموعد النهائي ثابت؟"],
};
const GENERIC_QUESTIONS = ["وين نحن حاليًا مقارنة بالخطة؟", "وش أهم شي نركّز عليه قبل الاجتماع الجاي؟", "هل فيه شي نغفل عنه؟"];

export function stageQuestions(stageKey?: string): string[] {
  return (stageKey && STAGE_QUESTIONS[stageKey]) || GENERIC_QUESTIONS;
}

export interface ReadinessInput {
  today: string;
  lastMeetingDate?: string;
  lastActions: MinutesActionRow[];
  tasks: Task[];
  memberName: (id: string | null | undefined) => string;
  openDecisions: DecisionRequestRow[];
  stageKey?: string;
}

export interface Readiness {
  agendaText: string;
  openActions: MinutesActionRow[];
  doneCount: number;
  totalCount: number;
  overdueTasks: Task[];
  openDecisions: DecisionRequestRow[];
  questions: string[];
  isEmpty: boolean;
}

/** يبني «جاهزية الاجتماع» من بياناتنا: بنود الاجتماع السابق غير المنجزة + المتأخر + قرارات معلّقة + أسئلة المرحلة */
export function buildReadiness(input: ReadinessInput): Readiness {
  const { lastActions, tasks, openDecisions } = input;
  const openActions = lastActions.filter((a) => !isActionDone(a, tasks));
  const doneCount = lastActions.length - openActions.length;
  const overdueTasks = tasks.filter((t) => t.status !== "done" && (t.status === "overdue" || (!!t.dueDate && t.dueDate < input.today))).slice(0, 6);
  const questions = stageQuestions(input.stageKey);

  const lines: string[] = [`جدول أعمال الاجتماع — ${formatDateLong(input.today)}`, ""];
  let n = 1;
  if (lastActions.length > 0) {
    lines.push(`${n++}) متابعة بنود الاجتماع السابق (${doneCount} من ${lastActions.length} منجزة)`);
    for (const a of lastActions) {
      const who = a.assigneeId ? ` — ${input.memberName(a.assigneeId)}` : "";
      lines.push(`   ${isActionDone(a, tasks) ? "✓" : "○"} ${a.text}${who}`);
    }
    lines.push("");
  }
  if (overdueTasks.length > 0) {
    lines.push(`${n++}) مهام متأخرة (${overdueTasks.length})`);
    for (const t of overdueTasks) lines.push(`   • ${t.title} — ${input.memberName(t.assigneeId)}`);
    lines.push("");
  }
  if (openDecisions.length > 0) {
    lines.push(`${n++}) قرارات بانتظار المشرف/ة (${openDecisions.length})`);
    for (const d of openDecisions) lines.push(`   • ${d.question}`);
    lines.push("");
  }
  lines.push(`${n}) أسئلتنا للمشرف/ة`);
  for (const q of questions) lines.push(`   • ${q}`);

  return {
    agendaText: lines.join("\n"),
    openActions,
    doneCount,
    totalCount: lastActions.length,
    overdueTasks,
    openDecisions,
    questions,
    isEmpty: lastActions.length === 0 && overdueTasks.length === 0 && openDecisions.length === 0,
  };
}

export interface SlotDay {
  date: string;
  times: string[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** أوقات المشرفة المتاحة للأيام القادمة، بدون الأوقات الماضية ولا المحجوزة */
export function generateSlots(
  av: Pick<SupervisorAvailabilityRow, "windows" | "slotMinutes"> | null,
  bookings: Pick<MeetingBookingRow, "date" | "time" | "status">[],
  fromIso: string,
  days: number,
  now: Date,
  marginMinutes = 30,
): SlotDay[] {
  if (!av || av.windows.length === 0) return [];
  const taken = new Set(bookings.filter((b) => b.status === "pending" || b.status === "confirmed").map((b) => `${b.date}T${b.time}`));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out: SlotDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(fromIso, i);
    const weekday = parseDate(date).getDay();
    const times: string[] = [];
    for (const w of av.windows.filter((x) => x.weekday === weekday)) {
      for (let m = toMinutes(w.start); m + av.slotMinutes <= toMinutes(w.end); m += av.slotMinutes) {
        if (i === 0 && m < nowMin + marginMinutes) continue;
        const t = fromMinutes(m);
        if (!taken.has(`${date}T${t}`)) times.push(t);
      }
    }
    if (times.length > 0) out.push({ date, times: [...new Set(times)].sort() });
  }
  return out;
}

export const WEEKDAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** رسائل واتساب الجاهزة للمشرف/ة (رابطها بدون حساب) — نفس أسلوب «أنا عالق» و«شارك التحديث» */
export const approvalRequestMessage = (dateLong: string, link: string) =>
  `السلام عليكم ورحمة الله،\nأرسلنا لكم محضر اجتماعنا بتاريخ ${dateLong} للاعتماد. تقدرون تعتمدونه أو تطلبون تعديلًا بضغطة وحدة، بدون تسجيل دخول:\n${link}\n\nشاكرين وقتكم.\n(أُرسلت من Wesync)`;

export const decisionRequestMessage = (question: string, link: string) =>
  `السلام عليكم ورحمة الله،\nعندنا سؤال يحتاج قراركم (بضغطة وحدة، بدون اجتماع):\n«${question}»\n${link}\n\nشاكرين وقتكم.\n(أُرسلت من Wesync)`;

export const bookingRequestMessage = (dateLong: string, time: string, link: string) =>
  `السلام عليكم ورحمة الله،\nاقترحنا موعد اجتماع يوم ${dateLong} الساعة ${time}. تقدرون تؤكدونه أو تعتذرون من هنا:\n${link}\n\nشاكرين وقتكم.\n(أُرسلت من Wesync)`;

export const availabilityRequestMessage = (link: string) =>
  `السلام عليكم ورحمة الله،\nحتى نرتب مواعيد الاجتماعات بدون ما نأخذ من وقتكم، ممكن تحددون أوقاتكم المتاحة مرة وحدة من رابطكم (بدون تسجيل دخول)؟ بعدها نحجز من الأوقات اللي تحددونها فقط:\n${link}\n\nشاكرين وقتكم.\n(أُرسلت من Wesync)`;
