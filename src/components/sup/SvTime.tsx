import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabaseClient";
import { tr } from "../../lib/i18n";
import { formatDateShort, formatWeekday } from "../../lib/date";
import { relTime } from "../supervisor/SvParts";
import {
  clearAway,
  dayCount,
  daysBetween,
  reasonLabel,
  resolveExtension,
  setAway,
  setProjectDeadline,
  setTaskDue,
  type Dash,
  type DashExtension,
  type DashLog,
} from "../../lib/supervisorDash";

export const dayLabel = (iso: string | null | undefined) => (iso ? `${formatWeekday(iso)} ${formatDateShort(iso)}` : tr("بدون موعد"));

/** ساعة رملية ثلاثية الأبعاد (نفس صورة التصميم) */
export function Hourglass({ px, className = "" }: { px?: number; className?: string }) {
  return (
    <div className={`sup-obj ${className}`} role="img" aria-label={tr("ساعة رملية")} style={px ? { width: px, height: px, flex: "none" } : undefined}>
      <img src="/sup/hour.jpg" alt="" />
    </div>
  );
}

/** شيت من تحت: Esc يقفله، والتركيز يرجع للي فتحه */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("button, input, textarea, a[href]");
    first?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      back?.focus?.();
    };
  }, [onClose]);
  // بورتال للـ body: عشان ما يحبسه أب فيه transform، ويطلع فوق شريط التبويب
  return createPortal(
    <>
      <div className="sd-scrim" aria-hidden onClick={onClose} />
      <section ref={ref} role="dialog" aria-modal="true" aria-label={label} className="sd-sheet">
        <i aria-hidden className="sd-grab" />
        {children}
      </section>
    </>,
    document.body,
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="sd-switch" onClick={() => onChange(!on)}>
      <span>
        <i />
      </span>
    </button>
  );
}

// ───────── كرت طلب التمديد (جهة المشرف/ة) ─────────
export function ExtCard({ ext, team, token, name, primary, onDone }: { ext: DashExtension; team: string; token: string; name: string; primary: boolean; onDone: (msg: string) => void }) {
  const [mode, setMode] = useState<null | "counter" | "reject">(null);
  const [date, setDate] = useState(ext.requestedDue);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const n = ext.currentDue ? daysBetween(ext.currentDue, ext.requestedDue) : null;
  const go = async (decision: "approved" | "countered" | "rejected") => {
    setBusy(true);
    setErr(null);
    const r = await resolveExtension(token, ext.id, decision, decision === "countered" ? date : null, note.trim(), name);
    setBusy(false);
    if (r.error) return setErr(r.error);
    onDone(decision === "approved" ? tr("تمت الموافقة ✓ والموعد الجديد وصلهم") : decision === "countered" ? tr("وصلهم الموعد الثاني ✓") : tr("وصلهم الرد ✓"));
  };
  return (
    <section id={`ext-${ext.id}`} className="sd-glass sd-ext sd-in">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Hourglass className="sd-ext-obj" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#FFB444" }}>{tr("طلب تمديد · {0}", team)}</div>
          <div className="sd-ttl" style={{ fontSize: 24, lineHeight: 1.3 }}>
            {ext.taskTitle}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 14 }}>
            <span className="sup-av" style={{ width: 26, height: 26, background: "#FF9A5A" }} aria-hidden>
              {(ext.requestedBy ?? "؟").charAt(0)}
            </span>
            <span>
              {ext.requestedBy} · {tr("طلب")} <b style={{ color: "#FFC777" }}>{n ? `+${dayCount(n)}` : ""}</b> · {tr("من {0} ← {1}", dayLabel(ext.currentDue), dayLabel(ext.requestedDue))}
            </span>
          </div>
        </div>
      </div>
      <div className="sd-why">
        <span style={{ color: "#FFC777" }}>
          {tr("السبب:")} {reasonLabel(ext.reason)}
          {ext.note ? " ·" : ""}
        </span>{" "}
        {ext.note}
      </div>
      {mode && (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {mode === "counter" && (
            <label className="sd-field">
              <span style={{ fontSize: 13, color: "#ABA095" }}>{tr("الموعد الجديد")}</span>
              <input type="date" value={date} min={ext.currentDue ?? undefined} onChange={(e) => setDate(e.target.value)} />
            </label>
          )}
          <label className="sd-field">
            <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={mode === "reject" ? tr("السبب (يشوفه الفريق)") : tr("ملاحظة للفريق (اختياري)")} aria-label={tr("ملاحظة")} />
          </label>
        </div>
      )}
      {err && (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "#FFB2A6" }}>
          {err}
        </p>
      )}
      <div className="sd-acts">
        {!mode && (
          <>
            <button type="button" className={primary ? "p" : "c"} disabled={busy} onClick={() => go("approved")}>
              {tr("وافقوا")}
            </button>
            <button type="button" className="c" disabled={busy} onClick={() => setMode("counter")}>
              {tr("اعرضوا موعد ثاني")}
            </button>
            <button type="button" className="g" disabled={busy} onClick={() => setMode("reject")}>
              {tr("ارفضوا")}
            </button>
          </>
        )}
        {mode && (
          <>
            <button type="button" className={primary ? "p" : "c"} disabled={busy || (mode === "counter" && !date) || (mode === "reject" && !note.trim())} onClick={() => go(mode === "counter" ? "countered" : "rejected")}>
              {mode === "counter" ? tr("أرسلوا الموعد الثاني") : tr("أرسلوا الرفض")}
            </button>
            <button type="button" className="g" disabled={busy} onClick={() => setMode(null)}>
              {tr("رجوع")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

// ───────── السجل (يشوفه الطرفين) ─────────
export function logText(l: Pick<DashLog, "action" | "taskTitle" | "from" | "to" | "note">): string {
  const n = l.from && l.to ? daysBetween(l.from, l.to) : null;
  const plus = n && n > 0 ? `+${dayCount(n)}` : "";
  switch (l.action) {
    case "requested":
      return tr("طلب تمديد {0} لـ «{1}»", plus, l.taskTitle);
    case "approved":
      return tr("موافقة على {0} لـ «{1}»", plus, l.taskTitle);
    case "countered":
      return tr("موعد ثاني لـ «{0}»: {1}", l.taskTitle, dayLabel(l.to)) + (l.note ? ` · ${l.note}` : "");
    case "rejected":
      return tr("رفض تمديد «{0}»", l.taskTitle) + (l.note ? tr(" · السبب: {0}", l.note) : "");
    case "withdrawn":
      return tr("سحب طلب تمديد «{0}»", l.taskTitle);
    case "due_changed":
      return tr("تغيير موعد «{0}» إلى {1}", l.taskTitle, dayLabel(l.to));
    case "deadline_changed":
      return l.to ? tr("موعد التسليم النهائي صار {0}", dayLabel(l.to)) : tr("انشال موعد التسليم النهائي");
    case "away_on":
      return tr("مو متاح/ة من {0} لين {1}", dayLabel(l.from), dayLabel(l.to)) + (l.note ? ` · ${l.note}` : "");
    case "away_off":
      return tr("رجوع من «مو متاح/ة»");
  }
}
const LOG_DOT: Record<string, string> = { requested: "#FF9A3C", approved: "#FFC777", countered: "#FFC777", due_changed: "#FFC777", deadline_changed: "#FFC777" };

export function TimeLog({ log, title = tr("السجل"), limit = 8, showTeam }: { log: (DashLog & { team?: string })[]; title?: string; limit?: number; showTeam?: boolean }) {
  return (
    <section className="sd-glass" style={{ borderRadius: 26 }}>
      <b style={{ fontSize: 17 }}>{title}</b>
      {log.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: "#ABA095" }}>{tr("ما فيه حركة على المواعيد بعد. كل طلب ورد ينحفظ هنا ويشوفه الطرفين.")}</p>}
      <div style={{ marginTop: 6 }}>
        {log.slice(0, limit).map((l) => (
          <div key={l.id} className="sd-log">
            <i style={{ background: LOG_DOT[l.action] ?? "#ABA095" }} />
            <div style={{ flex: 1, lineHeight: 1.5 }}>
              <div style={{ fontSize: 14, color: "#EAE3DC" }}>{logText(l)}</div>
              <div style={{ fontSize: 12, color: "#ABA095" }}>
                {[showTeam ? l.team : "", l.actorName, relTime(l.at)]
                  .filter(Boolean)
                  .map((x, k) => (
                    <span key={k}>
                      {k > 0 && " · "}
                      <bdi>{x}</bdi>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────── المواعيد: المشرف/ة يتحكم بموعد التسليم ومواعيد المهام ─────────
export function DeadlinesSheet({ token, team, dash, name, onClose, onSaved }: { token: string; team: string; dash: Dash; name: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const [deadline, setDeadline] = useState(dash.project?.deadline ?? "");
  const [dues, setDues] = useState<Record<string, string>>(() => Object.fromEntries(dash.tasks.map((t) => [t.id, t.dueDate ?? ""])));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const open = dash.tasks.filter((t) => t.status !== "done");
  const hid = useId();

  const saveDeadline = async () => {
    setBusy("deadline");
    setErr(null);
    const r = await setProjectDeadline(token, deadline || null, name);
    setBusy(null);
    if (r.error) return setErr(r.error);
    onSaved(tr("انحفظ موعد التسليم ✓ ووصل الفريق"));
  };
  const saveTask = async (id: string, v: string) => {
    const before = dash.tasks.find((t) => t.id === id)?.dueDate ?? "";
    if (v === before) return;
    setBusy(id);
    setErr(null);
    const r = await setTaskDue(token, id, v || null, name);
    setBusy(null);
    if (r.error) return setErr(r.error);
    onSaved(tr("انحفظ الموعد ✓"));
  };

  return (
    <Sheet label={tr("المواعيد النهائية · {0}", team)} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Hourglass px={72} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#FFB444" }}>{team}</div>
          <div id={hid} className="sd-ttl" style={{ fontSize: 24 }}>
            {tr("المواعيد بيدكم")}
          </div>
        </div>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#ABA095" }}>{tr("أي تغيير يوصل الفريق برسالة وينحفظ بالسجل.")}</p>

      <div className="sup-sec" style={{ marginTop: 14 }}>
        {tr("التسليم النهائي للبحث")}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <label className="sd-field" style={{ flex: 1 }}>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label={tr("التسليم النهائي للبحث")} />
        </label>
        <button type="button" className="sup-btn-cream" style={{ flex: "none", padding: "0 18px", minHeight: 48 }} disabled={busy === "deadline" || deadline === (dash.project?.deadline ?? "")} onClick={saveDeadline}>
          {tr("احفظوا")}
        </button>
      </div>

      <div className="sup-sec" style={{ marginTop: 16 }}>
        {tr("مواعيد المهام المفتوحة ({0})", open.length)}
      </div>
      {open.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#ABA095" }}>{tr("ما فيه مهام مفتوحة.")}</p>}
      {open.map((t) => (
        <div key={t.id} className="sup-row" style={{ alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: t.dueDate && t.dueDate < dash.today ? "#FFB2A6" : "#ABA095" }}>{t.assigneeName ?? ""}</div>
          </div>
          <label className="sd-field" style={{ flex: "none", width: 168, minHeight: 44 }}>
            <input
              type="date"
              value={dues[t.id] ?? ""}
              aria-label={tr("موعد «{0}»", t.title)}
              disabled={busy === t.id}
              onChange={(e) => setDues((d) => ({ ...d, [t.id]: e.target.value }))}
              onBlur={(e) => void saveTask(t.id, e.target.value)}
            />
          </label>
        </div>
      ))}
      {err && (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "#FFB2A6" }}>
          {err}
        </p>
      )}
      <button type="button" className="sup-btn-ghost" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>
        {tr("تمّ")}
      </button>
    </Sheet>
  );
}

// ───────── «مو متاح/ة لفترة؟» (DocAwayM) — يتطبق على كل الفرق ─────────
const AWAY_REASONS = [tr("إجازة"), tr("مؤتمر"), tr("ضغط")];

export function AwaySheet({
  teams,
  name,
  today,
  current,
  onClose,
  onSaved,
}: {
  teams: { token: string; dash: Dash | null; pendingCount: number }[];
  name: string;
  today: string;
  current: { from: string; to: string; reason: string } | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [from, setFrom] = useState(current?.from ?? today);
  const [to, setTo] = useState(current?.to ?? today);
  const [reason, setReason] = useState(current?.reason ?? "");
  const [move, setMove] = useState(true);
  const [defer, setDefer] = useState(true);
  const [message, setMessage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const meetings = teams.reduce((n, t) => n + (t.dash?.bookings ?? []).filter((b) => b.date >= from && b.date <= to).length, 0);
  const pending = teams.reduce((n, t) => n + t.pendingCount, 0);
  const valid = !!from && !!to && to >= from;

  const go = async () => {
    setBusy(true);
    setErr(null);
    let moved = 0;
    for (const t of teams) {
      const r = await setAway(t.token, { from, to, reason, move, defer, message }, name);
      if (r.error) {
        setBusy(false);
        return setErr(r.error);
      }
      moved += (r.data as { moved?: number } | null)?.moved ?? 0;
    }
    setBusy(false);
    onSaved(moved ? tr("تفعّل ✓ وانتقلت {0} مواعيد", moved) : tr("تفعّل ✓"));
  };
  const end = async () => {
    setBusy(true);
    for (const t of teams) await clearAway(t.token, name);
    setBusy(false);
    onSaved(tr("رجعتوا متاحين ✓"));
  };

  return (
    <Sheet label={tr("مو متاح/ة")} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Hourglass px={84} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#FFB444" }}>{tr("إجازة · مؤتمر · ضغط")}</div>
          <div className="sd-ttl" style={{ fontSize: 24 }}>
            {tr("مو متاح/ة لفترة؟")}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <label className="sd-box">
          <div style={{ fontSize: 12, color: "#ABA095" }}>{tr("من")}</div>
          <input type="date" value={from} min={today} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="sd-box">
          <div style={{ fontSize: 12, color: "#ABA095" }}>{tr("إلى")}</div>
          <input type="date" value={to} min={from || today} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 4px" }} role="group" aria-label={tr("السبب")}>
        {AWAY_REASONS.map((r) => (
          <button key={r} type="button" className="sd-chipbtn" aria-pressed={reason === r} onClick={() => setReason(reason === r ? "" : r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="sd-tog">
        <span style={{ flex: 1, fontSize: 14 }}>
          {tr("انقلوا المواعيد لحالها")}
          <div style={{ fontSize: 12, color: "#ABA095" }}>{meetings ? tr("{0} مواعيد بتتحرك لأقرب يوم متاح", meetings) : tr("ما فيه مواعيد بهالفترة")}</div>
        </span>
        <Switch on={move} onChange={setMove} label={tr("انقلوا المواعيد لحالها")} />
      </div>
      <div className="sd-tog">
        <span style={{ flex: 1, fontSize: 14 }}>
          {tr("أجّلوا الطلبات")}
          <div style={{ fontSize: 12, color: "#ABA095" }}>{tr("{0} طلبات تنتظر رجعتكم", pending)}</div>
        </span>
        <Switch on={defer} onChange={setDefer} label={tr("أجّلوا الطلبات")} />
      </div>
      <div className="sd-tog">
        <span style={{ flex: 1, fontSize: 14 }}>
          {tr("رسالة للطلاب")}
          <div style={{ fontSize: 12, color: "#ABA095" }}>{tr("«المشرف/ة مو متاح/ة لين {0}»", to ? formatDateShort(to) : "…")}</div>
        </span>
        <Switch on={message} onChange={setMessage} label={tr("رسالة للطلاب")} />
      </div>
      {err && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "#FFB2A6" }}>
          {err}
        </p>
      )}
      <button type="button" className="sd-cta" style={{ marginTop: 10 }} disabled={!valid || busy || !teams.length} onClick={go}>
        {tr("فعّلوا")}
      </button>
      {current && (
        <button type="button" className="sup-btn-ghost" style={{ width: "100%", marginTop: 8 }} disabled={busy} onClick={end}>
          {tr("رجعت — أنهوا «مو متاح/ة»")}
        </button>
      )}
    </Sheet>
  );
}

// ───────── صفحة الفريق عند المشرف/ة: طلبات الوقت + المواعيد + السجل ─────────
export function SvTimePanel({ token, name, openTarget, primary, onToast }: { token: string; name: string; openTarget: string; primary: boolean; onToast: (m: string) => void }) {
  const [dash, setDash] = useState<Dash | null>(null);
  const [sheet, setSheet] = useState(false);
  const opened = useRef(false);
  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("supervisor_dash", { p_token: token });
    if (!error && data) setDash(data as Dash);
  }, [token]);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (opened.current || !dash || !openTarget.startsWith("extension:")) return;
    opened.current = true;
    setTimeout(() => document.getElementById(`ext-${openTarget.slice(10)}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
  }, [dash, openTarget]);
  if (!dash) return null;
  const pending = dash.extensions.filter((e) => e.status === "pending");
  return (
    <section className="sv-sec" aria-labelledby="sv-h-time">
      <h2 id="sv-h-time" className="sv-h">
        {tr("الوقت والمواعيد")}
        {pending.length > 0 && <span className="sv-count">{pending.length}</span>}
      </h2>
      <div style={{ display: "grid", gap: 12 }}>
        {pending.map((e, i) => (
          <ExtCard key={e.id} ext={e} team={dash.teamName} token={token} name={name} primary={primary && i === 0} onDone={(m) => (onToast(m), void load())} />
        ))}
        <div className="sd-glass" style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 22 }}>
          <div style={{ flex: 1, lineHeight: 1.4 }}>
            <b style={{ fontSize: 15 }}>{dash.project?.deadline ? tr("التسليم النهائي {0}", dayLabel(dash.project.deadline)) : tr("ما فيه موعد تسليم نهائي")}</b>
            <div style={{ fontSize: 12, color: "#ABA095" }}>{tr("تقدرون تغيّرون موعد التسليم أو أي مهمة، ويوصلهم التغيير.")}</div>
          </div>
          <button type="button" className="sup-btn-cream" style={{ flex: "none", padding: "0 18px" }} onClick={() => setSheet(true)}>
            {tr("المواعيد النهائية")}
          </button>
        </div>
        {dash.log.length > 0 && <TimeLog log={dash.log} limit={5} />}
      </div>
      {sheet && <DeadlinesSheet token={token} team={dash.teamName} dash={dash} name={name} onClose={() => setSheet(false)} onSaved={(m) => (onToast(m), void load())} />}
    </section>
  );
}
