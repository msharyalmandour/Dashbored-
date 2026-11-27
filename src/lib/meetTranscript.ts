/* نص اجتماع الفيديو (بدون تسجيل صوت): كل واحد يتكتب كلامه بجهازه وينرسل للغرفة سطر سطر.
   هنا المنطق الصافي: ترتيب السطور، النص للتنزيل، النص لويسي، وتحويل محضر ويسي لمسودة «وضع الاجتماع». */

import { emptyDraft, tagFromKind, type Attendee, type Capture, type LiveDraft } from "./minutesLive";

export interface TxLine {
  id: string;
  /** هوية المتكلم بالغرفة (للأعضاء = رقم الملف) */
  who: string;
  name: string;
  role: string;
  text: string;
  at: number;
  mine: boolean;
}

export const MAX_LINES = 2000;
export const LINE_MAX = 600;

/** يضيف سطر بمكانه حسب الوقت، بدون تكرار */
export function addLine(lines: TxLine[], l: TxLine): TxLine[] {
  const text = l.text.replace(/\s+/g, " ").trim().slice(0, LINE_MAX);
  if (!text || lines.some((x) => x.id === l.id)) return lines;
  const next = [...lines, { ...l, text }];
  if (next.length > 1 && next[next.length - 2].at > l.at) next.sort((a, b) => a.at - b.at);
  return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
}

const supTag = (role: string) => (role === "supervisor" ? " (المشرف/ة)" : "");

/** سطور نفس المتكلم ورا بعض تصير فقرة وحدة */
export function bySpeaker(lines: TxLine[]): { who: string; name: string; role: string; at: number; text: string }[] {
  const out: { who: string; name: string; role: string; at: number; text: string }[] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    if (last && last.who === l.who && l.at - last.at < 5 * 60_000) last.text = `${last.text} ${l.text}`;
    else out.push({ who: l.who, name: l.name, role: l.role, at: l.at, text: l.text });
  }
  return out;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** النص للتنزيل: «[03:12] سارة: …» */
export function transcriptFile(lines: TxLine[], title: string, startedAt: number | null): string {
  const t0 = startedAt ?? lines[0]?.at ?? 0;
  const head = `${title}\n${new Date(t0).toLocaleString("en-GB", { timeZone: "Asia/Riyadh" })}\n\n`;
  return head + bySpeaker(lines).map((p) => `[${mmss(p.at - t0)}] ${p.name}${supTag(p.role)}: ${p.text}`).join("\n\n") + "\n";
}

/** النص لويسي: «سارة: …» (آخر 24 ألف حرف) */
export function transcriptForAi(lines: TxLine[], max = 24000): string {
  const parts = bySpeaker(lines).map((p) => `${p.name}${supTag(p.role)}: ${p.text}`);
  let n = 0;
  let i = parts.length;
  while (i > 0 && n + parts[i - 1].length + 1 <= max) n += parts[--i].length + 1;
  return parts.slice(i).join("\n");
}

export const wordCount = (lines: TxLine[]) => lines.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);

export interface AiMinutes {
  gist: string;
  items: { kind: string; title: string; sub: string; assignee_id: string | null; due: string | null }[];
}

/** محضر ويسي ← مسودة «وضع الاجتماع» (الفريق يراجعها ويحفظها بنفسه). لو فيه مسودة شغّالة نضيف عليها. */
export function draftFromMeeting(
  ai: AiMinutes,
  ctx: {
    title: string;
    startedAt: number;
    endedAt: number;
    roster: { id: string; name: string }[];
    /** مين دخل الاجتماع (هوية + دور) */
    present: { identity: string; role: string; name: string }[];
    supervisorName: string;
    /** «ما أقدر» من مكالمة ويسي — تنكتب بالمحضر كاعتذار */
    apologies?: { name: string; reason: string }[];
    existing?: LiveDraft | null;
  },
  uid: () => string,
): LiveDraft {
  const startIso = new Date(ctx.startedAt).toISOString();
  const endIso = new Date(ctx.endedAt).toISOString();
  const ids = new Set(ctx.present.map((p) => p.identity));
  const supHere = ctx.present.find((p) => p.role === "supervisor");
  const attendance: Attendee[] = [
    ...ctx.roster.map((m) => ({ id: m.id, name: m.name, joinedAt: ids.has(m.id) ? startIso : null })),
    { id: "supervisor", name: supHere?.name || ctx.supervisorName, joinedAt: supHere ? startIso : null, role: "supervisor" as const },
  ];
  const captures: Capture[] = [];
  const at = (i: number) => new Date(ctx.startedAt + Math.round(((ctx.endedAt - ctx.startedAt) * (i + 1)) / (ai.items.length + 2))).toISOString();
  if (ai.gist.trim()) captures.push({ id: uid(), at: startIso, by: null, tag: "point", text: ai.gist.trim(), auto: true });
  for (const a of ctx.apologies ?? []) captures.push({ id: uid(), at: startIso, by: null, tag: "point", text: a.reason ? `اعتذار: ${a.name} (${a.reason})` : `اعتذار: ${a.name}`, auto: true });
  ai.items.forEach((it, i) => {
    const text = it.sub && !it.title.includes(it.sub) ? `${it.title} (${it.sub})` : it.title;
    captures.push({ id: uid(), at: at(i), by: it.assignee_id, tag: tagFromKind(it.kind), text: text.slice(0, 400), auto: true, dueDate: it.due });
  });
  const minutes = Math.max(1, Math.round((ctx.endedAt - ctx.startedAt) / 60000));
  const base = ctx.existing?.startedAt ? ctx.existing : null;
  if (base) {
    // الحاضرين: اللي كان مسجّل بالمسودة يبقى، ونضيف اللي دخل الفيديو
    const att = base.attendance.length
      ? base.attendance.map((a) => (a.joinedAt ? a : attendance.find((x) => x.id === a.id && x.joinedAt) ?? a))
      : attendance;
    return { ...base, attendance: att, captures: [...base.captures, ...captures], endedAt: endIso, source: "video" };
  }
  return { ...emptyDraft(), title: ctx.title, room: "Wesync Meet", planned: minutes, startedAt: startIso, endedAt: endIso, attendance, captures, source: "video" };
}
