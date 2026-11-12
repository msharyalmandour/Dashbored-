import { isSupabaseConfigured, supabase } from "./supabaseClient";
import type { ChatMessage } from "../hooks/useTeamChat";

/* ذكاء محادثة الفريق: الخلاصة الحيّة، السؤال اللي محد جاوبه، «اللي فاتك»، ووقت التركيز.
   الخلاصة و«اللي فاتك» من دالة chat-intel، والباقي يتحسب هنا بدون ذكاء. */

export interface LiveSummary {
  decided: string[];
  open: string[];
  owners: { who: string; what: string }[];
}

const norm = (s: string) =>
  s.replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْـ]/g, "").replace(/[؟?!.,،:«»"'()]/g, " ").toLowerCase();
const STOP = new Set(["ولا", "واللي", "اللي", "هذا", "هذي", "حق", "حقنا", "حقت", "عشان", "متى", "مين", "وش", "ليش", "كيف", "فيه", "فيها", "عندنا", "نسوي", "يعني", "بس", "على", "الى", "إلى", "من", "عن", "في", "مع", "أو", "او", "ولا"]);
const words = (s: string) => norm(s).split(/\s+/).map((w) => w.replace(/^(ال|وال|بال|لل)/, "")).filter((w) => w.length >= 3 && !STOP.has(w));

export const isQuestion = (body: string) => /[؟?]\s*$/.test(body.trim()) || /[؟?]/.test(body) && body.trim().length <= 160;

export interface Orphan {
  message: ChatMessage;
  hours: number;
}

/** أسئلة من الفريق عدّى عليها 24 ساعة ومحد رد عليها (لا رد مباشر، ولا رسالة من غيره خلال ساعتين بعدها) */
export function orphanQuestions(messages: ChatMessage[], now = Date.now(), dismissed: Set<string> = new Set()): Orphan[] {
  const repliedTo = new Set(messages.filter((m) => m.replyTo && !m.deletedAt).map((m) => m.replyTo as string));
  const out: Orphan[] = [];
  messages.forEach((m, i) => {
    if (m.kind !== "user" || m.meta?.type === "voice" || m.deletedAt || m.pending || m.failed || !m.authorId || dismissed.has(m.id)) return;
    if (!isQuestion(m.body)) return;
    const age = now - Date.parse(m.createdAt);
    if (age < 24 * 3600e3 || age > 14 * 24 * 3600e3) return;
    if (repliedTo.has(m.id)) return;
    const t = Date.parse(m.createdAt);
    const answered = messages.slice(i + 1).some((x) => !x.deletedAt && x.kind === "user" && x.authorId !== m.authorId && Date.parse(x.createdAt) - t < 2 * 3600e3);
    if (answered) return;
    out.push({ message: m, hours: Math.floor(age / 3600e3) });
  });
  return out.slice(-2);
}

/** «يعرفه خالد؟»: صاحب المهمة أو القسم اللي كلماته أقرب للسؤال (غير اللي سأل) */
export function guessKnower(question: string, askerId: string, sources: { text: string; ownerId: string | null | undefined }[]): string | null {
  const q = new Set(words(question));
  if (!q.size) return null;
  let best: { id: string; score: number } | null = null;
  for (const s of sources) {
    if (!s.ownerId || s.ownerId === askerId) continue;
    const score = words(s.text).filter((w) => q.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: s.ownerId, score };
  }
  return best?.id ?? null;
}

// ───────── الخلاصة الحيّة (كاش بالجهاز + بالسيرفر) ─────────
const SUM_KEY = (team: string) => `wesync.chat-summary.${team}`;
export interface CachedSummary {
  summary: LiveSummary | null;
  updatedAt: string | null;
  checkedAt: number;
  lastSeen: string;
}
export function readSummaryCache(team: string): CachedSummary | null {
  try {
    const raw = localStorage.getItem(SUM_KEY(team));
    return raw ? (JSON.parse(raw) as CachedSummary) : null;
  } catch {
    return null;
  }
}
function writeSummaryCache(team: string, c: CachedSummary) {
  try {
    localStorage.setItem(SUM_KEY(team), JSON.stringify(c));
  } catch {
    /* ما يهم */
  }
}

/** تنطلب بس لو فيه رسالة جديدة ومرّت دقيقتين من آخر مرة */
export async function fetchLiveSummary(team: string, lastMessageAt: string, force = false): Promise<CachedSummary | null> {
  const c = readSummaryCache(team);
  if (!force && c && (c.lastSeen >= lastMessageAt || Date.now() - c.checkedAt < 2 * 60_000)) return c;
  if (!isSupabaseConfigured) return c;
  const { data, error } = await supabase!.functions.invoke("chat-intel", { body: { action: "summary" } });
  if (error || !data) return c;
  const d = data as { summary?: LiveSummary | null; updatedAt?: string | null };
  const next: CachedSummary = { summary: d.summary ?? c?.summary ?? null, updatedAt: d.updatedAt ?? c?.updatedAt ?? null, checkedAt: Date.now(), lastSeen: lastMessageAt };
  writeSummaryCache(team, next);
  return next;
}

export async function fetchCatchup(since: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase!.functions.invoke("chat-intel", { body: { action: "catchup", since } });
  return ((data as { lines?: string[] } | null)?.lines ?? []).slice(0, 3);
}

/** «**كلمة**» → أجزاء عادية وغامقة */
export function boldParts(line: string): { t: string; b: boolean }[] {
  return line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => (p.startsWith("**") && p.endsWith("**") ? { t: p.slice(2, -2), b: true } : { t: p, b: false }));
}

// ───────── وقت التركيز ─────────
const FOCUS_KEY = "wesync.focus";
export interface FocusState {
  until: string;
  startedAt: string;
}
export function readFocus(): FocusState | null {
  try {
    const f = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? "null") as FocusState | null;
    return f && Date.parse(f.until) > 0 ? f : null;
  } catch {
    return null;
  }
}
export function focusUntil(choice: "1h" | "2h" | "tomorrow", now = new Date()): Date {
  if (choice === "1h") return new Date(now.getTime() + 3600e3);
  if (choice === "2h") return new Date(now.getTime() + 2 * 3600e3);
  // لين بكرة: الساعة 8 الصبح بتوقيت الجهاز
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  t.setHours(8, 0, 0, 0);
  return t;
}
export async function setFocus(userId: string, until: Date | null): Promise<FocusState | null> {
  const state = until ? { until: until.toISOString(), startedAt: new Date().toISOString() } : null;
  try {
    if (state) localStorage.setItem(FOCUS_KEY, JSON.stringify(state));
    else localStorage.removeItem(FOCUS_KEY);
  } catch {
    /* ما يهم */
  }
  // السيرفر يحتاجه عشان يوقف إشعارات الجوال (لو العمود مو موجود للحين، يكفي الجهاز)
  if (isSupabaseConfigured) await supabase!.from("profiles").update({ focus_until: state?.until ?? null }).eq("id", userId).then(() => {}, () => {});
  return state;
}
