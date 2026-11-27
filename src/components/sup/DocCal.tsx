import { useMemo, useState } from "react";
import { CalendarDays, Flag } from "lucide-react";
import { tr } from "../../lib/i18n";
import { formatWeekday } from "../../lib/date";
import { supabase } from "../../lib/supabaseClient";
import { postDocMessage } from "../../lib/docThread";
import type { TeamData } from "../../lib/supervisorDash";

/* كل المواعيد (DocCal): أسبوع الأحد–الخميس، 8:00–15:00، من كل المصادر:
   اجتماعات الفرق (برتقالي) · ساعات المكتب (إطار ذهبي) · التسليمات (كرت بخط ذهبي) · طلبات المواعيد (ذهبي مخطط).
   على الجنب: الطلب اللي ينتظر (وافقوا / اقترحوا وقت ثاني) + «التسليمات الجاية». */

const H0 = 8;
const H1 = 16;
const ROW = 62;
type Kind = "meet" | "hours" | "due" | "req";
interface Ev {
  key: string;
  kind: Kind;
  day: string;
  start: number;
  end: number;
  title: string;
  sub: string;
  token?: string;
  id?: string;
}

const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** أيام الأسبوع (الأحد–الخميس). بعد الخميس نعرض الأسبوع الجاي */
export function weekDays(today: string): string[] {
  const d = new Date(`${today}T12:00:00`);
  const dow = d.getDay();
  const back = dow === 5 || dow === 6 ? -(7 - dow) : dow;
  const sun = new Date(d.getTime() - back * 864e5);
  return Array.from({ length: 5 }, (_, i) => iso(new Date(sun.getTime() + i * 864e5)));
}

export function collectEvents(teams: TeamData[], days: string[]): Ev[] {
  const out: Ev[] = [];
  const inWeek = (d: string) => days.includes(d);
  const hours = new Set<string>();
  for (const t of teams) {
    for (const b of t.dash?.bookings ?? []) {
      if (!inWeek(b.date)) continue;
      const s = toMin(b.time);
      out.push({ key: `b${b.id}`, kind: b.status === "confirmed" ? "meet" : "req", day: b.date, start: s, end: s + (b.durationMin || 30), title: t.name, sub: b.status === "confirmed" ? tr("اجتماع") : tr("ينتظرك"), token: t.token, id: b.id });
    }
    for (const b of t.board?.waiting.bookings ?? []) {
      if (!inWeek(b.date) || out.some((e) => e.id === b.id)) continue;
      const s = toMin(b.time);
      out.push({ key: `w${b.id}`, kind: "req", day: b.date, start: s, end: s + (b.durationMin || 30), title: tr("طلب موعد"), sub: `${t.name} · ${tr("ينتظرك")}`, token: t.token, id: b.id });
    }
    for (const w of t.board?.availability?.windows ?? []) {
      const day = days.find((d) => new Date(`${d}T12:00:00`).getDay() === w.weekday);
      if (!day) continue;
      const k = `${day}${w.start}${w.end}`;
      if (hours.has(k)) continue;
      hours.add(k);
      out.push({ key: `h${k}`, kind: "hours", day, start: toMin(w.start), end: toMin(w.end), title: tr("ساعات مكتب"), sub: tr("فاضية") });
    }
    for (const task of t.dash?.tasks ?? []) {
      if (task.status === "done" || !task.dueDate || !inWeek(task.dueDate)) continue;
      out.push({ key: `d${task.id}`, kind: "due", day: task.dueDate, start: -1, end: -1, title: tr("تسليم: {0}", task.title), sub: t.name, token: t.token });
    }
  }
  return out;
}

export default function DocCal({ teams, today, name, onOpenTeam, onToast, onChanged }: { teams: TeamData[]; today: string; name: string; onOpenTeam: (token: string, open?: string) => void; onToast: (m: string) => void; onChanged: () => void }) {
  const days = useMemo(() => weekDays(today), [today]);
  const events = useMemo(() => collectEvents(teams, days), [teams, days]);
  const timed = events.filter((e) => e.start >= 0);
  const dues = events.filter((e) => e.kind === "due");
  const requests = teams.flatMap((t) => (t.board?.waiting.bookings ?? []).map((b) => ({ b, t })));
  const [busy, setBusy] = useState(false);
  const req = requests[0];
  const free = req ? !timed.some((e) => e.kind === "meet" && e.day === req.b.date && toMin(req.b.time) < e.end && toMin(req.b.time) + req.b.durationMin > e.start) : false;

  const approve = async () => {
    if (!req || !supabase) return;
    setBusy(true);
    const r = await supabase.rpc("supervisor_respond_booking", { p_token: req.t.token, p_id: req.b.id, p_decision: "confirm", p_note: "", p_name: name });
    if (!r.error) await postDocMessage(req.t.token, "text", tr("✓ أكدت موعدكم {0} الساعة {1}. انضاف لتقويمكم.", formatWeekday(req.b.date), req.b.time), {}, name);
    setBusy(false);
    onToast(r.error ? tr("ما انحفظ — جرّبوا مرة ثانية.") : tr("تم تأكيد الموعد ✓ ووصل للفريق بالمحادثة"));
    onChanged();
  };

  const upcoming = teams
    .flatMap((t) => (t.dash?.tasks ?? []).filter((x) => x.status !== "done" && x.dueDate && x.dueDate >= today).map((x) => ({ x, t })))
    .sort((a, b) => (a.x.dueDate ?? "").localeCompare(b.x.dueDate ?? ""))
    .slice(0, 5);

  const top = (m: number) => ((m - H0 * 60) / 60) * ROW;
  return (
    <div className="cal">
      <section className="sd-glass cal-week sd-in" aria-labelledby="cal-h">
        <div className="cal-head">
          <b id="cal-h" style={{ fontSize: 20 }}>
            {days[0] > today ? tr("الأسبوع الجاي") : tr("هالأسبوع")}
          </b>
          <span style={{ flex: 1 }} />
          <ul className="cal-legend" aria-label={tr("الألوان")}>
            <li>
              <i className="meet" />
              {tr("اجتماع")}
            </li>
            <li>
              <i className="hours" />
              {tr("ساعات مكتب")}
            </li>
            <li>
              <i className="due" />
              {tr("تسليم")}
            </li>
            <li>
              <i className="req" />
              {tr("طلب ينتظرك")}
            </li>
          </ul>
        </div>
        <div className="cal-scroll">
          <div className="cal-grid" style={{ ["--rows" as string]: H1 - H0 }}>
            <div className="cal-corner" />
            {days.map((d) => (
              <div key={d} className={d === today ? "cal-dh today" : "cal-dh"}>
                {formatWeekday(d)} <span dir="ltr">{new Date(`${d}T12:00:00`).getDate()}</span>
              </div>
            ))}
            <div className="cal-times">
              {Array.from({ length: H1 - H0 }, (_, i) => (
                <span key={i} style={{ top: i * ROW }} dir="ltr">
                  {H0 + i}:00
                </span>
              ))}
            </div>
            {days.map((d) => (
              <div key={d} className={d === today ? "cal-col today" : "cal-col"} style={{ height: (H1 - H0) * ROW }}>
                {dues
                  .filter((e) => e.day === d)
                  .slice(0, 2)
                  .map((e, i) => (
                    <button key={e.key} type="button" className="cal-ev due" style={{ top: 4 + i * 58, height: 52 }} onClick={() => e.token && onOpenTeam(e.token)}>
                      <b>{e.title}</b>
                      <span>{e.sub}</span>
                    </button>
                  ))}
                {timed
                  .filter((e) => e.day === d)
                  .map((e) => {
                    const s = Math.max(H0 * 60, e.start);
                    const en = Math.min(H1 * 60, Math.max(e.end, s + 30));
                    if (s >= H1 * 60) return null;
                    return (
                      <button key={e.key} type="button" className={`cal-ev ${e.kind}`} style={{ top: top(s) + 2, height: Math.max(48, top(en) - top(s) - 4) }} onClick={() => e.token && onOpenTeam(e.token, e.id ? `booking:${e.id}` : "")} disabled={!e.token}>
                        <b>{e.title}</b>
                        <span>{e.sub}</span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="cal-side">
        {req ? (
          <section className="cal-req sd-in sd-d2" aria-labelledby="cal-req-h">
            <span className="cal-req-k">
              {tr("طلب موعد")} · {tr("ينتظرك")}
              {requests.length > 1 && ` (${requests.length})`}
            </span>
            <b id="cal-req-h" style={{ fontSize: 18 }}>
              {tr("{0} يبون {1} دقيقة", req.t.name, req.b.durationMin)}
            </b>
            {req.b.note && (
              <p className="cal-quote" dir="auto">
                «{req.b.note}»
              </p>
            )}
            <div className="cal-slot">
              <CalendarDays size={16} aria-hidden />
              <b>
                {formatWeekday(req.b.date)} · <span dir="ltr">{req.b.time}</span>
              </b>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: free ? "#FFB547" : "#FF8A7A" }}>{free ? tr("فاضية ✓") : tr("فيه تعارض")}</span>
            </div>
            <div className="cal-acts">
              <button type="button" className="dc-send" disabled={busy} onClick={approve}>
                {tr("وافقوا")}
              </button>
              <button type="button" className="dh-glass" onClick={() => onOpenTeam(req.t.token, `booking:${req.b.id}`)}>
                {tr("اقترحوا وقت ثاني")}
              </button>
            </div>
          </section>
        ) : (
          <section className="sd-glass sd-in sd-d2">
            <b style={{ fontSize: 17 }}>{tr("ما فيه طلبات مواعيد")}</b>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#ABA095" }}>{tr("الطلاب يحجزون من ساعات مكتبكم، ويوصلكم الطلب هنا.")}</p>
          </section>
        )}

        <section className="sd-glass sd-in sd-d3" aria-labelledby="cal-due-h">
          <div className="sd-h">
            <span className="sup-ic">
              <Flag size={16} aria-hidden />
            </span>
            <b id="cal-due-h">{tr("التسليمات الجاية")}</b>
          </div>
          {upcoming.length === 0 && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#ABA095" }}>{tr("ما فيه تسليمات قريبة.")}</p>}
          {upcoming.map(({ x, t }) => (
            <button key={x.id} type="button" className="cal-due-row" onClick={() => onOpenTeam(t.token)}>
              <b className="d">{formatWeekday(x.dueDate!)}</b>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15 }}>{x.title}</b>
                <span style={{ fontSize: 12, color: "#ABA095" }}>
                  {t.name}
                  {x.assigneeName ? ` · ${x.assigneeName}` : ""}
                </span>
              </span>
            </button>
          ))}
        </section>

        <section className="sd-glass sd-in sd-d4">
          <b style={{ fontSize: 15 }}>{tr("ساعات مكتبك")}</b>
          <p style={{ margin: "4px 0 8px", fontSize: 13, color: "#ABA095" }}>{tr("الطلاب يشوفون الأوقات الفاضية ويحجزون منها.")}</p>
          {teams[0] && (
            <button type="button" className="dh-link" style={{ padding: 0 }} onClick={() => onOpenTeam(teams[0].token, "setup:0")}>
              {tr("عدّلوها")}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
