import { supabase } from "./supabaseClient";
import { tr } from "./i18n";
import { formatDateShort } from "./date";
import { proofFor } from "./taskLinks";
import { supervisorCommitments, type SupItem } from "./commitments";
import type { Board } from "../components/supervisor/useSupervisorBoard";

/** لوحة المشرف/ة: كل فريق برمز رابطه (supervisor_dash + get_supervisor_board + supervisor_commitments) */

export type ExtReason = "waiting_hospital" | "exams" | "sick" | "other";
export type ExtStatus = "pending" | "approved" | "countered" | "rejected" | "withdrawn";

export interface DashTask {
  id: string;
  title: string;
  description: string;
  sectionKey: string | null;
  status: "todo" | "in-progress" | "done" | "overdue";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assigneeId: string | null;
  assigneeName: string | null;
  targetCount: number | null;
  source: string | null;
}
export interface DashExtension {
  id: string;
  taskId: string;
  taskTitle: string | null;
  requestedBy: string | null;
  currentDue: string | null;
  requestedDue: string;
  reason: ExtReason;
  note: string;
  status: ExtStatus;
  finalDue: string | null;
  supervisorNote: string;
  createdAt: string;
  resolvedAt: string | null;
}
export type LogAction = "requested" | "approved" | "countered" | "rejected" | "withdrawn" | "due_changed" | "deadline_changed" | "away_on" | "away_off";
export interface DashLog {
  id: string;
  actor: "student" | "supervisor";
  actorName: string;
  action: LogAction;
  taskTitle: string;
  from: string | null;
  to: string | null;
  note: string;
  at: string;
}
export interface DashAway {
  from: string;
  to: string;
  reason: string;
  moveMeetings: boolean;
  deferRequests: boolean;
  messageStudents: boolean;
  moved: number;
  name: string;
}
export interface Dash {
  teamName: string;
  today: string;
  project: { title: string; startDate: string | null; deadline: string | null; createdAt: string } | null;
  members: { id: string; name: string; initials: string; role: string; lastActiveAt: string | null }[];
  tasks: DashTask[];
  papers: { addedById: string | null; lit: boolean }[];
  sections: { key: string; written: boolean }[];
  bookings: { id: string; date: string; time: string; durationMin: number; status: "pending" | "confirmed" }[];
  lastTeamMessage: { body: string; at: string } | null;
  extensions: DashExtension[];
  log: DashLog[];
  away: DashAway | null;
}

export interface TeamData {
  token: string;
  name: string;
  state: "loading" | "ok" | "error";
  /** null = ملف SQL المرحلة ٤ ما انطبق بعد */
  dash: Dash | null;
  board: Board | null;
  items: SupItem[];
}

export async function loadTeam(token: string, fallbackName: string): Promise<TeamData> {
  if (!supabase) return { token, name: fallbackName, state: "error", dash: null, board: null, items: [] };
  const [d, b, c] = await Promise.all([
    supabase.rpc("supervisor_dash", { p_token: token }),
    supabase.rpc("get_supervisor_board", { p_token: token }),
    supervisorCommitments(token),
  ]);
  const dash = !d.error && d.data ? (d.data as Dash) : null;
  const board = !b.error && b.data ? (b.data as Board) : null;
  if (!dash && !board) return { token, name: fallbackName, state: "error", dash: null, board: null, items: [] };
  return { token, name: dash?.teamName || board?.teamName || fallbackName, state: "ok", dash, board, items: c?.items ?? [] };
}

// ───────── حسابات ─────────
const DAY = 86400e3;
const ms = (iso: string) => Date.parse(iso.length <= 10 ? `${iso}T12:00:00+03:00` : iso);
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);
export function addDays(iso: string, n: number): string {
  const d = new Date(ms(iso) + n * DAY);
  return d.toISOString().slice(0, 10);
}

/** التقدّم بالدليل: المهمة المعلّمة «خلصت» تنحسب بس لو دليلها موجود (أو ما نقدر نقيسه) */
export function proofProgress(dash: Pick<Dash, "tasks" | "papers" | "sections">): { pct: number; credited: number; total: number } {
  const total = dash.tasks.length;
  if (!total) return { pct: 0, credited: 0, total: 0 };
  const papers = dash.papers.map((p) => ({ addedById: p.addedById ?? "", country: p.lit ? "✓" : "", aim: "", sample: "", dataCollection: "" }));
  const sections = dash.sections.map((s) => ({ key: s.key, content: s.written ? "✓" : "" }));
  const credited = dash.tasks.filter((t) => {
    if (t.status !== "done") return false;
    const p = proofFor({ title: t.title, description: t.description, sectionKey: t.sectionKey ?? undefined, assigneeId: t.assigneeId ?? "", targetCount: t.targetCount }, { papers, sections } as Parameters<typeof proofFor>[1]);
    return !p || p.met;
  }).length;
  return { pct: Math.round((credited / total) * 100), credited, total };
}

/** السرعة: وسيط عدد المهام المنجزة بآخر ٣ أسابيع (لكل أسبوع) */
export function weeklyVelocity(tasks: Pick<DashTask, "status" | "completedAt">[], today: string): number {
  const end = ms(today) + DAY / 2;
  const weeks = [0, 1, 2].map((w) => tasks.filter((t) => t.status === "done" && t.completedAt && ms(t.completedAt) <= end - w * 7 * DAY && ms(t.completedAt) > end - (w + 1) * 7 * DAY).length);
  weeks.sort((a, b) => a - b);
  return weeks[1];
}

export type Tone = "gold" | "orange" | "late";
export interface Radar {
  remaining: number;
  velocity: number;
  /** متى يخلص بسرعتهم الحالية (null = ما فيه سرعة بعد) */
  finish: string | null;
  deadline: string | null;
  /** + = بعد الموعد */
  slip: number | null;
  tone: Tone;
  label: string;
  short: string;
  /** مواقع الخط (0–100) */
  pos: { today: number; finish: number | null; deadline: number | null };
  /** تنبيه: الموعد خلال أسبوعين والتوقع بعده */
  alert: boolean;
}

export function radarOf(dash: Pick<Dash, "tasks" | "project" | "today">): Radar {
  const today = dash.today;
  const remaining = dash.tasks.filter((t) => t.status !== "done").length;
  const velocity = weeklyVelocity(dash.tasks, today);
  const deadline = dash.project?.deadline ?? null;
  const finish = remaining === 0 ? today : velocity > 0 ? addDays(today, Math.ceil((remaining / velocity) * 7)) : null;
  const slip = deadline && finish ? daysBetween(deadline, finish) : null;
  const starts = [dash.project?.startDate, dash.project?.createdAt?.slice(0, 10), ...dash.tasks.map((t) => t.createdAt.slice(0, 10))].filter(Boolean) as string[];
  const start = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : addDays(today, -30);
  const ends = [today, deadline, finish].filter(Boolean) as string[];
  const end = ends.reduce((a, b) => (a > b ? a : b));
  const span = Math.max(1, daysBetween(start, end)) * 1.08;
  const at = (d: string) => Math.min(100, Math.max(0, (daysBetween(start, d) / span) * 100));
  const pos = { today: at(today), finish: finish ? at(finish) : null, deadline: deadline ? at(deadline) : null };
  const left = deadline ? daysBetween(today, deadline) : null;

  let tone: Tone;
  let label: string;
  let short: string;
  if (remaining === 0) {
    tone = "gold";
    label = tr("خلصوا كل المهام");
    short = tr("ماشي");
  } else if (!deadline) {
    tone = "orange";
    label = tr("ما فيه موعد تسليم");
    short = tr("بدون موعد");
  } else if (left !== null && left < 0) {
    tone = "late";
    label = tr("الموعد راح وباقي {0} مهام", remaining);
    short = tr("متأخر");
  } else if (slip === null) {
    tone = "orange";
    label = tr("ما فيه سرعة بعد");
    short = tr("خطر");
  } else if (slip >= 3) {
    tone = "late";
    label = tr("يخلص بعد الموعد بـ {0}", dayCount(slip));
    short = tr("متأخر");
  } else if (slip > -3) {
    tone = "orange";
    label = tr("على الحد");
    short = tr("خطر");
  } else {
    tone = "gold";
    label = tr("قبل الموعد بـ {0}", dayCount(-slip));
    short = tr("ماشي");
  }
  const alert = remaining > 0 && left !== null && left <= 14 && (slip === null ? true : slip >= 3);
  return { remaining, velocity, finish, deadline, slip, tone, label, short, pos, alert };
}

export const dayCount = (n: number) => (n === 1 ? tr("يوم") : n === 2 ? tr("يومين") : n <= 10 ? tr("{0} أيام", n) : tr("{0} يوم", n));

/** طلبات المشرف/ة عند الفريق: ينتظر / قيد / خلص */
export function requestChips(items: SupItem[]): { waiting: number; doing: number; done: number } {
  const mine = items.filter((c) => c.direction === "from_supervisor" && c.status !== "dismissed");
  return {
    waiting: mine.filter((c) => c.status === "proposed" || c.status === "approved").length,
    doing: mine.filter((c) => c.status === "in_progress").length,
    done: mine.filter((c) => c.status === "done").length,
  };
}

export function lastActivity(dash: Pick<Dash, "members"> | null): string | null {
  const all = (dash?.members ?? []).map((m) => m.lastActiveAt).filter(Boolean) as string[];
  return all.length ? all.reduce((a, b) => (a > b ? a : b)) : null;
}

// ───────── «ينتظركم» ─────────
export type WaitKind = "extension" | "receipt" | "minutes" | "decision" | "booking" | "question" | "radar";
export interface WaitItem {
  key: string;
  kind: WaitKind;
  token: string;
  team: string;
  title: string;
  sub: string;
  action: string;
  /** للترتيب: الأقدم أول */
  at: string;
  /** وين يودّي الزر */
  to: string;
  extId?: string;
}

const hoursSince = (iso: string, now: number) => Math.max(1, Math.round((now - Date.parse(iso)) / 3600e3));

export function waitingItems(teams: TeamData[], now = Date.now()): WaitItem[] {
  const out: WaitItem[] = [];
  for (const t of teams) {
    if (t.state !== "ok") continue;
    const base = `/supervisor/${t.token}`;
    for (const e of t.dash?.extensions ?? []) {
      if (e.status !== "pending") continue;
      const n = e.currentDue ? daysBetween(e.currentDue, e.requestedDue) : null;
      out.push({
        key: `ext:${e.id}`, kind: "extension", token: t.token, team: t.name, extId: e.id,
        title: n ? tr("{0} طلب +{1}", e.requestedBy ?? tr("الفريق"), dayCount(n)) : tr("{0} طلب تمديد", e.requestedBy ?? tr("الفريق")),
        sub: `${t.name} · ${e.taskTitle ?? ""}`, action: tr("ردّوا"), at: e.createdAt, to: `?v=requests#ext-${e.id}`,
      });
    }
    for (const c of t.items) {
      if (c.direction !== "from_supervisor" || c.status !== "done" || c.receipt_ack_at) continue;
      out.push({ key: `rc:${c.id}`, kind: "receipt", token: t.token, team: t.name, title: tr("إيصال ينتظر «تمام»"), sub: `${t.name} · ${c.title}`, action: tr("شوفوه"), at: c.done_at ?? c.created_at, to: `${base}?open=receipt:${c.id}` });
    }
    for (const m of t.board?.waiting.minutes ?? []) {
      out.push({ key: `mn:${m.id}`, kind: "minutes", token: t.token, team: t.name, title: tr("محضر ينتظر الاعتماد"), sub: `${t.name} · ${m.meetingDate}`, action: tr("شوفوه"), at: m.requestedAt, to: `${base}?open=minutes:${m.id}` });
    }
    for (const d of t.board?.waiting.decisions ?? []) {
      out.push({ key: `dc:${d.id}`, kind: "decision", token: t.token, team: t.name, title: tr("سؤال ينتظر قرار"), sub: `${t.name} · «${d.question}»`, action: tr("جاوبوا"), at: d.createdAt, to: `${base}?open=decision:${d.id}` });
    }
    for (const b of t.board?.waiting.bookings ?? []) {
      out.push({ key: `bk:${b.id}`, kind: "booking", token: t.token, team: t.name, title: tr("اقتراح موعد"), sub: `${t.name} · ${b.date} ${b.time}`, action: tr("ردّوا"), at: b.createdAt, to: `${base}?open=booking:${b.id}` });
    }
    const q = t.dash?.lastTeamMessage;
    if (q) {
      out.push({ key: `q:${t.token}`, kind: "question", token: t.token, team: t.name, title: tr("سؤال من {0} ساعة", hoursSince(q.at, now)), sub: `${t.name} · «${q.body}»`, action: tr("جاوبوا"), at: q.at, to: `${base}?open=thread:0` });
    }
    if (t.dash) {
      const r = radarOf(t.dash);
      if (r.alert) {
        out.push({
          key: `rd:${t.token}`, kind: "radar", token: t.token, team: t.name,
          title: r.slip !== null ? tr("{0} ممكن يتأخر {1}", t.name, dayCount(r.slip)) : tr("{0} ممكن يتأخر عن الموعد", t.name),
          sub: tr("التسليم {0} · باقي {1} مهام", t.dash.project?.deadline ? formatDateShort(t.dash.project.deadline) : "", r.remaining), action: tr("افتحوا"), at: t.dash.today, to: base,
        });
      }
    }
  }
  const rank: Record<WaitKind, number> = { extension: 0, receipt: 1, minutes: 2, decision: 3, booking: 4, question: 5, radar: 6 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.at.localeCompare(b.at));
}

// ───────── كتابة (برمز الرابط) ─────────
const ERR = () => tr("ما انحفظ — جرّبوا مرة ثانية.");
async function call(fn: string, args: Record<string, unknown>): Promise<{ error: string | null; data?: unknown }> {
  if (!supabase) return { error: ERR() };
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.message.includes("not_pending")) return { error: tr("تم الرد على هذا الطلب مسبقًا.") };
    return { error: ERR() };
  }
  return { error: null, data };
}
export const resolveExtension = (token: string, id: string, decision: "approved" | "countered" | "rejected", date: string | null, note: string, name: string) =>
  call("supervisor_resolve_extension", { p_token: token, p_id: id, p_decision: decision, p_date: date, p_note: note, p_name: name });
export const setTaskDue = (token: string, taskId: string, due: string | null, name: string) => call("supervisor_set_task_due", { p_token: token, p_task_id: taskId, p_due: due, p_name: name });
export const setProjectDeadline = (token: string, date: string | null, name: string) => call("supervisor_set_project_deadline", { p_token: token, p_date: date, p_name: name });
export const setAway = (token: string, a: { from: string; to: string; reason: string; move: boolean; defer: boolean; message: boolean }, name: string) =>
  call("supervisor_set_away", { p_token: token, p_from: a.from, p_to: a.to, p_reason: a.reason, p_move: a.move, p_defer: a.defer, p_message: a.message, p_name: name });
export const clearAway = (token: string, name: string) => call("supervisor_clear_away", { p_token: token, p_name: name });

// ───────── نصوص مشتركة ─────────
export const REASONS: { key: ExtReason; label: string }[] = [
  { key: "waiting_hospital", label: tr("ننتظر المستشفى") },
  { key: "exams", label: tr("اختبارات") },
  { key: "sick", label: tr("مرض") },
  { key: "other", label: tr("ثاني") },
];
export const reasonLabel = (k: string) => REASONS.find((r) => r.key === k)?.label ?? k;
