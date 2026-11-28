import { useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Play } from "lucide-react";
import type { Task } from "../../data/types";
import type { NextStep } from "../../lib/nextSteps";
import type { ReviewIssue } from "../../lib/taskLinks";
import { useSupervisorFeedback } from "../../hooks/useSupervisorFeedback";
import { readSummaryCache } from "../../lib/chatIntel";
import { useAuth } from "../../context/AuthContext";
import { openAgent } from "../../lib/agentBus";
import { daysUntil, formatDateShort } from "../../lib/date";
import { arabicWeekdays } from "../../lib/date";
import { num } from "../v3/WriteHeader";
import { dateAt, useUpcoming } from "./TeamMeetLux";
import { isEn, tr } from "../../lib/i18n";
import "../../styles/lux-home.css";

type Member = { id: string; name: string };

const first = (n: string) => n.trim().split(" ")[0] ?? "";

/** الرئيسية الفخمة (التصميم الموحّد): عنوان + خطوة وحدة + كل اللي يهم الطالب بطاقات، وويسي بمشهده على الجنب. */
export default function LuxHome(props: {
  firstName: string;
  now: Date;
  todayIso: string;
  pct: number;
  step: NextStep | undefined;
  tasks: Task[];
  roster: Member[];
  deadline: string | null;
  daysLeft: number | null;
  review: ReviewIssue[];
  collected: number;
  target: number;
  hasSurvey: boolean;
  weeks: { weeks: number; dots: boolean[] };
  streakOk: boolean | null;
  stagesDone: number;
  stagesTotal: number;
  canWrite: boolean;
  onSetDeadline: () => void;
  top?: ReactNode;
  aside?: ReactNode;
}) {
  const { firstName, now, todayIso, pct, step, tasks, roster, deadline, daysLeft, review, collected, target, hasSurvey, weeks, streakOk, stagesDone, stagesTotal, canWrite, onSetDeadline, top, aside } = props;
  const { next } = useUpcoming(now);
  const { items: feedback } = useSupervisorFeedback();
  const openNotes = feedback.filter((f) => f.status === "open");
  const { team } = useAuth();
  const summary = team ? readSummaryCache(team.id)?.summary ?? null : null;
  const nameOf = (id: string) => first(roster.find((m) => m.id === id)?.name ?? "");

  // المواعيد المستحقة: أقرب ٣ مهام ما خلصت (المتأخر أول)، وموعد التسليم لو قرب
  const due = useMemo(() => {
    const open = tasks
      .filter((t) => t.status !== "done" && t.dueDate)
      .map((t) => ({ id: t.id, title: t.title, date: t.dueDate, left: daysUntil(t.dueDate, now), who: nameOf(t.assigneeId), to: `/tasks?task=${t.id}` }))
      .sort((a, b) => a.left - b.left);
    const list = open.slice(0, 3);
    if (deadline && daysLeft !== null && daysLeft <= 30 && list.length < 3) list.push({ id: "deadline", title: tr("التسليم النهائي"), date: deadline, left: daysLeft, who: tr("الفريق"), to: "/" });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, now, deadline, daysLeft, roster]);

  const meetAt = next ? dateAt(next.date, next.time) : null;
  const meetHours = meetAt ? Math.max(0, Math.round((meetAt.getTime() - now.getTime()) / 3600e3)) : null;
  const meetToday = meetAt ? meetAt.toDateString() === now.toDateString() : false;
  const blockers = review.slice(0, 2);

  const sub = [
    step ? tr("خطوة وحدة") : null,
    due.length ? tr("{0} مواعيد قريبة", num(due.length)) : null,
    meetToday ? tr("واجتماع اليوم") : null,
  ]
    .filter(Boolean)
    .join(isEn ? ", " : "، ");

  const weekday = isEn ? now.toLocaleDateString("en", { weekday: "long" }) : `ال${arabicWeekdays[now.getDay()]}`.replace(/^الال/, "ال");

  return (
    <div className="lh-home">
      <div className="lh-main">
        {top}
        {/* ── العنوان + القوس ── */}
        <header className="lh-hero">
          <div className="min-w-0 flex-1">
            <p className="lh-eyebrow">{tr("صباح الخير يا {0} · {1} {2}", `⁨${firstName}⁩`, weekday, formatDateShort(todayIso))}</p>
            <h1 className="lh-title">{tr("يومكم واضح")}</h1>
            {sub && <p className="lh-sub">{sub}</p>}
          </div>
          <Arc pct={pct} />
          {aside}
        </header>

        {/* ── الخطوة الحين: زر برتقالي واحد بس بالصفحة ── */}
        {step && (
          <section className="lh-act" aria-label={tr("خطوتكم الحين")}>
            <div className="min-w-0 flex-1">
              <p className="lh-gold">{tr("خطوتكم الحين، وحدة بس")}</p>
              <p className="lh-step">{step.title}</p>
              <p className="lh-mut">{step.why}</p>
            </div>
            <Link to={step.to} className="lh-btn">
              <Play size={16} fill="currentColor" aria-hidden />
              {step.cta}
            </Link>
          </section>
        )}

        {/* ── الصف الأول: المواعيد · الاجتماع · ملاحظات الدكتورة ── */}
        <div className="lh-grid lh-grid-3">
          <section className="lh-card" style={{ ["--c" as string]: "#FF8A24" }} aria-label={tr("المواعيد المستحقة")}>
            <div className="lh-hd">
              <span className="lh-gold">{tr("المواعيد المستحقة")}</span>
              <Link to="/calendar" className="lh-link">
                {tr("التقويم")}
              </Link>
            </div>
            {due.length === 0 ? (
              <p className="lh-mut mt-3">{tr("ما عليكم مواعيد قريبة. يومكم لكم.")}</p>
            ) : (
              <ul className="lh-due">
                {due.map((d) => (
                  <li key={d.id}>
                    <Link to={d.to} className="lh-due-row">
                      <span className={clsx("lh-days", d.left <= 2 && "hot")}>
                        <b>{d.left < 0 ? "!" : num(d.left)}</b>
                        <small>{d.left < 0 ? tr("متأخرة") : d.left === 0 ? tr("اليوم") : tr("يوم")}</small>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="lh-due-t">{d.title}</span>
                        <span className="lh-mut block text-xs">
                          {formatDateShort(d.date)}
                          {d.who ? ` · ${d.who}` : ""}
                        </span>
                      </span>
                      {d.left >= 0 && d.left <= 2 && <span className="lh-chip hot">{tr("قريب")}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lh-card hot" style={{ ["--c" as string]: "#FF7AA8" }} aria-label={tr("الاجتماع الجاي")}>
            <div className="lh-hd">
              <span className="lh-gold">{meetToday ? tr("اجتماع اليوم") : tr("الاجتماع الجاي")}</span>
              {meetHours !== null && (
                <span className="lh-live">
                  <i aria-hidden />
                  {meetHours < 24 ? tr("بعد {0} ساعة", num(meetHours)) : tr("بعد {0} يوم", num(Math.ceil(meetHours / 24)))}
                </span>
              )}
            </div>
            {next ? (
              <>
                <div className="lh-tl">
                  <span className="lh-tl-t">{next.time || "—"}</span>
                  <span className="lh-tl-ev">
                    <b>{next.title}</b>
                    <span className="lh-mut block text-xs">
                      {formatDateShort(next.date)}
                      {next.where ? ` · ${next.where}` : ""}
                    </span>
                  </span>
                </div>
                {next.agenda.length > 0 && <p className="lh-mut mt-3 text-sm">{tr("الأجندة: {0} نقاط", num(next.agenda.length))}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {next.link ? (
                    <a href={next.link} target="_blank" rel="noreferrer" className="lh-ghost">
                      {tr("ادخلوا الاجتماع")}
                    </a>
                  ) : null}
                  <Link to="/meeting-minutes" className="lh-ghost">
                    {tr("غرفة الاجتماعات")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="lh-mut mt-3">{tr("ما فيه اجتماع محجوز.")}</p>
                <Link to="/meeting-minutes" className="lh-ghost mt-3 inline-flex">
                  {tr("احجزوا موعد مع المشرف/ة")}
                </Link>
              </>
            )}
          </section>

          <section className="lh-card" style={{ ["--c" as string]: "#FF7AA8" }} aria-label={tr("ملاحظات المشرف/ة")}>
            <div className="lh-hd">
              <span className="lh-gold">{tr("ملاحظات المشرف/ة")}</span>
              {openNotes.length > 0 && <span className="lh-chip solid">{tr("{0} مفتوحة", num(openNotes.length))}</span>}
            </div>
            {openNotes[0] ? (
              <>
                <p className="lh-quote">«{openNotes[0].comment}»</p>
                <Link to="/feedback" className="lh-ghost mt-3 inline-flex">
                  {tr("عدّلوا")}
                </Link>
              </>
            ) : (
              <p className="lh-mut mt-3">{tr("ما فيه ملاحظات مفتوحة. كل اللي طلبته خلص.")}</p>
            )}
          </section>
        </div>

        {/* ── الصف الثاني: الاستبيان · المجلس · يوقف شغلكم ── */}
        <div className="lh-grid lh-grid-3">
          <Link to={hasSurvey ? "/collect" : "/study-kit"} className="lh-card lh-row" style={{ ["--c" as string]: "#FFC93C" }} aria-label={tr("ردود الاستبيان")}>
            <Ring value={target ? collected / target : 0} label={num(collected)} />
            <span>
              <span className="lh-gold block">{tr("ردود الاستبيان")}</span>
              {hasSurvey ? (
                <>
                  <b className="block text-lg">{target ? tr("{0} من {1}", num(collected), num(target)) : num(collected)}</b>
                  {target > collected && <span className="lh-mut text-xs">{tr("باقي {0}", num(target - collected))}</span>}
                </>
              ) : (
                <span className="lh-mut text-sm">{tr("ما بدأتوا الجمع لين الحين")}</span>
              )}
            </span>
          </Link>

          <Link to="/chat" className="lh-card" style={{ ["--c" as string]: "#A08CFF" }} aria-label={tr("المجلس")}>
            <div className="lh-hd">
              <span className="lh-gold">{tr("خلاصة المجلس")}</span>
              <span className="lh-link">{tr("المحادثة")}</span>
            </div>
            <p className="mt-2 text-[15px] font-bold leading-relaxed">
              {summary?.decided[0] ? tr("آخر قرار: {0}", summary.decided[0]) : summary?.open[0] ? tr("سؤال مفتوح: {0}", summary.open[0]) : tr("افتحوا المجلس وشوفوا وش صار.")}
            </p>
          </Link>

          <section className={clsx("lh-card", blockers.length && "warn")} aria-label={tr("يوقف شغلكم")}>
            <div className="lh-hd">
              <span className={blockers.length ? "lh-warn" : "lh-gold"}>{blockers.length ? tr("يوقف شغلكم") : tr("ما فيه شي يوقفكم")}</span>
            </div>
            {blockers.length ? (
              <ul className="lh-block">
                {blockers.map((b) => (
                  <li key={b.id}>
                    {b.id === "deadline" && canWrite ? (
                      <button type="button" onClick={onSetDeadline}>
                        {b.text}
                      </button>
                    ) : (
                      <Link to={b.to}>{b.text}</Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lh-mut mt-2 text-sm">{tr("كل شي ماشي. كمّلوا خطوتكم.")}</p>
            )}
          </section>
        </div>

        {/* ── الصف الثالث: السلسلة · العد التنازلي · المراحل ── */}
        <div className="lh-grid lh-grid-3b">
          <section className="lh-card lh-slim" style={{ ["--c" as string]: "#3ED6A0" }} aria-label={tr("سلسلة الفريق")}>
            <div className="lh-hd">
              <span className="lh-gold">{weeks.weeks > 0 ? tr("سلسلة الفريق · {0} أسابيع", num(weeks.weeks)) : tr("سلسلة الفريق")}</span>
              <span className="lh-mut text-xs">{streakOk ? tr("خصم الاستمرار شغّال") : tr("٤ أسابيع ورا بعض = ٣ ريال أقل")}</span>
            </div>
            <div className="lh-dots" aria-hidden>
              {weeks.dots.map((on, i) => (
                <span key={i} className={clsx(on && "on", i === weeks.dots.length - 1 && "now")} />
              ))}
            </div>
          </section>

          <section className="lh-card lh-slim lh-row" style={{ ["--c" as string]: "#7B61FF" }} aria-label={tr("العد التنازلي")}>
            {daysLeft !== null ? (
              <>
                <span>
                  <b className="lh-num">{num(Math.max(0, daysLeft))}</b>
                  <span className="lh-mut block text-xs">{tr("يوم للتسليم")}</span>
                </span>
                <span className="lh-vr" aria-hidden />
                <span className="lh-mut text-sm">{deadline ? formatDateShort(deadline) : ""}</span>
              </>
            ) : canWrite ? (
              <button type="button" className="lh-ghost" onClick={onSetDeadline}>
                {tr("حطّوا موعد التسليم")}
              </button>
            ) : (
              <span className="lh-mut text-sm">{tr("ما فيه موعد تسليم")}</span>
            )}
          </section>

          <Link to="/collect" className="lh-card lh-slim lh-row" style={{ ["--c" as string]: "#3ED6A0" }} aria-label={tr("مراحل البحث")}>
            <span>
              <b className="lh-num">{num(stagesDone)}</b>
              <span className="lh-mut text-xs">
                {" "}
                / {num(stagesTotal)}
              </span>
            </span>
            <span className="lh-mut text-sm">{tr("مراحل خلصت من البحث")}</span>
          </Link>
        </div>
      </div>

      <WesyScene />
    </div>
  );
}

/** القوس: نسبة البحث، يعبّي ويتنفس */
function Arc({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="lh-arc" role="img" aria-label={tr("بحثكم وصل {0}٪", num(p))}>
      <svg viewBox="0 0 300 160" aria-hidden>
        <defs>
          <linearGradient id="lhArc" x1="1" x2="0">
            <stop offset="0" stopColor="#FF6A00" />
            <stop offset="1" stopColor="#FFB547" />
          </linearGradient>
        </defs>
        <path d="M22 150 A128 128 0 0 1 278 150" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" strokeLinecap="round" />
        <path className="lh-arc-v" d="M278 150 A128 128 0 0 0 22 150" pathLength={100} strokeDasharray="100" style={{ ["--to" as string]: 100 - p }} fill="none" stroke="url(#lhArc)" strokeWidth="12" strokeLinecap="round" />
      </svg>
      <b className="lh-arc-n">
        {num(p)}
        <small>٪</small>
      </b>
    </div>
  );
}

function Ring({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className="lh-ring" aria-hidden>
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
        <circle cx="40" cy="40" r="33" fill="none" stroke="var(--c, #FF6A00)" strokeWidth="8" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - v * 100} transform="rotate(-90 40 40)" />
      </svg>
      <b>{label}</b>
    </span>
  );
}

/** مشهد ويسي: رسم كرتوني بسيط بألوان الهوية، وتحته «اسأل ويسي» — ويسي ما يختفي */
function WesyScene() {
  const navigate = useNavigate();
  return (
    <aside className="lh-scene" aria-label={tr("مكتب ويسي")}>
      <svg className="lh-props" viewBox="0 0 360 640" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <linearGradient id="lhDoor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD9A0" />
            <stop offset="1" stopColor="#FF6A00" />
          </linearGradient>
        </defs>
        <path d="M0 520 Q90 490 180 520 T360 512" fill="none" stroke="#FFB547" strokeOpacity=".35" strokeWidth="2" />
        <g className="lh-float">
          <path d="M42 572 V360 a50 50 0 0 1 100 0 V572" fill="#1C0E06" stroke="#F4ECE4" strokeWidth="2.5" />
          <path className="lh-glow" d="M55 572 V364 a37 37 0 0 1 74 0 V572" fill="url(#lhDoor)" />
        </g>
        <path d="M55 572 L129 572 L200 630 L-20 630 Z" fill="#FFB547" opacity=".12" />
        <path d="M18 572 H342" stroke="#F4ECE4" strokeOpacity=".22" strokeWidth="2" />
      </svg>
      <img className="lh-wesy" src="/lux/wz-wave.webp" alt="" width={260} height={612} loading="lazy" decoding="async" />
      <span className="lh-tag">{tr("مكتب ويسي")}</span>
      <div className="lh-cap">
        <p className="lh-gold">{tr("ويسي: رتبت لكم يومكم")}</p>
        <p className="lh-big">{tr("خطوة وحدة اليوم تكفي")}</p>
      </div>
      <button type="button" className="lh-ask" onClick={() => openAgent()}>
        <span className="lh-ask-t">{tr("اسأل ويسي أي شي عن بحثكم…")}</span>
        <b>{tr("اسأل")}</b>
      </button>
      <span className="lh-door r" aria-hidden />
      <span className="lh-door l" aria-hidden />
      <button type="button" className="sr-only" onClick={() => navigate("/explain")}>
        {tr("وش هذا المكان؟")}
      </button>
    </aside>
  );
}
