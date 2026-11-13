import type { AgentAction } from "../hooks/useProjectAgent";
import type { TaskStatus } from "../data/types";
import { tr } from "./i18n";

/* الوكيل (المرحلة 7): يعرف ← يقترح ← توافقون ← ينفّذ ← إيصال + تراجع.
   هنا المنطق الصافي (بدون واجهة): كروت «يحتاجكم الحين»، صفوف الخطة، الإيصال، ونافذة التراجع (24 ساعة). */

export const UNDO_WINDOW_MS = 24 * 3600_000;

// ───────────── «يحتاجكم الحين»: 3 كروت بالكثير من بيانات الفريق الحقيقية ─────────────

export type NeedIcon = "question" | "note" | "calendar" | "clock" | "user" | "flag" | "proof";

/** وش يصير لما تضغطون زر الكرت: خطة جاهزة (بدون ذكاء)، أو سؤال للوكيل، أو تنقّل لصفحة */
export type NeedGo = { kind: "plan"; request: string; actions: AgentAction[]; why: string } | { kind: "ask"; text: string } | { kind: "open"; to: string };

export interface NeedCard {
  id: string;
  icon: NeedIcon;
  title: string;
  sub: string;
  pill: string;
  button: string;
  go: NeedGo;
}

export interface NeedsInput {
  today: string;
  isLeader: boolean;
  me: string;
  members: { id: string; name: string }[];
  questions: string[];
  /** ملاحظات المشرف/ة المفتوحة */
  feedback: { id: string; comment: string; assigneeId: string | null; feedbackDate: string }[];
  supervisorName: string;
  tasks: { id: string; title: string; assigneeId: string; dueDate: string; status: string }[];
  /** أقرب اجتماع جاي (لو فيه) */
  nextMeeting: { title: string; date: string } | null;
  sections: { key: string; ownerId: string | null }[];
  deadline: string | null;
}

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;
const dayMs = 86400_000;
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / dayMs);

/** يوم الأسبوع بالعربي/الإنجليزي لتاريخ ISO */
export function weekday(iso: string): string {
  const names = [tr("الأحد"), tr("الاثنين"), tr("الثلاثاء"), tr("الأربعاء"), tr("الخميس"), tr("الجمعة"), tr("السبت")];
  return names[new Date(`${iso}T12:00:00`).getDay()] ?? "";
}

/** أخف واحد شغلًا (أقل مهام مفتوحة) — اللي نقترح نعطيه الشغل الجديد */
export function lightestMember(members: NeedsInput["members"], tasks: NeedsInput["tasks"]): NeedsInput["members"][number] | undefined {
  const open = (id: string) => tasks.filter((t) => t.assigneeId === id && t.status !== "done").length;
  return [...members].sort((a, b) => open(a.id) - open(b.id))[0];
}

export function buildNeeds(i: NeedsInput): NeedCard[] {
  const out: NeedCard[] = [];
  const supName = i.supervisorName.trim() || tr("المشرف/ة");

  // 1) أسئلة بحث كثيرة → اقتراح دمجها (الوكيل يجهّز set_questions، وأنتم توافقون)
  if (i.questions.length > 3) {
    out.push({
      id: "questions",
      icon: "question",
      title: tr("{0} أسئلة بحث كثيرة", i.questions.length),
      sub: tr("أغلب مشاريع التخرج تكفيها 3. أقدر أدمجها لكم."),
      pill: tr("3 بدل {0}", i.questions.length),
      button: tr("وريني الاقتراح"),
      go: { kind: "ask", text: tr("ادمج أسئلة البحث عندنا ({0}) في 3 أسئلة واضحة، واقترحها كقائمة جديدة.", i.questions.length) },
    });
  }

  // 2) ملاحظة من المشرف/ة ما لها صاحب → خطة جاهزة: مهمة لأخف واحد، موعدها بعد يومين
  // ما لها صاحب = ما فيه مسؤول ولا انسوت لها مهمة بنفس النص (بعد «عطوها لـ…» تختفي)
  const taskTitles = new Set(i.tasks.map((t) => t.title.trim()));
  const orphan = i.feedback.find((f) => !f.assigneeId && !taskTitles.has(f.comment.trim()));
  const who = lightestMember(i.members, i.tasks);
  if (orphan && who) {
    const due = new Date(Date.parse(`${i.today}T12:00:00`) + 2 * dayMs).toISOString().slice(0, 10);
    const comment = orphan.comment.length > 70 ? `${orphan.comment.slice(0, 70)}…` : orphan.comment;
    out.push({
      id: `feedback-${orphan.id}`,
      icon: "note",
      title: tr("ملاحظة {0} ما لها صاحب", supName),
      sub: `«${comment}»`,
      pill: `${first(who.name)} · ${weekday(due)}`,
      button: tr("عطوها ل{0}", first(who.name)),
      go: i.isLeader
        ? {
            kind: "plan",
            request: tr("عطوا ملاحظة {0} ل{1}", supName, first(who.name)),
            why: tr("{0} عنده أقل مهام مفتوحة بالفريق، والملاحظة لها {1} يوم بدون صاحب.", first(who.name), Math.max(0, daysBetween(orphan.feedbackDate, i.today))),
            actions: [{ type: "add_task", title: orphan.comment, description: tr("من ملاحظة {0}", supName), days: 2, priority: "high", assigneeId: who.id, assigneeName: who.name }],
          }
        : { kind: "ask", text: tr("ملاحظة {0} «{1}» ما لها صاحب. مين الأنسب لها؟", supName, orphan.comment) },
    });
  }

  // 3) اجتماع قريب (خلال 7 أيام) → جدول أعمال من شغل الأسبوع
  if (i.nextMeeting) {
    const inDays = daysBetween(i.today, i.nextMeeting.date);
    if (inDays >= 0 && inDays <= 7) {
      const late = i.tasks.filter((t) => t.status !== "done" && t.dueDate < i.today).length;
      const items = Math.min(5, Math.max(3, late + i.feedback.length));
      out.push({
        id: "meeting",
        icon: "calendar",
        title: inDays === 0 ? tr("اجتماع اليوم بدون جدول أعمال") : tr("اجتماع {0} بدون جدول أعمال", weekday(i.nextMeeting.date)),
        sub: tr("أجهّز لكم {0} بنود من شغلكم هالأسبوع.", items),
        pill: tr("{0} بنود", items),
        button: tr("جهّزوا الجدول"),
        go: { kind: "ask", text: tr("جهّز جدول أعمال لاجتماع «{0}» ({1}): اللي خلّصناه، والمتأخر، وملاحظات المشرف/ة المفتوحة، والأسئلة اللي نبي نسألها.", i.nextMeeting.title, i.nextMeeting.date) },
      });
    }
  }

  // 4) مهام عدّى موعدها
  const late = i.tasks.filter((t) => t.status !== "done" && !!t.dueDate && t.dueDate < i.today);
  if (late.length) {
    const oldest = [...late].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    out.push({
      id: "late",
      icon: "clock",
      title: tr("{0} مهام عدّى موعدها", late.length),
      sub: tr("أقدمها «{0}» من {1} يوم.", oldest.title, daysBetween(oldest.dueDate, i.today)),
      pill: tr("مواعيد جديدة"),
      button: tr("رتّبوا المواعيد"),
      go: { kind: "ask", text: tr("عندنا {0} مهام متأخرة. اقترح مواعيد جديدة واقعية لكل وحدة، ومين يحتاج مساعدة.", late.length) },
    });
  }

  // 5) أقسام المقترح بدون مسؤول
  const noOwner = i.sections.filter((s) => !s.ownerId).length;
  if (i.sections.length && noOwner) {
    out.push({
      id: "owners",
      icon: "user",
      title: tr("{0} من {1} أقسام بدون مسؤول", noOwner, i.sections.length),
      sub: tr("القسم اللي ما له اسم ما أحد بيكتبه."),
      pill: tr("على {0} أشخاص", Math.max(1, i.members.length)),
      button: tr("وزّعوا الأقسام"),
      go: { kind: "open", to: "/proposal" },
    });
  }

  // 6) بدون موعد تسليم
  if (!i.deadline) {
    out.push({ id: "deadline", icon: "flag", title: tr("ما فيه موعد تسليم"), sub: tr("بدونه ما نقدر نقول لكم إذا أنتم متأخرين."), pill: tr("دقيقة"), button: tr("حطّوا الموعد"), go: { kind: "open", to: "/" } });
  }

  return out.slice(0, 3);
}

// ───────────── الخطة: كل إجراء يكتب/يرسل/يحذف يصير صف بمفتاح ─────────────

export interface PlanRow {
  key: string;
  action: AgentAction;
  title: string;
  sub: string;
  ownerId: string | null;
  /** الموعد (ISO) للمهام والمواعيد */
  due: string | null;
  /** يقدر المستخدم يوافق عليه؟ (إنشاء المهام للقائد) */
  allowed: boolean;
  blockedWhy: string;
}

const PLACE: Record<string, string> = {
  set_aim: tr("المقترح · الهدف"),
  set_gap: tr("المقترح · الفجوة"),
  add_questions: tr("المقترح · أسئلة البحث"),
  set_questions: tr("المقترح · أسئلة البحث"),
  update_task: tr("المهام"),
  add_event: tr("التقويم"),
  add_task: tr("المهام"),
  remember: tr("ذاكرة المشروع"),
  forget: tr("ذاكرة المشروع"),
  add_feedback_items: tr("ملاحظات المشرف/ة"),
};

export const isWrite = (a: AgentAction) => a.type !== "open";

export function planRows(actions: AgentAction[], ctx: { today: string; isLeader: boolean; canWrite: boolean; me: string }): PlanRow[] {
  return actions.filter(isWrite).map((a, k) => {
    const key = `${k}-${a.type}`;
    let title = "";
    let due: string | null = null;
    let ownerId: string | null = null;
    const place = PLACE[a.type] ?? "";
    switch (a.type) {
      case "add_task":
        title = a.title;
        due = new Date(Date.parse(`${ctx.today}T12:00:00`) + Math.max(0, a.days) * dayMs).toISOString().slice(0, 10);
        ownerId = a.assigneeId ?? null;
        break;
      case "update_task":
        title = tr("«{0}» ← {1}", a.title, a.status === "done" ? tr("خلصت") : a.status === "in-progress" ? tr("قيد التنفيذ") : tr("ما بدأت"));
        break;
      case "add_event":
        title = a.title;
        due = a.date;
        break;
      case "set_aim":
        title = tr("الهدف: {0}", a.text);
        break;
      case "set_gap":
        title = tr("الفجوة: {0}", a.text);
        break;
      case "add_questions":
        title = tr("أضيفوا {0} أسئلة بحث", a.texts.length);
        break;
      case "set_questions":
        title = tr("أسئلة البحث تصير {0}", a.texts.length);
        break;
      case "remember":
        title = tr("تذكّروا: {0}", a.note);
        break;
      case "forget":
        title = tr("انسوا: {0}", a.note);
        break;
      case "add_feedback_items":
        title = tr("{0} ملاحظات للمتتبّع", a.items.length);
        ownerId = a.items[0]?.assigneeId ?? null;
        break;
    }
    const sub = [due ? weekday(due) : "", place].filter(Boolean).join(" · ");
    const allowed = ctx.canWrite && (a.type === "add_task" ? ctx.isLeader : a.type === "update_task" ? a.allowed !== false : true);
    const blockedWhy = allowed ? "" : !ctx.canWrite ? tr("ما عندكم صلاحية تعديل") : a.type === "add_task" ? tr("إنشاء المهام للقائد") : tr("مهمة عضو ثاني");
    return { key, action: a, title, sub, ownerId, due, allowed, blockedWhy };
  });
}

/** يطبّق تعديلات «عدّلوا» (صاحب جديد/موعد جديد) على الإجراء قبل التنفيذ */
export function withEdits(row: PlanRow, edit: { ownerId?: string | null; due?: string | null }, today: string): AgentAction {
  const a = row.action;
  if (a.type === "add_task") {
    const due = edit.due ?? row.due;
    return { ...a, assigneeId: edit.ownerId ?? a.assigneeId, days: due ? Math.max(0, daysBetween(today, due)) : a.days };
  }
  if (a.type === "add_event" && edit.due) return { ...a, date: edit.due };
  return a;
}

// ───────────── الإيصال + التراجع ─────────────

/** كيف نرجع اللي انسوى — ينحفظ بسجل agent_actions عشان التراجع يشتغل حتى بعد ما تقفلون اللوحة */
export type UndoPayload =
  | { kind: "delete_task"; id: string }
  | { kind: "task_status"; id: string; status: TaskStatus }
  | { kind: "delete_event"; id: string }
  | { kind: "set_aim"; text: string }
  | { kind: "set_gap"; text: string }
  | { kind: "set_questions"; texts: string[] }
  | { kind: "forget"; id: string }
  | { kind: "remember"; note: string }
  | { kind: "delete_feedback"; ids: string[] }
  | { kind: "none" };

export interface ReceiptItem {
  type: AgentAction["type"];
  label: string;
  to: string;
  diff: { before?: unknown; after?: unknown };
  undo: UndoPayload;
}

export interface Receipt {
  id: string;
  request: string;
  summary: string;
  items: ReceiptItem[];
  createdAt: string;
  approvedByName: string;
  undoneAt: string | null;
}

const ROUTE: Record<string, { to: string; place: string }> = {
  add_task: { to: "/tasks", place: tr("مهامي") },
  update_task: { to: "/tasks", place: tr("مهامي") },
  add_event: { to: "/calendar", place: tr("التقويم") },
  set_aim: { to: "/proposal", place: tr("المقترح") },
  set_gap: { to: "/proposal", place: tr("المقترح") },
  add_questions: { to: "/proposal", place: tr("المقترح") },
  set_questions: { to: "/proposal", place: tr("المقترح") },
  remember: { to: "/", place: tr("الذاكرة") },
  forget: { to: "/", place: tr("الذاكرة") },
  add_feedback_items: { to: "/meeting-minutes", place: tr("المشرف/ة") },
};
export const routeFor = (type: string) => ROUTE[type] ?? { to: "/", place: "" };

/** صفوف الإيصال مجمّعة: «4 مهام انوزعت → مهامي» بدل 4 صفوف */
export function receiptLines(items: ReceiptItem[]): { label: string; to: string; place: string }[] {
  const groups = new Map<string, ReceiptItem[]>();
  for (const it of items) groups.set(it.type, [...(groups.get(it.type) ?? []), it]);
  return [...groups.entries()].map(([type, list]) => {
    const r = routeFor(type);
    const n = list.length;
    const label =
      type === "add_task"
        ? n === 1
          ? tr("مهمة انضافت: {0}", list[0].label)
          : tr("{0} مهام انوزعت", n)
        : type === "add_event"
          ? n === 1
            ? tr("{0} انحط بالتقويم", list[0].label)
            : tr("{0} مواعيد انحطت بالتقويم", n)
          : type === "update_task"
            ? tr("{0} مهام تحدّثت حالتها", n)
            : list.map((x) => x.label).join("، ");
    return { label, to: r.to, place: r.place };
  });
}

export function canUndo(r: Pick<Receipt, "createdAt" | "undoneAt" | "items">, now = Date.now()): boolean {
  return !r.undoneAt && now - Date.parse(r.createdAt) < UNDO_WINDOW_MS && r.items.some((i) => i.undo.kind !== "none");
}

/** «قبل ثواني» / «قبل 5 دقايق» / «قبل ساعتين» */
export function agoLabel(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return tr("قبل ثواني");
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? tr("قبل دقيقة") : tr("قبل {0} دقايق", m);
  const h = Math.round(m / 60);
  return h === 1 ? tr("قبل ساعة") : h === 2 ? tr("قبل ساعتين") : tr("قبل {0} ساعات", h);
}

/** «اللي بعده؟»: اقتراحين منطقيين بعد ما انسوى الشي */
export function nextSuggestions(types: string[], ctx: { nextMeetingTitle?: string | null; busiestName?: string | null }): string[] {
  const out: string[] = [];
  if (types.includes("add_task") && ctx.nextMeetingTitle) out.push(tr("جهّز جدول أعمال «{0}»", ctx.nextMeetingTitle));
  if (types.includes("add_task") && ctx.busiestName) out.push(tr("ذكّر {0} بمهامه المفتوحة", ctx.busiestName));
  if (types.some((t) => t === "set_questions" || t === "add_questions")) out.push(tr("وش المنهجية المناسبة لأسئلتنا؟"));
  if (types.some((t) => t === "set_aim" || t === "set_gap")) out.push(tr("راجع المقترح قبل ما نرسله للمشرف/ة"));
  if (types.includes("add_event")) out.push(tr("وش نجهّز قبل هالموعد؟"));
  out.push(tr("وش أهم شي نسويه هالأسبوع؟"), tr("وش اللي متأخر عندنا؟"));
  return [...new Set(out)].slice(0, 2);
}
