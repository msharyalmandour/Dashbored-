/** ذاكرة المشرف/ة على جهازه فقط (localStorage) — الرابط بدون حساب، فما فيه شي يتخزن بالخادم.
    تغذّي: «وش تغيّر من آخر زيارة»، علامات الاعتماد، وقائمة «فرقي». */

export interface SnapshotLike {
  teamName: string;
  tasks: { title: string; status: "todo" | "in-progress" | "done" | "overdue" }[];
  proposalSections: { key: string; labelAr: string; status: "not-started" | "in-progress" | "done" }[];
}

export interface SeenSnapshot {
  at: string;
  tasks: Record<string, string>;
  sections: Record<string, string>;
  teamMsgCount: number;
}

export interface SavedTeam {
  token: string;
  teamName: string;
  visitedAt: string;
}

const seenKey = (t: string) => `wesync-sv-seen:${t}`;
const approvedKey = (t: string) => `wesync-sv-approved:${t}`;
const TEAMS_KEY = "wesync-sv-teams";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // التخزين ممنوع (وضع خاص) — الميزة تشتغل بدون ذاكرة
  }
}

export const loadSeen = (token: string) => read<SeenSnapshot | null>(seenKey(token), null);
export const saveSeen = (token: string, seen: SeenSnapshot) => write(seenKey(token), seen);
export const loadApproved = (token: string) => read<string[]>(approvedKey(token), []);
export const saveApproved = (token: string, keys: string[]) => write(approvedKey(token), keys);
export const loadTeams = () => read<SavedTeam[]>(TEAMS_KEY, []);

export function rememberTeam(token: string, teamName: string) {
  const rest = loadTeams().filter((t) => t.token !== token);
  write(TEAMS_KEY, [{ token, teamName, visitedAt: new Date().toISOString() }, ...rest].slice(0, 30));
}
export function forgetTeam(token: string) {
  write(TEAMS_KEY, loadTeams().filter((t) => t.token !== token));
}

export function buildSeen(s: SnapshotLike, teamMsgCount: number): SeenSnapshot {
  return {
    at: new Date().toISOString(),
    tasks: Object.fromEntries(s.tasks.map((t) => [t.title, t.status])),
    sections: Object.fromEntries(s.proposalSections.map((p) => [p.key, p.status])),
    teamMsgCount,
  };
}

const sectionWord = { "not-started": "لم يبدأ", "in-progress": "قيد التنفيذ", done: "مكتمل" } as const;

/** الفرق بين آخر مرة شافت فيها المشرفة التقرير والحين — سطور جاهزة للعرض */
export function diffSince(prev: SeenSnapshot, s: SnapshotLike, teamMsgCount: number | null): string[] {
  const out: string[] = [];
  const fresh = s.tasks.filter((t) => !(t.title in prev.tasks));
  if (fresh.length) out.push(`${fresh.length} ${fresh.length === 1 ? "مهمة جديدة" : "مهام جديدة"}`);
  for (const t of s.tasks) {
    const before = prev.tasks[t.title];
    if (before === undefined || before === t.status) continue;
    if (t.status === "done") out.push(`خلّصوا: «${t.title}»`);
    else if (t.status === "overdue") out.push(`تأخّرت: «${t.title}»`);
  }
  for (const p of s.proposalSections) {
    const before = prev.sections[p.key] as keyof typeof sectionWord | undefined;
    if (before && before !== p.status) out.push(`«${p.labelAr}»: ${sectionWord[before]} ← ${sectionWord[p.status]}`);
  }
  if (teamMsgCount !== null && teamMsgCount > prev.teamMsgCount) {
    const n = teamMsgCount - prev.teamMsgCount;
    out.push(`${n} ${n === 1 ? "رد جديد" : "ردود جديدة"} من الفريق`);
  }
  return out;
}
