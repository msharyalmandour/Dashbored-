import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, BarChart3, CalendarDays, Check, ChevronLeft, Megaphone, MessageSquare, Search, Send, Users } from "lucide-react";
import { avatarLetter } from "../../lib/avatarLetter";
import { tr } from "../../lib/i18n";
import { formatDateShort, formatWeekday } from "../../lib/date";
import { supabase } from "../../lib/supabaseClient";
import { relTime } from "../supervisor/SvParts";
import { loadDocThread, postDocMessage, QUICK_REPLIES, type DocKind, type DocMsg } from "../../lib/docThread";
import type { TeamData } from "../../lib/supervisorDash";

/* محادثات الدكتورة (DocChat): قائمة على اليمين (محادثة لكل فريق + «كل فرقي (إعلان)») والمحادثة على اليسار.
   الكتابة بأربع أوضاع: رسالة · طلب = مهمة · موعد · اعتماد. الدكتورة تدخل برمز الرابط (بدون حساب)، فنحدّث كل 10 ثواني بدل Realtime. */

const AV = ["#FFC85A", "#ffb547", "#FFE3C2", "#FF9A5A"];
type Mode = "text" | "request" | "meeting" | "approval";
const ALL = "__all__";

export function DocChatView({ teams, name, initial, onOpenTeam }: { teams: TeamData[]; name: string; initial?: string; onOpenTeam: (token: string) => void }) {
  const [threads, setThreads] = useState<Record<string, DocMsg[]>>({});
  const [active, setActive] = useState<string>(initial || "");
  const [q, setQ] = useState("");
  const reload = useCallback(async (only?: string) => {
    const list = only ? teams.filter((t) => t.token === only) : teams;
    const res = await Promise.all(list.map(async (t) => [t.token, await loadDocThread(t.token)] as const));
    setThreads((p) => ({ ...p, ...Object.fromEntries(res) }));
  }, [teams]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    if (!active || active === ALL) return;
    const t = setInterval(() => void reload(active), 10_000);
    return () => clearInterval(t);
  }, [active, reload]);

  const rows = useMemo(
    () =>
      teams
        .map((t) => {
          const msgs = threads[t.token] ?? [];
          const last = msgs[msgs.length - 1];
          const lastDoc = [...msgs].reverse().find((m) => m.sender === "supervisor");
          const unread = msgs.filter((m) => m.sender === "team" && (!lastDoc || m.createdAt > lastDoc.createdAt)).length;
          return { t, last, unread };
        })
        .filter((r) => !q.trim() || (r.t.name + " " + (threads[r.t.token] ?? []).map((m) => m.body).join(" ")).includes(q.trim()))
        .sort((a, b) => (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? "")),
    [teams, threads, q],
  );
  const team = teams.find((t) => t.token === active) ?? null;

  return (
    <div className={active ? "dc dc-open" : "dc"}>
      <section className="dc-list sd-glass" aria-label={tr("المحادثات")}>
        <div className="sd-h">
          <b style={{ fontSize: 22 }}>{tr("المحادثات")}</b>
        </div>
        <label className="dc-search">
          <Search size={16} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("ابحثوا بالرسائل…")} aria-label={tr("ابحثوا بالرسائل")} />
        </label>
        <div className="dc-rows">
          {rows.map(({ t, last, unread }) => (
            <button key={t.token} type="button" className="dc-row" aria-current={active === t.token ? "true" : undefined} onClick={() => setActive(t.token)}>
              <span className="dc-row-ic">
                <Users size={18} aria-hidden />
              </span>
              <span className="dc-row-m">
                <b>{t.name || tr("فريق بدون اسم")}</b>
                <span>{last ? `${last.sender === "supervisor" ? tr("أنتم") : last.senderName || tr("الفريق")}: ${last.body}` : tr("ما فيه رسائل بعد")}</span>
              </span>
              <span className="dc-row-s">
                {last && <span>{relTime(last.createdAt)}</span>}
                {unread > 0 && <i>{unread}</i>}
              </span>
            </button>
          ))}
          {teams.length > 1 && (
            <button type="button" className="dc-row" aria-current={active === ALL ? "true" : undefined} onClick={() => setActive(ALL)}>
              <span className="dc-row-ic">
                <Megaphone size={18} aria-hidden />
              </span>
              <span className="dc-row-m">
                <b>{tr("كل فرقي (إعلان)")}</b>
                <span>{tr("رسالة وحدة توصل لكل الفرق")}</span>
              </span>
            </button>
          )}
        </div>
        <p className="dc-note">
          <b>{tr("بدل الإيميل")}</b> · {tr("الطلاب يشوفون رسالتكم فورًا بتنبيه، وطلبكم يصير مهمة لحاله.")}
        </p>
      </section>

      {active === ALL ? (
        <Broadcast teams={teams} name={name} onBack={() => setActive("")} onSent={() => void reload()} />
      ) : team ? (
        <Thread key={team.token} team={team} msgs={threads[team.token] ?? []} name={name} onBack={() => setActive("")} onSent={() => void reload(team.token)} onOpenTeam={() => onOpenTeam(team.token)} />
      ) : (
        <section className="dc-thread sd-glass dc-empty">
          <MessageSquare size={28} aria-hidden />
          <b>{tr("اختاروا فريق من القائمة")}</b>
        </section>
      )}
    </div>
  );
}

function Broadcast({ teams, name, onBack, onSent }: { teams: TeamData[]; name: string; onBack: () => void; onSent: () => void }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"" | "busy" | "done" | string>("");
  const send = async () => {
    if (!text.trim()) return;
    setState("busy");
    const errs = (await Promise.all(teams.map((t) => postDocMessage(t.token, "text", text.trim(), {}, name)))).filter(Boolean);
    setState(errs.length ? (errs[0] as string) : "done");
    if (!errs.length) setText("");
    onSent();
  };
  return (
    <section className="dc-thread sd-glass">
      <header className="dc-head">
        <button type="button" className="dc-back" onClick={onBack} aria-label={tr("رجوع")}>
          <ChevronLeft size={18} className="rotate-180 ltr:rotate-0" aria-hidden />
        </button>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 19 }}>{tr("كل فرقي (إعلان)")}</b>
          <div style={{ fontSize: 13, color: "#b8ada2" }}>{tr("توصل لـ {0} فرق، كل فريق بمحادثته", teams.length)}</div>
        </div>
      </header>
      <div style={{ flex: 1 }} />
      {state === "done" && <p className="dc-ok">{tr("انرسل لكل الفرق ✓")}</p>}
      {state && state !== "busy" && state !== "done" && <p className="dc-err">{state}</p>}
      <div className="dc-comp">
        <div className="dc-input">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={tr("مثال: موعد التسليم النهائي الخميس الجاي…")} aria-label={tr("نص الإعلان")} />
          <button type="button" className="dc-send" disabled={!text.trim() || state === "busy"} onClick={send}>
            <Send size={17} aria-hidden />
            {tr("أرسلوا للكل")}
          </button>
        </div>
      </div>
    </section>
  );
}

function Thread({ team, msgs, name, onBack, onSent, onOpenTeam }: { team: TeamData; msgs: DocMsg[]; name: string; onBack: () => void; onSent: () => void; onOpenTeam: () => void }) {
  const members = team.dash?.members ?? [];
  const minutes = team.board?.waiting.minutes ?? [];
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [who, setWho] = useState("");
  const [due, setDue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [place, setPlace] = useState("");
  const [dur, setDur] = useState(30);
  const [mid, setMid] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const ready =
    mode === "text" ? !!text.trim() : mode === "request" ? !!text.trim() && !!who : mode === "meeting" ? !!date && !!time : !!mid;
  const send = async (override?: string) => {
    const body = (override ?? text).trim();
    setErr("");
    setBusy(true);
    let kind: DocKind = override ? "text" : mode;
    let payload: Record<string, unknown> = {};
    let msg = body;
    if (!override && mode === "request") payload = { assignee: who, assignee_name: members.find((m) => m.id === who)?.name ?? "", due: due || null, title: body.split("\n")[0].slice(0, 120) };
    if (!override && mode === "meeting") {
      payload = { date, time, place, duration: dur, title: tr("اجتماع مع {0}", name || tr("المشرف/ة")) };
      msg = body || tr("حطيت لكم موعد نراجع فيه كل شي.");
    }
    if (!override && mode === "approval") {
      const m = minutes.find((x) => x.id === mid);
      if (supabase) {
        const r = await supabase.rpc("supervisor_resolve_minutes", { p_token: team.token, p_minutes_id: mid, p_decision: "approved", p_note: "", p_name: name });
        if (r.error) {
          setBusy(false);
          return setErr(tr("ما انحفظ الاعتماد — جرّبوا مرة ثانية."));
        }
      }
      payload = { minutes_id: mid, date: m?.meetingDate ?? "" };
      msg = body || tr("اعتمدت محضر {0} ✓", m ? formatDateShort(m.meetingDate) : "");
      kind = "approval";
    }
    const e = await postDocMessage(team.token, kind, msg, payload, name);
    setBusy(false);
    if (e) return setErr(e);
    setText("");
    setMid("");
    onSent();
  };

  const typingHint = team.dash?.members.length ? tr("{0} طلاب", team.dash.members.length) : "";
  let lastDay = "";
  return (
    <section className="dc-thread sd-glass" aria-label={team.name}>
      <header className="dc-head">
        <button type="button" className="dc-back" onClick={onBack} aria-label={tr("رجوع")}>
          <ChevronLeft size={18} className="rotate-180 ltr:rotate-0" aria-hidden />
        </button>
        <div className="sd-avs" aria-hidden style={{ marginTop: 0 }}>
          {members.slice(0, 4).map((m, i) => (
            <span key={m.id} style={{ background: AV[i % AV.length] }}>
              {avatarLetter(m.name)}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 19 }}>{team.name}</b>
          <div style={{ fontSize: 13, color: "#b8ada2" }}>{typingHint}</div>
        </div>
        <button type="button" className="dc-chip" onClick={() => setMode("meeting")}>
          <CalendarDays size={15} aria-hidden />
          {tr("موعد")}
        </button>
        <button type="button" className="dc-chip" onClick={onOpenTeam}>
          <BarChart3 size={15} aria-hidden />
          {tr("بحثهم")}
        </button>
      </header>

      <div ref={box} className="dc-msgs" role="log" aria-live="polite">
        {msgs.length === 0 && <p className="dc-empty-t">{tr("ابدأوا المحادثة. الفريق كله يشوفها، ويوصلهم تنبيه.")}</p>}
        {msgs.map((m) => {
          const day = m.createdAt.slice(0, 10);
          const sep = day !== lastDay ? (lastDay = day) : null;
          const mine = m.sender === "supervisor";
          const t = new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id}>
              {sep && <div className="dc-day">{formatDateShort(day)}</div>}
              <div className={mine ? "dc-m mine" : "dc-m"}>
                {!mine && <span className="dc-av">{avatarLetter(m.senderName || "؟")}</span>}
                <div className="dc-col">
                  {!mine && (
                    <span className="dc-meta">
                      {m.senderName || tr("الفريق")} · <span dir="ltr">{t}</span>
                    </span>
                  )}
                  <div className={mine ? "dc-b doc" : "dc-b"} dir="auto">
                    {m.body}
                  </div>
                  {m.kind === "request" && <RequestCard m={m} />}
                  {m.kind === "meeting" && <MeetingCard m={m} members={members} />}
                  {m.kind === "approval" && (
                    <div className="dc-card gold">
                      <Award size={16} aria-hidden />
                      <b>{tr("محضر معتمد")}</b>
                    </div>
                  )}
                  {mine && (
                    <span className="dc-meta">
                      <span dir="ltr">{t}</span>
                      {m.reads !== null && m.members ? (
                        <>
                          {" · "}
                          <Check size={12} aria-hidden /> {tr("قراها {0} من {1}", m.reads, m.members)}
                        </>
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dc-comp">
        <div className="dc-modes" role="radiogroup" aria-label={tr("نوع الرسالة")}>
          {(
            [
              ["text", tr("رسالة"), <MessageSquare key="i" size={15} aria-hidden />],
              ["request", tr("طلب = مهمة"), <Check key="i" size={15} aria-hidden />],
              ["meeting", tr("موعد"), <CalendarDays key="i" size={15} aria-hidden />],
              ["approval", tr("اعتماد"), <Award key="i" size={15} aria-hidden />],
            ] as const
          ).map(([k, l, ic]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} className="dc-mode" onClick={() => setMode(k)}>
              {ic}
              {l}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          {mode === "text" &&
            QUICK_REPLIES.map((r) => (
              <button key={r} type="button" className="dc-quick" disabled={busy} onClick={() => send(tr(r))}>
                {tr(r)}
              </button>
            ))}
        </div>
        {mode === "request" && (
          <div className="dc-extra">
            <select value={who} onChange={(e) => setWho(e.target.value)} aria-label={tr("مين يسويها؟")}>
              <option value="">{tr("مين يسويها؟")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={tr("الموعد")} />
          </div>
        )}
        {mode === "meeting" && (
          <div className="dc-extra">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={tr("اليوم")} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={tr("الوقت")} />
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={tr("المكان (قاعة 3 أو أونلاين)")} aria-label={tr("المكان")} />
            <select value={dur} onChange={(e) => setDur(+e.target.value)} aria-label={tr("المدة")}>
              {[15, 30, 45, 60].map((d) => (
                <option key={d} value={d}>
                  {tr("{0} دقيقة", d)}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === "approval" && (
          <div className="dc-extra">
            {minutes.length ? (
              <select value={mid} onChange={(e) => setMid(e.target.value)} aria-label={tr("أي محضر؟")}>
                <option value="">{tr("أي محضر؟")}</option>
                {minutes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {tr("محضر {0}", formatDateShort(m.meetingDate))}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 13, color: "#b8ada2" }}>{tr("ما فيه محاضر تنتظر اعتمادكم.")}</span>
            )}
          </div>
        )}
        {err && <p className="dc-err">{err}</p>}
        <div className="dc-input">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && ready && !busy) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={mode === "request" ? tr("وش تبون يسوون؟") : mode === "meeting" ? tr("كلمة مع الموعد (اختياري)") : mode === "approval" ? tr("ملاحظة مع الاعتماد (اختياري)") : tr("اكتبوا للفريق…")}
            aria-label={tr("الرسالة")}
          />
          <button type="button" className="dc-send" disabled={!ready || busy} onClick={() => void send()}>
            <Send size={17} aria-hidden />
            {tr("أرسلوا")}
          </button>
        </div>
      </div>
    </section>
  );
}

function RequestCard({ m }: { m: DocMsg }) {
  const p = m.payload as { assignee_name?: string; due?: string | null; title?: string };
  return (
    <div className="dc-card gold">
      <span className="dc-tick">
        <Check size={14} aria-hidden />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#FFC777" }}>{tr("صار مهمة")}</span>
        <b style={{ display: "block", fontSize: 14 }}>{p.title || m.body}</b>
      </div>
      {p.assignee_name && <span className="dc-av sm">{avatarLetter(p.assignee_name)}</span>}
      {p.due && <span style={{ fontSize: 12, color: "#b8ada2" }}>{formatWeekday(p.due)}</span>}
    </div>
  );
}

export function MeetingCard({ m, members, actions }: { m: DocMsg; members: { id: string; name: string }[]; actions?: React.ReactNode }) {
  const p = m.payload as { date?: string; time?: string; place?: string; duration?: number };
  const d = p.date ? new Date(`${p.date}T12:00:00`) : null;
  return (
    <div className="dc-card meet">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="dc-cal">
          <span>{d ? formatWeekday(p.date!) : ""}</span>
          <b dir="ltr">{d ? d.getDate() : "—"}</b>
        </span>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#FFC777" }}>{tr("موعد اجتماع")}</span>
          <b style={{ display: "block", fontSize: 15 }}>
            <span dir="ltr">{p.time}</span>
            {p.place ? ` · ${p.place}` : ""}
          </b>
          <span style={{ fontSize: 12, color: "#b8ada2" }}>
            {p.duration ? tr("{0} دقيقة", p.duration) + " · " : ""}
            {tr("انضاف لتقويم الفريق")}
          </span>
        </div>
      </div>
      {members.length > 0 && (
        <div className="dc-rsvps">
          {members.map((x, i) => {
            const r = m.rsvps[x.id];
            return (
              <span key={x.id} className={r === "yes" ? "dc-rsvp ok" : "dc-rsvp"} title={x.name}>
                <span className="dc-av xs" style={{ background: AV[i % AV.length] }}>
                  {avatarLetter(x.name)}
                </span>
                {r === "yes" ? <Check size={13} aria-label={tr("بيحضر")} /> : r === "no" ? tr("ما يقدر") : tr("ما رد")}
              </span>
            );
          })}
        </div>
      )}
      {actions}
    </div>
  );
}
