import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Award, BarChart3, Bell, CalendarDays, FileText, HelpCircle, Hourglass as HourglassIcon, Home, Languages, Link2, Radar as RadarIcon, Settings, Users, X } from "lucide-react";
import { isEn, setLang, tr } from "../lib/i18n";
import { formatDateShort } from "../lib/date";
import { forgetTeam, loadTeams, rememberTeam } from "../lib/supervisorLocal";
import { relTime } from "../components/supervisor/SvParts";
import { Ledger, type LedgerRow } from "../components/sup/SupParts";
import { AwaySheet, DeadlinesSheet, ExtCard, TimeLog } from "../components/sup/SvTime";
import { lastActivity, loadTeam, proofProgress, radarOf, requestChips, waitingItems, type TeamData, type WaitItem, type WaitKind } from "../lib/supervisorDash";

type View = "home" | "teams" | "requests" | "meetings" | "reports" | "settings";
const NAME_KEY = "wesync-supervisor-name";
const AV = ["#FFC85A", "#FFB444", "#FFE3C2", "#FF9A5A"];
const dateFmt = new Intl.DateTimeFormat(isEn ? "en-GB" : "ar-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long" });
const todayISO = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

const WAIT_ICON: Record<WaitKind, ReactNode> = {
  extension: <HourglassIcon size={18} aria-hidden />,
  receipt: <Award size={18} aria-hidden />,
  minutes: <FileText size={18} aria-hidden />,
  decision: <HelpCircle size={18} aria-hidden />,
  booking: <CalendarDays size={18} aria-hidden />,
  question: <HelpCircle size={18} aria-hidden />,
  radar: <RadarIcon size={18} aria-hidden />,
};

function docName(raw: string): string {
  const n = raw.trim();
  if (!n) return tr("د.");
  return /^(د\.|د |dr\.?\s)/i.test(n) ? n : `${tr("د.")} ${n}`;
}

export default function SupervisorDash() {
  const [params, setParams] = useSearchParams();
  const view = (params.get("v") as View) || "home";
  const nav = useNavigate();
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [teams, setTeams] = useState<TeamData[]>(() => loadTeams().map((s) => ({ token: s.token, name: s.teamName, state: "loading", dash: null, board: null, items: [] })));
  const [sheet, setSheet] = useState<null | "away" | { deadlines: string }>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const today = teams.find((t) => t.dash)?.dash?.today ?? todayISO();

  const reload = useCallback(async () => {
    const saved = loadTeams();
    const res = await Promise.all(saved.map((s) => loadTeam(s.token, s.teamName)));
    res.forEach((r) => r.state === "ok" && rememberTeam(r.token, r.name));
    setTeams(res);
  }, []);
  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 60_000);
    return () => clearInterval(t);
  }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // من «ردّوا»: ننزل لكرت الطلب نفسه
  useEffect(() => {
    const id = window.location.hash.split("#").pop();
    if (view !== "requests" || !id?.startsWith("ext-")) return;
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" }), 200);
  }, [view, teams]);

  const ok = teams.filter((t) => t.state === "ok");
  const waits = useMemo(() => waitingItems(ok), [ok]);
  const away = ok.find((t) => t.dash?.away)?.dash?.away ?? null;
  const go = (v: View) => setParams(v === "home" ? {} : { v });
  const done = (msg: string) => {
    setToast(msg);
    setSheet(null);
    void reload();
  };
  const openWait = (w: WaitItem) => (w.to.startsWith("?") ? (go("requests"), setTimeout(() => document.getElementById(`ext-${w.extId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 250)) : nav(w.to));

  const rows = ok
    .map((t) => {
      const prog = t.dash ? proofProgress(t.dash) : null;
      const radar = t.dash ? radarOf(t.dash) : null;
      const need = waits.filter((w) => w.token === t.token).length * 10 + (radar?.tone === "late" ? 3 : radar?.tone === "orange" ? 2 : 0);
      return { t, prog, radar, need, chips: requestChips(t.items), last: lastActivity(t.dash) };
    })
    .sort((a, b) => b.need - a.need);

  const openReq = ok.reduce((n, t) => {
    const c = requestChips(t.items);
    return n + c.waiting + c.doing;
  }, 0);
  const slots = ok
    .flatMap((t) => (t.dash?.bookings ?? []).filter((b) => b.date === today && b.status === "confirmed").map((b) => ({ ...b, team: t.name })))
    .sort((a, b) => a.time.localeCompare(b.time));
  const progs = rows.filter((r) => r.prog && r.prog.total).map((r) => r.prog!.pct);
  const avg = progs.length ? Math.round(progs.reduce((a, b) => a + b, 0) / progs.length) : 0;
  const pendingExt = ok.flatMap((t) => (t.dash?.extensions ?? []).filter((e) => e.status === "pending").map((e) => ({ e, t })));
  const log = ok.flatMap((t) => (t.dash?.log ?? []).map((l) => ({ ...l, team: t.name }))).sort((a, b) => b.at.localeCompare(a.at));
  const ledger: LedgerRow[] = ok.flatMap((t) => t.items.map((c) => ({ ...c, title: `${c.title} · ${t.name}`, owner: c.assignee ? { name: c.assignee } : null })));
  const needsSql = ok.length > 0 && ok.every((t) => !t.dash);
  const hour = new Date().getHours();
  const dn = docName(name);

  const addLink = () => {
    const m = link.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!m) return setToast(tr("الرابط ما فيه رمز فريق — انسخوه كامل من رسالة الفريق."));
    rememberTeam(m[0].toLowerCase(), "");
    setLink("");
    setTeams((p) => [...p.filter((x) => x.token !== m[0].toLowerCase()), { token: m[0].toLowerCase(), name: "", state: "loading", dash: null, board: null, items: [] }]);
    void reload();
  };

  const NAV: { v: View; label: string; icon: ReactNode; badge?: number }[] = [
    { v: "home", label: tr("الرئيسية"), icon: <Home size={18} aria-hidden /> },
    { v: "teams", label: tr("فرقي"), icon: <Users size={18} aria-hidden /> },
    { v: "requests", label: tr("الطلبات"), icon: <FileText size={18} aria-hidden />, badge: waits.length },
    { v: "meetings", label: tr("المواعيد"), icon: <CalendarDays size={18} aria-hidden /> },
    { v: "reports", label: tr("التقارير"), icon: <BarChart3 size={18} aria-hidden /> },
    { v: "settings", label: tr("الإعدادات"), icon: <Settings size={18} aria-hidden /> },
  ];
  const navBtns = NAV.map((n) => (
    <button key={n.v} type="button" className="sd-nav" aria-current={view === n.v ? "page" : undefined} onClick={() => go(n.v)}>
      {n.icon}
      {n.label}
      {!!n.badge && <span className="sd-badge">{n.badge}</span>}
    </button>
  ));

  // ───────── الكتل ─────────
  const waitCard =
    waits.length > 0 ? (
      <section className="sd-wait sd-in" aria-labelledby="sd-wait-h">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <b style={{ fontSize: 64, lineHeight: 1 }} dir="ltr">
            {waits.length}
          </b>
          <div style={{ lineHeight: 1.3 }}>
            <div id="sd-wait-h" style={{ fontSize: 22, fontWeight: 800 }}>
              {tr("ينتظركم")}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#3A1504" }}>{tr("باقي الطلبات ماشية مع الطلاب")}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          {waits.slice(0, 3).map((w) => (
            <div key={w.key} className="sd-wait-row">
              <span className="sd-wait-ic">{WAIT_ICON[w.kind]}</span>
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                <b style={{ fontSize: 15 }}>{w.title}</b>
                <div style={{ fontSize: 13, color: "#3A1504", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.sub}</div>
              </div>
              <button type="button" className="sd-wait-btn" onClick={() => openWait(w)}>
                {w.action}
              </button>
            </div>
          ))}
          {waits.length > 3 && (
            <button type="button" className="sd-wait-btn" style={{ marginTop: 6, background: "rgba(42,14,2,.14)", color: "#2A0E02" }} onClick={() => go("requests")}>
              {tr("كل الطلبات ({0})", waits.length)}
            </button>
          )}
        </div>
      </section>
    ) : (
      <section className="sd-glass sd-calm sd-in">
        <b style={{ fontSize: 22 }}>{tr("ما فيه شي ينتظركم")}</b>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#E9D3B8" }}>{ok.length ? tr("كل الطلبات ماشية مع الطلاب.") : tr("أضيفوا رابط فريق عشان تبدأ اللوحة.")}</p>
      </section>
    );

  const kpi = (i: number, icon: ReactNode, value: ReactNode, label: string) => (
    <div className={`sd-glass sd-kpi sd-in sd-d${i}`}>
      <span style={{ color: "#FFC777" }}>{icon}</span>
      <b dir="ltr" style={{ textAlign: "start" }}>
        {value}
      </b>
      <span className="l">{label}</span>
    </div>
  );
  const kpis = (
    <div className="sd-kpis">
      {kpi(1, <Users size={16} aria-hidden />, ok.length, tr("فرق"))}
      {kpi(2, <FileText size={16} aria-hidden />, openReq, tr("طلبات مفتوحة"))}
      {kpi(3, <CalendarDays size={16} aria-hidden />, slots.length, tr("اجتماعات اليوم"))}
      {kpi(4, <BarChart3 size={16} aria-hidden />, `${avg}%`, tr("متوسط التقدّم بالدليل"))}
    </div>
  );

  const back2back = slots.length > 1 && slots.every((s, i) => i === 0 || minutes(s.time) - (minutes(slots[i - 1].time) + slots[i - 1].durationMin) <= 10);
  const day = (
    <section className="sd-glass sd-in sd-d4" aria-labelledby="sd-day-h">
      <div className="sd-h">
        <span className="sup-ic">
          <CalendarDays size={16} aria-hidden />
        </span>
        <b id="sd-day-h">{tr("يومك")}</b>
        <span className="note">{slots.length ? (back2back ? tr("{0} اجتماعات ورا بعض", slots.length) : tr("{0} اجتماعات", slots.length)) : ""}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        {slots.length === 0 && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#ABA095" }}>{tr("ما فيه اجتماعات اليوم.")}</p>}
        {slots.map((s) => (
          <div key={s.id} className="sd-slot">
            <b className="t" dir="ltr">
              {s.time}
            </b>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{s.team}</span>
            <span style={{ fontSize: 12, color: "#ABA095" }}>{tr("{0} د", s.durationMin)}</span>
          </div>
        ))}
      </div>
    </section>
  );

  const toneCls = (tone?: string) => (tone === "late" ? "sd-late" : tone === "orange" ? "sd-orange" : "sd-gold");
  const avatars = (t: TeamData) => (
    <div className="sd-avs" aria-hidden>
      {(t.dash?.members ?? []).slice(0, 5).map((m, i) => (
        <span key={m.id} style={{ background: AV[i % AV.length] }}>
          {(m.initials || m.name).charAt(0)}
        </span>
      ))}
    </div>
  );
  const teamsBlock = (full: boolean) => (
    <section className="sd-glass sd-in sd-d2" aria-labelledby="sd-teams-h">
      <div className="sd-h" style={{ marginBottom: 10 }}>
        <span className="sup-ic">
          <Users size={16} aria-hidden />
        </span>
        <b id="sd-teams-h">{tr("فرقك")}</b>
        <span style={{ fontSize: 13, color: "#ABA095" }}>{tr("مرتبة حسب اللي يحتاجك")}</span>
      </div>
      {rows.length === 0 && teams.every((t) => t.state !== "loading") && <p style={{ margin: 0, fontSize: 14, color: "#ABA095" }}>{tr("ما فيه فرق بعد. الصقوا رابط المتابعة اللي أرسله لكم الفريق:")}</p>}
      {teams.some((t) => t.state === "loading") && rows.length === 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="sup-skel" />
          <div className="sup-skel" style={{ width: "70%" }} />
        </div>
      )}
      <div className="sd-tdesk">
        {rows.length > 0 && (
          <div className="sd-tgrid sd-thead" style={{ paddingTop: 0 }}>
            <span>{tr("الفريق")}</span>
            <span>{tr("التقدّم بالدليل")}</span>
            <span>{tr("طلباتك")}</span>
            <span>{tr("التسليم")}</span>
            <span>{tr("آخر نشاط")}</span>
            <span />
          </div>
        )}
        {rows.map(({ t, prog, radar, chips, last }) => (
          <div key={t.token} className="sd-tgrid sd-trow">
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 15 }}>{t.name || tr("فريق بدون اسم")}</b>
              {avatars(t)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ fontSize: 18, width: 46 }} dir="ltr">
                {prog ? `${prog.pct}%` : "—"}
              </b>
              <span className="sd-bar">
                <span style={{ width: `${prog?.pct ?? 0}%` }} />
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {chips.waiting > 0 && <span className="sup-chip gold">{tr("ينتظر {0}", chips.waiting)}</span>}
              {chips.doing > 0 && <span className="sup-chip">{tr("قيد {0}", chips.doing)}</span>}
              {chips.done > 0 && <span className="sup-chip">{tr("خلص {0}", chips.done)}</span>}
              {!chips.waiting && !chips.doing && !chips.done && <span style={{ fontSize: 12, color: "#ABA095" }}>—</span>}
            </div>
            <div style={{ lineHeight: 1.35 }}>
              {t.dash?.project?.deadline ? <b style={{ fontSize: 14 }}>{formatDateShort(t.dash.project.deadline)}</b> : <span style={{ fontSize: 13, color: "#ABA095" }}>{tr("بدون موعد")}</span>}
              {radar && (
                <div className={`sd-risk ${toneCls(radar.tone)}`}>
                  <i />
                  {radar.short}
                </div>
              )}
            </div>
            <span style={{ fontSize: 13, color: "#E9D3B8" }}>{last ? relTime(last) : "—"}</span>
            <div style={{ display: "grid", gap: 6 }}>
              <Link to={`/supervisor/${t.token}`} className="sd-open">
                {tr("افتحوا")}
              </Link>
              {full && t.dash && (
                <button type="button" className="sd-open" onClick={() => setSheet({ deadlines: t.token })}>
                  {tr("المواعيد النهائية")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="sd-tmob">
        {rows.map(({ t, prog, radar }) => (
          <div key={t.token} className="sd-glass sd-mteam">
            <Link to={`/supervisor/${t.token}`} style={{ color: "inherit", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <b style={{ flex: 1, fontSize: 16 }}>{t.name || tr("فريق بدون اسم")}</b>
                {radar && (
                  <span className={`sd-risk ${toneCls(radar.tone)}`}>
                    <i />
                    {radar.short}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <b style={{ fontSize: 15 }} dir="ltr">
                  {prog ? `${prog.pct}%` : "—"}
                </b>
                <span className="sd-bar">
                  <span style={{ width: `${prog?.pct ?? 0}%` }} />
                </span>
                <span style={{ fontSize: 12, color: "#E9D3B8", whiteSpace: "nowrap" }}>{t.dash?.project?.deadline ? tr("تسليم {0}", formatDateShort(t.dash.project.deadline)) : tr("بدون موعد")}</span>
              </div>
            </Link>
            {full && t.dash && (
              <button type="button" className="sd-open" style={{ width: "100%", marginTop: 10 }} onClick={() => setSheet({ deadlines: t.token })}>
                {tr("المواعيد النهائية")}
              </button>
            )}
          </div>
        ))}
      </div>
      {full && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <label className="sd-field" style={{ flex: 1 }}>
            <Link2 size={16} aria-hidden style={{ color: "#ABA095" }} />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={tr("الصقوا رابط فريق جديد")} aria-label={tr("الصقوا رابط فريق جديد")} dir="ltr" />
          </label>
          <button type="button" className="sup-btn-cream" style={{ flex: "none", padding: "0 18px", minHeight: 48 }} disabled={!link.trim()} onClick={addLink}>
            {tr("أضيفوه")}
          </button>
        </div>
      )}
      {full && teams.some((t) => t.state === "error") && (
        <div style={{ marginTop: 12 }}>
          {teams
            .filter((t) => t.state === "error")
            .map((t) => (
              <div key={t.token} className="sup-row sup-dim">
                <span style={{ flex: 1, fontSize: 13 }}>{tr("{0} — الرابط ما عاد يشتغل", t.name || tr("فريق"))}</span>
                <button type="button" className="sup-star" aria-label={tr("إزالة من القائمة")} onClick={() => (forgetTeam(t.token), setTeams((p) => p.filter((x) => x.token !== t.token)))}>
                  <X size={16} aria-hidden />
                </button>
              </div>
            ))}
        </div>
      )}
    </section>
  );

  const radarBlock = (
    <section className="sd-glass sd-in sd-d3" aria-labelledby="sd-radar-h">
      <div className="sd-h">
        <span className="sup-ic">
          <RadarIcon size={16} aria-hidden />
        </span>
        <b id="sd-radar-h">{tr("رادار التأخير")}</b>
      </div>
      <div className="sd-legend">
        <span>
          <i style={{ width: 10, height: 4, background: "#FFC777" }} /> {tr("اللي راح من الوقت")}
        </span>
        <span>
          <i style={{ width: 10, height: 4, background: "repeating-linear-gradient(90deg,#FF9A3C 0 3px,transparent 3px 5px)" }} /> {tr("التوقع بسرعتهم")}
        </span>
        <span>
          <i style={{ width: 2, height: 10, background: "#F2EBE3" }} /> {tr("الموعد")}
        </span>
      </div>
      {rows.filter((r) => r.radar).length === 0 && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#ABA095" }}>{needsSql ? tr("الرادار يشتغل بعد تحديث قاعدة البيانات.") : tr("ما فيه بيانات كفاية بعد.")}</p>}
      {rows
        .filter((r) => r.radar)
        .map(({ t, radar }, i) => {
          const r = radar!;
          const color = r.tone === "late" ? "#FF8A7A" : r.tone === "orange" ? "#FF9A3C" : "#FFC777";
          const f = r.pos.finish;
          return (
            <div key={t.token} style={{ padding: "10px 0", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                <b>{t.name}</b>
                <span style={{ color, fontWeight: 800 }}>{r.label}</span>
              </div>
              <div className="sd-radar" role="img" aria-label={`${t.name}: ${r.label}`}>
                <span style={{ top: 9, insetInline: 0, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.07)" }} />
                <span style={{ top: 9, insetInlineStart: 0, width: `${r.pos.today}%`, height: 4, borderRadius: 99, background: "linear-gradient(90deg,#FFC777,#FF7A1A)" }} />
                {f !== null && f > r.pos.today && <span style={{ top: 9, insetInlineStart: `${r.pos.today}%`, width: `${f - r.pos.today}%`, height: 4, background: `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 10px)`, opacity: 0.8 }} />}
                {r.pos.deadline !== null && <span title={tr("الموعد")} style={{ top: 0, insetInlineStart: `${r.pos.deadline}%`, width: 2, height: 22, background: "#F2EBE3" }} />}
                {f !== null && <span style={{ top: 4, insetInlineStart: `calc(${f}% - 7px)`, width: 14, height: 14, borderRadius: "50%", background: color, boxShadow: "0 0 0 4px rgba(0,0,0,.4)" }} />}
              </div>
            </div>
          );
        })}
    </section>
  );

  const ledgerBlock = <Ledger rows={ledger} docName={dn} />;

  const others = waits.filter((w) => w.kind !== "extension");
  const requestsView = (
    <>
      {others.length > 0 && (
        <section className="sd-glass sd-in">
          <div className="sd-h">
            <span className="sup-ic">
              <Bell size={16} aria-hidden />
            </span>
            <b>{tr("تنتظركم")}</b>
            <span className="note">{others.length}</span>
          </div>
          {others.map((w) => (
            <div key={w.key} className="sup-row">
              <span className="sup-ic">{WAIT_ICON[w.kind]}</span>
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                <b style={{ fontSize: 14 }}>{w.title}</b>
                <div style={{ fontSize: 12, color: "#ABA095", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.sub}</div>
              </div>
              <button type="button" className="sd-open" onClick={() => openWait(w)}>
                {w.action}
              </button>
            </div>
          ))}
        </section>
      )}
      {needsSql && <p className="sd-glass" style={{ margin: 0, fontSize: 14, color: "#E9D3B8" }}>{tr("طلبات التمديد تشتغل بعد تحديث قاعدة البيانات.")}</p>}
      <div className="sd-bottom" style={{ gridTemplateColumns: undefined }}>
        <div style={{ display: "grid", gap: 18 }}>
          {pendingExt.length === 0 && !needsSql && (
            <section className="sd-glass">
              <b style={{ fontSize: 17 }}>{tr("طلبات الوقت")}</b>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#ABA095" }}>{tr("ما فيه طلبات تمديد معلّقة.")}</p>
            </section>
          )}
          {pendingExt.map(({ e, t }, i) => (
            <ExtCard key={e.id} ext={e} team={t.name} token={t.token} name={dn} primary={i === 0} onDone={done} />
          ))}
        </div>
        <TimeLog log={log} showTeam limit={12} />
      </div>
    </>
  );

  const meetingsView = (
    <>
      {day}
      <section className="sd-glass">
        <div className="sd-h">
          <span className="sup-ic">
            <CalendarDays size={16} aria-hidden />
          </span>
          <b>{tr("الجاية")}</b>
        </div>
        {ok.flatMap((t) => (t.dash?.bookings ?? []).filter((b) => b.date > today).map((b) => ({ ...b, team: t.name, token: t.token }))).length === 0 && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#ABA095" }}>{tr("ما فيه مواعيد جاية.")}</p>}
        {ok
          .flatMap((t) => (t.dash?.bookings ?? []).filter((b) => b.date > today).map((b) => ({ ...b, team: t.name, token: t.token })))
          .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
          .map((b) => (
            <Link key={b.id} to={`/supervisor/${b.token}?open=booking:${b.id}`} className="sd-slot" style={{ color: "inherit" }}>
              <b className="t" dir="ltr">
                {b.time}
              </b>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{b.team}</span>
              <span style={{ fontSize: 12, color: b.status === "pending" ? "#FFC777" : "#ABA095" }}>
                {formatDateShort(b.date)} {b.status === "pending" ? `· ${tr("ينتظر ردكم")}` : ""}
              </span>
            </Link>
          ))}
      </section>
    </>
  );

  const reportsView = (
    <section className="sd-glass">
      <div className="sd-h">
        <span className="sup-ic">
          <BarChart3 size={16} aria-hidden />
        </span>
        <b>{tr("التقارير")}</b>
      </div>
      <p style={{ margin: "4px 0 6px", fontSize: 13, color: "#ABA095" }}>{tr("تقرير شهري لكل فريق، جاهز للطباعة أو PDF.")}</p>
      {ok.map((t) => (
        <div key={t.token} className="sup-row">
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t.name}</span>
          <Link to={`/supervisor/${t.token}/report`} className="sd-open">
            {tr("افتحوا التقرير")}
          </Link>
        </div>
      ))}
    </section>
  );

  const settingsView = (
    <section className="sd-glass" style={{ display: "grid", gap: 14 }}>
      <div className="sd-h">
        <span className="sup-ic">
          <Settings size={16} aria-hidden />
        </span>
        <b>{tr("الإعدادات")}</b>
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="sup-lbl" style={{ marginTop: 0 }}>
          {tr("اسمكم (يظهر للطلاب)")}
        </span>
        <span className="sd-field">
          <input
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              try {
                localStorage.setItem(NAME_KEY, e.target.value);
              } catch {
                /* بدون تخزين */
              }
            }}
            placeholder={tr("د. ...")}
          />
        </span>
      </label>
      <div>
        <span className="sup-lbl">{tr("اللغة")}</span>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button type="button" className="sd-chipbtn" aria-pressed={isEn} onClick={() => setLang("en")}>
            English
          </button>
          <button type="button" className="sd-chipbtn" aria-pressed={!isEn} onClick={() => setLang("ar")}>
            العربية
          </button>
        </div>
      </div>
      <div>
        <span className="sup-lbl">{tr("مو متاح/ة")}</span>
        <div style={{ marginTop: 6 }}>
          <button type="button" className="sup-btn-cream" style={{ padding: "0 18px" }} onClick={() => setSheet("away")}>
            {away ? tr("مو متاح/ة لين {0} — عدّلوا", formatDateShort(away.to)) : tr("حددوا «مو متاح/ة»")}
          </button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#ABA095" }}>{tr("إشعارات الإيميل لكل فريق من صفحة الفريق نفسه.")}</p>
    </section>
  );

  const deadlineTeam = sheet && typeof sheet === "object" ? ok.find((t) => t.token === sheet.deadlines) : null;

  return (
    <div className="sd-page">
      <div className="sd-wrap">
        <aside className="sd-side" aria-label={tr("بوابة المشرف/ة")}>
          <div className="sd-brand">
            <span className="sd-sun" aria-hidden />
            <div style={{ lineHeight: 1.2 }}>
              <b style={{ fontSize: 20 }}>Wesync</b>
              <div style={{ fontSize: 12, color: "#FFB444" }}>{tr("بوابة المشرف/ة")}</div>
            </div>
          </div>
          {navBtns}
          <span style={{ flex: 1 }} />
          <button type="button" className="sd-nav" onClick={() => setLang(isEn ? "ar" : "en")} aria-label={isEn ? "التبديل للعربية" : "Switch to English"}>
            <Languages size={18} aria-hidden />
            {isEn ? "العربية" : "English"}
          </button>
          <div className="sd-me">
            <span className="sd-docav" aria-hidden>
              {dn.replace(/^(د\.|Dr\.?)\s*/i, "").charAt(0) || "د"}
            </span>
            <div style={{ lineHeight: 1.35 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{dn}</div>
              <div style={{ fontSize: 12, color: "#ABA095" }}>{tr("{0} فرق", ok.length)}</div>
            </div>
          </div>
        </aside>

        <main className="sd-main">
          <header style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="sd-hi">{hour < 12 ? tr("صباح الخير يا") : tr("مساء الخير يا")}</div>
              <h1 className="sd-name" style={{ margin: 0 }}>
                {dn}
              </h1>
              <div className="sd-sub">
                {dateFmt.format(new Date())} · {waits.length ? tr("{0} أشياء تنتظرك، والباقي ماشي", waits.length) : tr("كل شي ماشي")}
              </div>
            </div>
            <button type="button" className="sd-pill" onClick={() => setSheet("away")}>
              <i className={away ? "away" : ""} aria-hidden />
              {away ? tr("مو متاح/ة لين {0}", formatDateShort(away.to)) : tr("متاح/ة")}
              <span>{away ? tr("عدّلوا") : tr("حددوا «مو متاح/ة»")}</span>
            </button>
            <button type="button" className="sd-bell" aria-label={waits.length ? tr("التنبيهات: {0} تنتظركم", waits.length) : tr("التنبيهات")} onClick={() => go("requests")}>
              <Bell size={18} aria-hidden />
              {waits.length > 0 && <i />}
            </button>
          </header>
          <nav className="sd-mnav" aria-label={tr("بوابة المشرف/ة")}>
            {navBtns}
          </nav>

          {view === "home" && (
            <>
              <div className="sd-top">
                {waitCard}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div className="sd-tdesk">{kpis}</div>
                  {day}
                </div>
              </div>
              {teamsBlock(false)}
              <div className="sd-bottom">
                {ledgerBlock}
                {radarBlock}
              </div>
            </>
          )}
          {view === "teams" && (
            <>
              {teamsBlock(true)}
              {radarBlock}
            </>
          )}
          {view === "requests" && requestsView}
          {view === "meetings" && meetingsView}
          {view === "reports" && reportsView}
          {view === "settings" && settingsView}
        </main>
      </div>

      {sheet === "away" && (
        <AwaySheet
          teams={ok.map((t) => ({ token: t.token, dash: t.dash, pendingCount: waits.filter((w) => w.token === t.token && w.kind !== "radar").length }))}
          name={dn}
          today={today}
          current={away}
          onClose={() => setSheet(null)}
          onSaved={done}
        />
      )}
      {deadlineTeam?.dash && <DeadlinesSheet token={deadlineTeam.token} team={deadlineTeam.name} dash={deadlineTeam.dash} name={dn} onClose={() => setSheet(null)} onSaved={(m) => (setToast(m), void reload())} />}
      {toast && (
        <div className="sd-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
