import { tr } from "./i18n";
import { formatWeekday } from "./date";

/* تنبيهات الطالب (StudNotif): كل شي جاي من الدكتورة — رسالة، موعد، طلب صار مهمة، اعتماد محضر — مرتبة بـ «اليوم» و«أمس». */

export type NotifKind = "meeting" | "message" | "request" | "approval";
export interface NotifSource {
  id: string;
  sender: "supervisor" | "team";
  body: string;
  createdAt: string;
  readAt: string | null;
  kind: string;
  payload: Record<string, unknown>;
}
export interface StudNotif {
  id: string;
  kind: NotifKind;
  title: string;
  sub: string;
  at: string;
  unread: boolean;
  payload: Record<string, unknown>;
}

const clip = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function studNotifs(msgs: NotifSource[], docName: string): StudNotif[] {
  return msgs
    .filter((m) => m.sender === "supervisor")
    .map((m): StudNotif => {
      const p = m.payload ?? {};
      const base = { id: m.id, at: m.createdAt, unread: !m.readAt, payload: p };
      if (m.kind === "meeting") {
        const when = [p.date ? formatWeekday(String(p.date)) : "", p.time ? String(p.time) : "", p.place ? String(p.place) : ""].filter(Boolean).join(" · ");
        return { ...base, kind: "meeting", title: tr("{0} حطت موعد اجتماع", docName), sub: when };
      }
      if (m.kind === "request") {
        const who = String(p.assignee_name ?? "").trim();
        return { ...base, kind: "request", title: who ? tr("طلبها صار مهمة لـ {0}", who) : tr("طلبها صار مهمة"), sub: clip(String(p.title ?? m.body)) };
      }
      if (m.kind === "approval") return { ...base, kind: "approval", title: tr("{0} اعتمدت المحضر", docName), sub: tr("المحضر صار PDF بالدرايف") };
      return { ...base, kind: "message", title: tr("{0} ردّت عليكم", docName), sub: `«${clip(m.body)}»` };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** «اليوم» / «أمس» / «قبل» (بتوقيت الجهاز) */
export function dayBucket(iso: string, now = new Date()): "today" | "yesterday" | "older" {
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= start) return "today";
  if (d.getTime() >= start - 864e5) return "yesterday";
  return "older";
}
