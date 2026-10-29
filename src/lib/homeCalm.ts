/** حسابات الرئيسية الهادية — كلها من بيانات موجودة (المهام وتواريخ إكمالها، المراحل، موعد التسليم). عرض بس، ما ينحفظ منها شي. */

export interface CalmTask {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  assigneeId: string;
  priority?: string;
  completedAt?: string | null;
}

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(Date.parse(`${d}T00:00:00Z`) + n * DAY);

export const isLate = (t: CalmTask, today: string) => t.status !== "done" && (t.status === "overdue" || t.dueDate < today);

/** كم يوم ورا بعض الفريق خلّص فيه مهمة (ينتهي اليوم أو أمس — عشان ما ينكسر الصبح قبل أول مهمة) */
export function streakDays(completedAt: (string | null | undefined)[], today: string): number {
  const days = new Set(completedAt.filter(Boolean).map((d) => d!.slice(0, 10)));
  let cur = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

/** كم مهمة خلصت بين from (شامل) و to (مو شامل) */
const doneBetween = (tasks: CalmTask[], from: string, to: string) =>
  tasks.filter((t) => t.status === "done" && t.completedAt && t.completedAt.slice(0, 10) >= from && t.completedAt.slice(0, 10) < to).length;

/** «هالأسبوع خلّصتوا X، أحسن من اللي قبله بـ Y» — يرجع null لو ما فيه تحسّن */
export function weeklyImprovement(tasks: CalmTask[], today: string): { thisWeek: number; diff: number } | null {
  const tomorrow = addDays(today, 1);
  const thisWeek = doneBetween(tasks, addDays(today, -6), tomorrow);
  const lastWeek = doneBetween(tasks, addDays(today, -13), addDays(today, -6));
  return thisWeek > lastWeek ? { thisWeek, diff: thisWeek - lastWeek } : null;
}

export interface Pace<T extends CalmTask = CalmTask> {
  onTrack: boolean;
  /** كم مهمة بالأسبوع تحتاجون عشان توصلون في الوقت */
  perWeek: number;
  doneThisWeek: number;
  late: number;
  open: number;
  /** مهام هالأسبوع المقترحة (الأقرب موعد، بعدد perWeek وبحد أقصى ٣) */
  thisWeek: T[];
}

/** ماشين صح ولا متأخرين؟ من المهام الباقية والأيام الباقية */
export function paceStatus<T extends CalmTask>(tasks: T[], today: string, daysLeft: number): Pace<T> {
  const open = tasks.filter((t) => t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const late = open.filter((t) => isLate(t, today)).length;
  const weeksLeft = Math.max(1, Math.ceil(Math.max(daysLeft, 0) / 7));
  const perWeek = open.length === 0 ? 0 : Math.ceil(open.length / weeksLeft);
  const doneThisWeek = doneBetween(tasks, addDays(today, -6), addDays(today, 1));
  const onTrack = late === 0 && (open.length === 0 || doneThisWeek >= perWeek || open.every((t) => t.dueDate > addDays(today, 7)));
  return { onTrack, perWeek, doneThisWeek, late, open: open.length, thisWeek: open.slice(0, Math.min(3, Math.max(perWeek, 1))) };
}

/** «وش علينا اليوم؟»: المتأخر أول ثم اللي موعده اليوم — ٣ بالكثير */
export function todayList<T extends CalmTask>(tasks: T[], today: string, limit = 3): T[] {
  const open = tasks.filter((t) => t.status !== "done");
  const late = open.filter((t) => isLate(t, today)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const due = open.filter((t) => !isLate(t, today) && t.dueDate === today);
  return [...late, ...due].slice(0, limit);
}

/** باقي على الموعد: أيام كاملة + ساعات (الموعد = نهاية يومه). ما فيه دقايق ولا ثواني */
export function timeLeft(deadline: string, now: Date): { days: number; hours: number } {
  const end = new Date(`${deadline}T23:59:59`);
  const ms = Math.max(0, end.getTime() - now.getTime());
  return { days: Math.floor(ms / DAY), hours: Math.floor((ms % DAY) / 3600000) };
}

export type TodoKind = "done" | "late" | "today" | "next";

/** «وش علينا اليوم؟» كـ To-do: المنجزة اليوم أول (باهتة)، ثم المتأخرة، ثم اليوم، ثم الجاية — limit بالكثير.
    pinned: مهام انضغطت بهالجلسة تبقى بمكانها الأصلي بالقائمة (ما تقفز فوق لما تخلص).
    done/total: عدّاد الشريط — منجزة اليوم من (منجزة اليوم + متأخرة + موعدها اليوم). */
export function todoList<T extends CalmTask>(
  tasks: T[],
  today: string,
  opts: { doneToday?: Set<string>; pinned?: Map<string, TodoKind>; limit?: number } = {},
): { items: { task: T; kind: TodoKind }[]; done: number; total: number } {
  const { doneToday = new Set<string>(), pinned = new Map<string, TodoKind>(), limit = 4 } = opts;
  const kindOf = (t: T): TodoKind | null => {
    if (t.status === "done") return doneToday.has(t.id) || t.completedAt?.slice(0, 10) === today ? "done" : null;
    if (isLate(t, today)) return "late";
    return t.dueDate === today ? "today" : "next";
  };
  const rank: Record<TodoKind, number> = { done: 0, late: 1, today: 2, next: 3 };
  const rows = tasks.map((task) => ({ task, kind: kindOf(task) })).filter((r): r is { task: T; kind: TodoKind } => r.kind !== null);
  const sortKind = (r: { task: T; kind: TodoKind }) => pinned.get(r.task.id) ?? r.kind;
  rows.sort((a, b) => rank[sortKind(a)] - rank[sortKind(b)] || a.task.dueDate.localeCompare(b.task.dueDate) || a.task.id.localeCompare(b.task.id));
  const done = rows.filter((r) => r.kind === "done").length;
  const total = done + rows.filter((r) => r.kind === "late" || r.kind === "today").length;
  return { items: rows.slice(0, limit), done, total };
}

/** إنجاز الفريق بالأسابيع (الأقدم أول): done = مهام خلصت بالأسبوع (تاريخ الإكمال، وإلا موعدها لو ما انحفظ التاريخ)،
    planned = مهام موعدها بنفس الأسبوع. الأسبوع الأخير ينتهي اليوم. */
export function weeklySeries(tasks: CalmTask[], today: string, weeks: number): { done: number; planned: number }[] {
  const out: { done: number; planned: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = addDays(today, -7 * i - 6);
    const to = addDays(today, -7 * i + 1);
    const inWeek = (d: string | null | undefined) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) < to;
    out.push({
      done: tasks.filter((t) => t.status === "done" && inWeek(t.completedAt ?? t.dueDate)).length,
      planned: tasks.filter((t) => inWeek(t.dueDate)).length,
    });
  }
  return out;
}
