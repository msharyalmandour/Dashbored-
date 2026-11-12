/* وضع الاجتماع (MinLiveD/M) والمحضر النهائي (MinDocD/M): أنواع ومنطق صافي بدون شبكة */

export type Tag = "point" | "decision" | "task" | "question";
export const TAGS: Tag[] = ["point", "decision", "task", "question"];

export interface Capture {
  id: string;
  at: string;
  by: string | null;
  tag: Tag;
  text: string;
  /** طلعه الذكاء من الصوت (نقدر نغيّر وسمه) */
  auto?: boolean;
  /** بند من «نسيتوا شي؟» له مهمة موجودة أصلًا — ما ننشئ مهمة ثانية */
  linkTaskId?: string | null;
  dueDate?: string | null;
}
export interface Attendee {
  id: string;
  name: string;
  joinedAt: string | null;
  role?: "supervisor";
}
export interface LiveDraft {
  title: string;
  room: string;
  planned: number;
  agenda: string[];
  current: number;
  startedAt: string | null;
  attendance: Attendee[];
  captures: Capture[];
}

export const emptyDraft = (): LiveDraft => ({ title: "", room: "", planned: 30, agenda: [], current: 0, startedAt: null, attendance: [], captures: [] });

const KEY = (team: string) => `wesync.meeting-live.${team}`;
export function loadDraft(team: string): LiveDraft | null {
  try {
    const raw = localStorage.getItem(KEY(team));
    return raw ? ({ ...emptyDraft(), ...(JSON.parse(raw) as LiveDraft) } as LiveDraft) : null;
  } catch {
    return null;
  }
}
export function saveDraft(team: string, d: LiveDraft | null) {
  try {
    if (d) localStorage.setItem(KEY(team), JSON.stringify(d));
    else localStorage.removeItem(KEY(team));
  } catch {
    /* ما يهم */
  }
}

/** «22:14» من بداية الاجتماع */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** نسبة الحلقة: تمتلي مرة وحدة لين المدة المخططة، وتتحدث كل دقيقة */
export const ringPct = (elapsedMs: number, plannedMin: number) => Math.min(1, Math.floor(elapsedMs / 60000) / Math.max(1, plannedMin));

/** المحضر من اللي انقال: النقاش (النقاط)، القرارات، البنود، المفتوح (الأسئلة) */
export function buildMinutes(d: Pick<LiveDraft, "captures">) {
  const by = (t: Tag) => d.captures.filter((c) => c.tag === t && c.text.trim());
  return {
    discussion: by("point").map((c) => c.text.trim()).join("\n"),
    decisions: by("decision").map((c) => c.text.trim()).join("\n"),
    tasks: by("task").map((c) => ({ text: c.text.trim(), assigneeId: c.by, dueDate: c.dueDate ?? null, linkTaskId: c.linkTaskId ?? null })),
    open: by("question").map((c) => c.text.trim()).join("\n"),
  };
}

const norm = (s: string) =>
  s.replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْـ]/g, "").replace(/[؟?!.,،:«»"'()·]/g, " ").toLowerCase();
const words = (s: string) => norm(s).split(/\s+/).map((w) => w.replace(/^(ال|وال|بال|لل)/, "")).filter((w) => w.length >= 3);

/** طلب الدكتورة «انذكر بالمحضر» لو نص 60% من كلماته المهمة موجود */
export function mentioned(title: string, minutesText: string): boolean {
  const t = words(title);
  if (!t.length) return false;
  const m = new Set(words(minutesText));
  return t.filter((w) => m.has(w)).length / t.length >= 0.6;
}

/** «نسيتوا شي؟»: طلباتها المفتوحة، مع مين انذكر منها بالمحضر */
export function forgotten<T extends { id: string; title: string; status: string; direction: string }>(items: T[], minutesText: string): { item: T; covered: boolean }[] {
  return items
    .filter((c) => c.direction === "from_supervisor" && (c.status === "proposed" || c.status === "approved" || c.status === "in_progress"))
    .map((c) => ({ item: c, covered: mentioned(c.title, minutesText) }));
}

/** وسم من نوع الذكاء (نفس مخطط الفويس) */
export function tagFromKind(kind: string): Tag {
  return kind === "decision" ? "decision" : kind === "task" ? "task" : kind === "question" ? "question" : "point";
}

/** «حضر 4 من 5 · 22 دقيقة» */
export function attendanceSummary(att: Attendee[], startedAt: string | null, endedAt: string | null) {
  const came = att.filter((a) => a.joinedAt).length;
  const minutes = startedAt && endedAt ? Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60000)) : null;
  return { came, total: att.length, minutes };
}

/** «07» */
export const two = (n: number) => String(n).padStart(2, "0");
