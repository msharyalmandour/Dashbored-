import { tr } from "./i18n";

/** منطق «لمسات الوكيل» (بطاقة الوضع، الردود السريعة): قواعد ثابتة بدون ذكاء ولا تكلفة. التصميم بملفات components/agent/. */

export interface StatusInput {
  today: string;
  tasks: { title: string; status: string; dueDate: string }[];
  stages: { titleAr: string; status: string; progress: number; targetDate: string | null }[];
  events: { title: string; date: string; time: string }[];
}

export interface StatusSnapshot {
  done: number;
  total: number;
  percent: number;
  overdue: number;
  stage: { title: string; progress: number } | null;
  nextEvent: { title: string; date: string; time: string; inDays: number } | null;
  nextTask: { title: string; dueDate: string } | null;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

/** هل سؤال المستخدم عن «وين وصلنا / وضعنا»؟ */
export function isStatusQuestion(text: string): boolean {
  return /(وين\s*وصلنا|وين\s*وصلت|وضعنا|وضع\s*(المشروع|البحث)|ملخص|تقدمنا|نسبة\s*التقدم|وش\s*(المتأخر|اللي\s*متأخر)|المتأخر)/.test(text);
}

export function buildStatus(i: StatusInput): StatusSnapshot {
  const done = i.tasks.filter((t) => t.status === "done").length;
  const open = i.tasks.filter((t) => t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const current = i.stages.find((s) => s.status === "active") ?? i.stages.find((s) => s.status !== "done");
  const ev = i.events.filter((e) => e.date >= i.today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  return {
    done,
    total: i.tasks.length,
    percent: i.tasks.length ? Math.round((done / i.tasks.length) * 100) : 0,
    overdue: open.filter((t) => t.dueDate && t.dueDate < i.today).length,
    stage: current ? { title: current.titleAr, progress: current.progress } : null,
    nextEvent: ev ? { title: ev.title, date: ev.date, time: ev.time, inDays: daysBetween(i.today, ev.date) } : null,
    nextTask: open[0] ? { title: open[0].title, dueDate: open[0].dueDate } : null,
  };
}

export interface QuickReply {
  label: string;
  ask: string;
}

/** ٢–٣ ردود سريعة منطقية بعد رد الوكيل، حسب نوع الإجراءات وسؤال المستخدم */
export function quickRepliesFor(input: { question: string; actionTypes: string[]; isLeader: boolean; status?: StatusSnapshot }): QuickReply[] {
  const out: QuickReply[] = [];
  const has = (t: string) => input.actionTypes.includes(t);
  if (input.status) {
    if (input.status.overdue > 0) out.push({ label: tr("وش نسوي بالمتأخر؟"), ask: tr("اقترح علينا خطة للمهام المتأخرة") });
    if (input.isLeader) out.push({ label: tr("وزّع مهام الأسبوع"), ask: tr("وزّع مهام الأسبوع على الأعضاء") });
    out.push({ label: tr("جهّز اجتماع المشرف"), ask: tr("وش ناقص قبل اجتماعنا مع المشرف/ة؟") });
  }
  if (has("add_task") && input.isLeader) out.push({ label: tr("ضيف موعد مراجعة"), ask: tr("ضيف موعد مراجعة للمهام هذي بالتقويم") });
  if (has("add_questions") || has("set_aim")) out.push({ label: tr("راجع المقترح"), ask: "__review__" });
  if (has("add_feedback_items")) out.push({ label: tr("حوّلها لمهام"), ask: tr("حوّل ملاحظات المشرف المفتوحة لمهام موزّعة على الأعضاء") });
  if (has("add_event")) out.push({ label: tr("ذكّرنا قبلها بيوم"), ask: tr("ضيف تذكير قبل الموعد بيوم") });
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true))).slice(0, 3);
}

/** خطوات «الوكيل يشتغل» الحقيقية بدل جمل عامة */
export const THINKING_STEPS = [tr("أقرأ مهامكم ومرحلتكم الحالية"), tr("أراجع الأهداف والأسئلة المحفوظة"), tr("أجهّز الاقتراح")];
