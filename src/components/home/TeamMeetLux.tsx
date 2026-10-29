import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Flag, ListOrdered, MapPin } from "lucide-react";
import AgentWave from "../ui/AgentWave";
import clsx from "clsx";
import { num } from "../v3/WriteHeader";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { useTeamPresence } from "../../hooks/useTeamPresence";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { useMeetings } from "../../hooks/useMeetings";
import { useResearchProject } from "../../hooks/useResearchProject";
import type { CalendarEventType, Task } from "../../data/types";
import { openAgent } from "../../lib/agentBus";
import { arabicMonths, arabicWeekdays, formatDateShort } from "../../lib/date";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { isEn, tr } from "../../lib/i18n";

/* «الرئيسية — الفريق + الاجتماع (فخمة)»: صف الفريق بعرض الصفحة، وتحته «الاجتماع الجاي» و«هالأسبوع».
   كل البيانات من المصادر الموجودة: أعضاء الفريق، المهام، الحضور اللحظي، التقويم، ومواعيد المشرف/ة. */

const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

/** لون كل عضو (تدرج الأفاتار + هالة الضوء) — ثابت حسب ترتيبه بالفريق */
export const PALETTE = [
  { from: "#FFE08A", to: "#FFB444", tint: "rgba(255,190,80,.7)" },
  { from: "#FFC27A", to: "#FF8A2A", tint: "rgba(255,130,40,.6)" },
  { from: "#FFF3E2", to: "#E7D3BC", tint: "rgba(255,225,190,.45)" },
  { from: "#FF9A5A", to: "#D9500A", tint: "rgba(230,80,20,.6)" },
  { from: "#F6DDBF", to: "#D9AE82", tint: "rgba(240,190,140,.5)" },
  { from: "#FFD3A0", to: "#E07A2E", tint: "rgba(255,160,80,.55)" },
];

/** الصفر العربي «٠» يبان نقطة، فنكتب الصفر 0 */
const n0 = (n: number) => (n === 0 ? "0" : num(n));
/** أول حرف من الاسم الأول للأفاتار الكبير */
export const letter = (name: string) => name.trim().charAt(0) || "؟";
export const weekdayAr = (d: Date) => `ال${arabicWeekdays[d.getDay()]}`.replace(/^الال/, "ال");

const isUrl = (s: string) => /^(https?:\/\/|www\.)/i.test(s.trim());
const hhmm = (t: string) => (t || "").slice(0, 5);

// ───────────────────────────── ١) الفريق مع بعض ─────────────────────────────

export function TeamRow({ tasks, today, style }: { tasks: Task[]; today: string; style?: CSSProperties }) {
  const { currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const online = useTeamPresence();
  const onlineIds = new Set([...online.map((u) => u.id), ...(currentUser ? [currentUser.id] : [])]);
  const weekAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10);
  // بالعرض التجريبي المهام المخلّصة ما لها تاريخ إكمال، فنعدّها من هالأسبوع
  const doneThisWeek = (t: Task) => t.status === "done" && (t.completedAt ? t.completedAt.slice(0, 10) >= weekAgo : !isSupabaseConfigured);

  const cards = roster
    .map((m, i) => {
      const mine = tasks.filter((t) => t.assigneeId === m.id);
      const open = mine.filter((t) => t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const done = mine.filter(doneThisWeek).length;
      const current = open.find((t) => t.status === "in-progress");
      const now = current ?? open[0];
      const pct = done + open.length === 0 ? 0 : Math.round((done / (done + open.length)) * 100);
      return { m, i, now, isCurrent: !!current, open: open.length, done, pct, on: onlineIds.has(m.id), me: m.id === currentUser?.id };
    })
    .sort((a, b) => Number(b.me) - Number(a.me) || a.i - b.i);

  const teamDone = cards.reduce((s, c) => s + c.done, 0);
  const teamTotal = cards.reduce((s, c) => s + c.done + c.open, 0);

  return (
    <section className="relative mb-5" aria-labelledby="lux-team-title">
      <div className="v3-rise mb-3.5 flex flex-wrap items-end justify-between gap-3" style={style}>
        <div>
          <div className="lux-eye">{tr("هالأسبوع")}</div>
          <h2 id="lux-team-title" className="lux-k2 m-0">
            {tr("الفريق مع بعض")}
          </h2>
          <p className="v3-mut m-0 text-[15px]">{tr("وش يشتغل عليه كل واحد هالأسبوع")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          {teamTotal > 0 && (
            <span className="v3-mut text-sm">
              {tr("الفريق خلّص")} <b className="text-[var(--ws-c-text)]">{tr("{0} من {1}", n0(teamDone), n0(teamTotal))}</b> {tr("هالأسبوع")}
            </span>
          )}
          <Link to="/team" className="v3-bd !min-h-[44px] !text-sm">
            {tr("صفحة الفريق ←")}
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="v3-mut m-0 py-4 text-[15px]">{tr("أول ما ينضم أعضاء الفريق، يطلعون هنا مع بعض.")}</p>
      ) : (
        <ul className="lux-team m-0 list-none p-0" style={{ ["--lux-n" as string]: cards.length }}>
          {cards.map(({ m, i, now, isCurrent, open, done, pct, on, me }, idx) => {
            const pal = PALETTE[i % PALETTE.length];
            const green = pct >= 75;
            return (
              <li
                key={m.id}
                className={clsx("lux-mem v3-rise", me && "me")}
                style={{ ...rise(idx + 1), ["--tint" as string]: pal.tint }}
              >
                <div className="lux-aura">
                  {me && <span className="lux-you">{tr("أنت")}</span>}
                  <div className="relative">
                    <div
                      className="lux-ring"
                      style={{ ["--lux-p" as string]: `${pct}%`, ["--lux-c" as string]: green ? "#7FE0A6" : "#FFB65C", ["--lux-glow" as string]: pal.tint }}
                      role="img"
                      aria-label={tr("{0}٪ من المهام خلصت", num(pct))}
                    >
                      <div style={{ background: `linear-gradient(145deg, ${pal.from}, ${pal.to})` }}>{letter(m.name)}</div>
                    </div>
                    <span className="lux-pres" style={{ background: on ? "#7FE0A6" : "#6E645C" }} aria-label={on ? tr("أونلاين الحين") : tr("مو أونلاين")} />
                    <span className="lux-pct">{n0(pct)}٪</span>
                  </div>
                </div>
                <div className="lux-body">
                  <div className="text-center">
                    <div className="lux-name">{m.name.split(" ")[0]}</div>
                    <div className="v3-mut mt-0.5 text-xs">
                      {m.role === "leader" ? tr("قائد/ة الفريق") : tr("عضو")} ·{" "}
                      <span style={{ color: on ? "#7FE0A6" : "var(--ws-c-muted)" }}>{on ? tr("أونلاين الحين") : tr("مو أونلاين")}</span>
                    </div>
                  </div>
                  <div className="lux-now">
                    {now ? (
                      <>
                        <div className="lux-now-k" style={{ color: isCurrent ? "#7FE0A6" : "#E9C9A0" }}>
                          {isCurrent ? tr("الحين") : tr("الجاي")}
                        </div>
                        <Link to={`/tasks?task=${now.id}`} className="mt-0.5 line-clamp-2 block text-sm font-bold leading-[1.5] hover:underline" dir="auto">
                          {now.title}
                        </Link>
                      </>
                    ) : (
                      <div className="v3-mut text-sm">{tr("ما فيه مهام مفتوحة")}</div>
                    )}
                  </div>
                  <div className="lux-split" aria-hidden>
                    {done > 0 && <i style={{ width: `${pct}%`, background: "linear-gradient(90deg,#9BF0BE,#5FD493)" }} />}
                    {open > 0 && <i style={{ flex: 1, background: "rgba(255,182,92,.35)" }} />}
                  </div>
                  <div className="flex w-full justify-between text-xs">
                    <span className="font-extrabold text-[#9BF0BE]">{tr("خلّص {0}", n0(done))}</span>
                    <span className="v3-mut">{tr("باقي {0}", n0(open))}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ───────────────────────────── ٢) الاجتماع الجاي ─────────────────────────────

interface NextMeeting {
  id: string;
  date: string;
  time: string;
  title: string;
  where: string;
  link: string | null;
  agenda: string[];
  fromBooking: boolean;
}

function untilLabel(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return min <= 1 ? tr("بعد دقيقة") : min <= 10 ? tr("بعد {0} دقايق", num(min)) : tr("بعد {0} دقيقة", num(min));
  const h = Math.round(min / 60);
  if (h < 48) return h === 1 ? tr("بعد ساعة") : h === 2 ? tr("بعد ساعتين") : h <= 10 ? tr("بعد {0} ساعات", num(h)) : tr("بعد {0} ساعة", num(h));
  const d = Math.round(h / 24);
  return d <= 10 ? tr("بعد {0} أيام", num(d)) : tr("بعد {0} يوم", num(d));
}

const dateAt = (d: string, t: string) => new Date(`${d}T${hhmm(t) || "00:00"}:00`);

function useUpcoming(now: Date) {
  const { events } = useCalendarEvents();
  const { bookings } = useMeetings();
  const { project } = useResearchProject();
  return useMemo(() => {
    const supervisor = project?.supervisorName?.trim() || "";
    const fromEvents: NextMeeting[] = events
      .filter((e) => e.type === "meeting")
      .map((e) => ({ id: `e-${e.id}`, date: e.date, time: e.time, title: e.title, where: e.location, link: isUrl(e.location) ? e.location : null, agenda: [], fromBooking: false }));
    const fromBookings: NextMeeting[] = bookings
      .filter((b) => b.status === "confirmed" || b.status === "pending")
      .map((b) => ({
        id: `b-${b.id}`,
        date: b.date,
        time: hhmm(b.time),
        title: supervisor ? tr("اجتماع مع {0}", supervisor) : tr("اجتماع مع المشرف/ة"),
        where: b.status === "pending" ? tr("بانتظار تأكيد المشرف/ة") : supervisor,
        link: null,
        agenda: b.note
          .split(/\n|•|- /)
          .map((x) => x.trim())
          .filter(Boolean),
        fromBooking: true,
      }));
    const next = [...fromEvents, ...fromBookings]
      .filter((m) => dateAt(m.date, m.time).getTime() >= now.getTime())
      .sort((a, b) => dateAt(a.date, a.time).getTime() - dateAt(b.date, b.time).getTime())[0];
    return { next, events, supervisor };
  }, [events, bookings, project?.supervisorName, now]);
}

export function MeetLuxCard({ now, style }: { now: Date; style?: CSSProperties }) {
  const { roster } = useTeamRoster();
  const { next, supervisor } = useUpcoming(now);

  const head = (
    <div className="flex items-center justify-between">
      <div className="lux-eye">{tr("الاجتماع الجاي")}</div>
      <Link to="/calendar" className="v3-link !min-h-[36px] !text-[var(--ws-c-muted)]">
        {tr("التقويم ←")}
      </Link>
    </div>
  );

  if (!next) {
    return (
      <section className="lux-meet v3-rise flex flex-col gap-5" style={style} aria-label={tr("الاجتماع الجاي")}>
        {head}
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-[72px] w-[72px] place-items-center rounded-[22px] bg-[rgba(255,140,40,.14)] text-[#FF9A3C]" aria-hidden>
            <CalendarClock size={32} />
          </span>
          <div className="min-w-[180px] flex-1">
            <div className="v3-k text-[22px]">{tr("ما فيه اجتماع قريب")}</div>
            <p className="v3-mut m-0 mt-1 text-sm">{tr("حدّدوا موعد مع المشرف/ة أو اجتماع للفريق، ويطلع هنا.")}</p>
          </div>
        </div>
        <div className="mt-auto flex gap-2.5">
          <Link to="/meeting-minutes?tab=appointments" className="lux-join flex-1">
            {tr("جدولوا اجتماع")}
          </Link>
        </div>
      </section>
    );
  }

  const at = dateAt(next.date, next.time);
  const [h, mi] = (hhmm(next.time) || "00:00").split(":").map(Number);
  const h12 = ((h + 11) % 12) + 1;
  const timeTxt = `${h12}:${String(mi || 0).padStart(2, "0")}`;
  const period = h < 12 ? tr("صباحًا") : tr("مساءً");
  const d = new Date(`${next.date}T12:00:00`);
  const placeOnline = !!next.link || /أونلاين|online|zoom|teams|meet/i.test(next.where);

  return (
    <section className="lux-meet v3-rise flex flex-col gap-5" style={style} aria-labelledby="lux-meet-title">
      {head}
      <div className="flex flex-wrap items-center gap-[18px]">
        <div className="lux-dtile" aria-hidden>
          <div className="t">{isEn ? d.toLocaleDateString("en", { weekday: "long" }) : weekdayAr(d)}</div>
          <div className="b">
            <div className="lux-num text-[42px]">{d.getDate()}</div>
            <div className="mt-1 text-xs text-[#6B5848]">{isEn ? d.toLocaleDateString("en", { month: "long" }) : arabicMonths[d.getMonth()]}</div>
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <span className="lux-soon">
            <i aria-hidden />
            {untilLabel(at.getTime() - now.getTime())}
          </span>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="lux-bigtime" dir="ltr">
              {timeTxt}
            </span>
            <span className="v3-k text-lg text-[#E9C9A0]">{period}</span>
          </div>
          <h3 id="lux-meet-title" className="v3-k m-0 mt-1.5 text-[22px] leading-[1.35]" dir="auto">
            {next.title}
          </h3>
          <div className="v3-mut mt-1.5 flex flex-wrap items-center gap-1.5 text-sm" dir="auto">
            <MapPin size={14} aria-hidden />
            {[next.fromBooking ? "" : supervisor, placeOnline ? tr("أونلاين") : next.where].filter(Boolean).join(" · ") || tr("المكان ما انحدد")}
          </div>
          {roster.length > 0 && (
            <div className="mt-3 flex items-center gap-2.5">
              <div className="lux-avs" aria-hidden>
                {roster.slice(0, 5).map((m, i) => (
                  <span key={m.id} style={{ background: `linear-gradient(145deg, ${PALETTE[i % PALETTE.length].from}, ${PALETTE[i % PALETTE.length].to})` }}>
                    {letter(m.name)}
                  </span>
                ))}
              </div>
              <span className="v3-mut text-[13px]">
                {next.fromBooking && next.where !== tr("بانتظار تأكيد المشرف/ة") ? tr("الموعد مؤكد · الفريق ({0})", num(roster.length)) : tr("الفريق ({0})", num(roster.length))}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[18px] border border-white/[0.06] bg-black/[0.22] px-4 py-3.5">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold">
          <ListOrdered size={15} aria-hidden />
          {tr("الأجندة")}
        </div>
        {next.agenda.length > 0 ? (
          <ol className="m-0 list-none p-0">
            {next.agenda.slice(0, 5).map((a, i) => (
              <li key={i} className="flex gap-2.5 py-1 text-sm">
                <span className="v3-mut w-4 text-[13px]">{num(i + 1)}</span>
                <span dir="auto">{a}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="v3-mut m-0 text-sm">
            {tr("ما فيه أجندة بعد ·")}{" "}
            <Link to={next.fromBooking ? "/meeting-minutes?tab=appointments" : "/calendar"} className="v3-link !inline !min-h-0 !text-sm">
              {tr("أضيفوها")}
            </Link>
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2.5">
        {next.link ? (
          <a href={next.link.startsWith("http") ? next.link : `https://${next.link}`} target="_blank" rel="noreferrer" className="lux-join flex-1">
            {tr("انضم للاجتماع")}
          </a>
        ) : (
          <Link to={next.fromBooking ? "/meeting-minutes?tab=appointments" : "/calendar"} className="lux-join flex-1">
            {tr("تفاصيل الاجتماع")}
          </Link>
        )}
        <button
          type="button"
          className="v3-bd flex-1"
          onClick={() => openAgent(tr("جهّز لنا ملخص الأسبوع لاجتماع «{0}»: اللي خلّصناه، والمتأخر، والأسئلة اللي نبي نسألها المشرف/ة", next.title))}
        >
          <AgentWave size={15} />
          {tr("جهّز الملخص")}
        </button>
      </div>
    </section>
  );
}

// ───────────────────────────── ٣) هالأسبوع ─────────────────────────────

const TYPE_LABEL: Record<CalendarEventType, string> = {
  meeting: tr("اجتماع"),
  review: tr("مراجعة"),
  fieldwork: tr("ميدان"),
  deadline: tr("موعد نهائي"),
};

export function WeekLuxCard({ today, now, style }: { today: string; now: Date; style?: CSSProperties }) {
  const { next, events } = useUpcoming(now);
  const weekEnd = new Date(Date.parse(`${today}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
  const items = events
    .filter((e) => e.date >= today && e.date <= weekEnd && `e-${e.id}` !== next?.id)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const days = [...new Set(items.map((e) => e.date))];

  return (
    <section className="lux-week v3-rise" style={style} aria-labelledby="lux-week-title">
      <div className="mb-1.5 flex items-center justify-between">
        <div>
          <div className="lux-eye">{tr("التقويم")}</div>
          <h2 id="lux-week-title" className="lux-k2 m-0 !text-[26px]">
            {tr("هالأسبوع")}
          </h2>
        </div>
        <span className="v3-st todo !text-[var(--ws-c-text)]">
          {items.length === 1 ? tr("موعد واحد") : items.length === 2 ? tr("موعدين") : items.length <= 10 ? tr("{0} مواعيد", num(items.length)) : tr("{0} موعد", num(items.length))}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="v3-mut m-0 py-6 text-[15px]">{tr("أسبوعكم فاضي من المواعيد. أضيفوا اجتماع أو موعد تسليم من التقويم.")}</p>
      ) : (
        <div className="lux-tl">
          {days.map((day) => {
            const list = items.filter((e) => e.date === day);
            const hasDl = list.some((e) => e.type === "deadline");
            const d = new Date(`${day}T12:00:00`);
            const label = day === today ? tr("اليوم") : `${isEn ? d.toLocaleDateString("en", { weekday: "long" }) : weekdayAr(d)} ${num(d.getDate())}`;
            return (
              <div key={day}>
                <div className="pb-0.5 pt-2.5 text-xs font-extrabold" style={{ color: day === today ? "#FF9A3C" : hasDl ? "#FF8A7A" : "var(--ws-c-muted)" }}>
                  {label}
                </div>
                {list.map((e) => {
                  const dl = e.type === "deadline";
                  return (
                    <div key={e.id} className={clsx("lux-ev", day === today && !dl && "today", dl && "dl")}>
                      <span className="lux-tm" dir="ltr" style={dl ? { color: "#FF8A7A", background: "rgba(255,138,122,.1)" } : undefined}>
                        {hhmm(e.time) || "—"}
                      </span>
                      <div className="lux-card">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-bold" dir="auto">
                            {e.title}
                          </div>
                          <div className="v3-mut truncate text-xs" dir="auto">
                            {[TYPE_LABEL[e.type] ?? "", e.location && !isUrl(e.location) ? e.location : ""].filter(Boolean).join(" · ") || formatDateShort(e.date)}
                          </div>
                        </div>
                        {dl && <Flag size={15} className="shrink-0 text-[#FF8A7A]" aria-label={tr("موعد نهائي")} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
