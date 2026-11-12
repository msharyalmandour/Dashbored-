import { MeetLiveStrip } from "../components/meet/MeetLive";
import { Award, CalendarPlus, CircleHelp, FileText, Folder, Plus, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { Check, HardDrive, MessageCircle, X } from "lucide-react";
import DriveCard from "../components/DriveCard";
import Dialog from "../components/ui/Dialog";
import { LuxHead, Segmented as LuxSeg } from "../components/lux/Lux";
import { glassCard } from "../components/ui/researchUi";
import AppointmentsTab from "../components/meetings/AppointmentsTab";
import DecisionsTab from "../components/meetings/DecisionsTab";
import MinutesList from "../components/meetings/MinutesList";
import ReadinessCard from "../components/meetings/ReadinessCard";
import SupervisorSetupCard from "../components/meetings/SupervisorSetupCard";
import { useResearchProject } from "../hooks/useResearchProject";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useMinutesActions } from "../hooks/useMinutesActions";
import { getMyEmailStatus, type EmailStatus } from "../lib/supervisorEmail";
import { driveReturnMessage } from "../lib/driveTeam";
import { formatDateFull, formatDateShort, formatWeekday } from "../lib/date";
import { approvalRequestMessage, effectiveApproval, whatsappUrl } from "../lib/meetings";
import { tr, trx } from "../lib/i18n";
import { loadDraft } from "../lib/minutesLive";

type Tab = "minutes" | "decisions" | "appointments";
type Dlg = "meeting" | "supervisor" | "drive" | null;

const TABS: { id: Tab; label: string }[] = [
  { id: "minutes", label: tr("المحاضر") },
  { id: "decisions", label: tr("قرارات للمشرف/ة") },
  { id: "appointments", label: tr("المواعيد") },
];

const SENT_KEY = "wesync.supervisorInviteSent";

/** «باقي 4 أيام و19 ساعة» حتى الموعد (بتوقيت الجهاز) */
function countdown(date: string, time: string): { big: string; small: string; label: string } | null {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const ms = new Date(y, mo - 1, d, h || 0, m || 0).getTime() - Date.now();
  if (ms <= 0) return { big: "0", small: tr("الحين"), label: tr("الحين") };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return { big: String(days), small: tr("أيام و {0} ساعة", hours), label: tr("{0} أيام و {1} ساعة", days, hours) };
  return { big: String(hours), small: tr("ساعة"), label: tr("{0} ساعة", hours) };
}

/** ملف .ics للموعد (يفتح بتقويم الجوال أو قوقل) */
function downloadIcs(date: string, time: string, minutes: number, who: string) {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const start = new Date(y, mo - 1, d, h || 0, m || 0);
  const end = new Date(start.getTime() + (minutes || 30) * 60000);
  const z = (t: Date) => t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wesync//AR", "BEGIN:VEVENT", `UID:${z(start)}@wesyncapp.com`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${who ? tr("اجتماع مع {0}", who) : tr("اجتماع المشرف/ة")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const el = Object.assign(document.createElement("a"), { href: url, download: "wesync-meeting.ics" });
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function MeetingMinutes() {
  const { currentUser, isLeader, canWrite, team } = useAuth();
  const { project, updateProject } = useResearchProject();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const a = useMinutesActions();
  const liveOn = !!(team && loadDraft(team.id)?.startedAt);
  const { meetings, driveStatus, refreshDrive, supervisorUrl, today, nextBooking, justSaved, setJustSaved } = a;

  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = (["minutes", "decisions", "appointments"] as const).find((t) => t === searchParams.get("tab")) ?? "minutes";
  const [dlg, setDlg] = useState<Dlg>(null);
  const [email, setEmail] = useState<EmailStatus | null>(null);

  useEffect(() => {
    let alive = true;
    getMyEmailStatus().then((s) => alive && setEmail(s));
    return () => {
      alive = false;
    };
  }, [dlg]);

  // رجعة من شاشة موافقة Google (?drive=connected | error)
  useEffect(() => {
    const result = searchParams.get("drive");
    if (!result) return;
    const reason = searchParams.get("reason");
    showToast(
      result === "connected"
        ? { title: tr("انربط درايف الفريق"), desc: tr("أنشأنا مجلد Wesync وشاركناه مع الأعضاء."), icon: Check, tone: "brand" }
        : { title: tr("ما انربط الدرايف"), desc: driveReturnMessage(reason), icon: HardDrive, tone: "rose" },
    );
    const next = new URLSearchParams(searchParams);
    next.delete("drive");
    next.delete("reason");
    setSearchParams(next, { replace: true });
    refreshDrive();
    // لو هذي نافذة قوقل الجانبية: الصفحة الأصلية تتحدّث لحالها، فنسكّرها بعد ما يشوف المستخدم النتيجة
    if (window.opener && !window.opener.closed) setTimeout(() => window.close(), 2500);
  }, [searchParams, setSearchParams, showToast, refreshDrive]);

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (t === "minutes") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  // خطوات تجهيز المشرف/ة (نفس حساب بطاقة التجهيز بالنافذة)
  const hasAvailability = !!meetings.availability?.windows?.length;
  const emailActive = email?.state === "active";
  const emailPending = email?.state === "pending";
  let sentFlag = false;
  try {
    sentFlag = localStorage.getItem(SENT_KEY) === "1";
  } catch {
    // بدون تخزين: نحسبها غير مرسلة
  }
  const nameDone = (project?.supervisorName ?? "").trim().length > 0;
  const linkDone = sentFlag || emailActive || emailPending || hasAvailability;
  const setupDone = [nameDone, linkDone, emailActive, hasAvailability].filter(Boolean).length;

  const openDecisions = meetings.decisions.filter((d) => d.status === "open").length;
  const upcomingBookings = meetings.bookings.filter((b) => (b.status === "pending" || b.status === "confirmed") && b.date >= today).length;
  const badge = (t: Tab) => (t === "decisions" ? openDecisions : t === "appointments" ? upcomingBookings : 0);

  const driveValue = !driveStatus ? "…" : driveStatus.connected ? tr("مربوط") : driveStatus.configured ? tr("غير مربوط") : driveStatus.unreachable ? tr("ما قدرنا نتأكد") : tr("غير مفعّل بعد");
  const supName = (project?.supervisorName ?? "").trim();
  const answered = meetings.decisions.filter((d) => d.status === "answered").length;
  const recentDecisions = meetings.decisions.filter((d) => d.status !== "cancelled").slice(0, 4);
  const approvedCount = a.minutes.filter((m) => effectiveApproval(meetings.approvals.find((x) => x.minutesId === m.id)) === "approved").length;
  const left = nextBooking ? countdown(nextBooking.date, nextBooking.time) : null;

  return (
    <div className="space-y-6">
      <LuxHead kicker={tr("المشرف/ة")} title={tr("الاجتماعات والمشرف/ة")} sub={tr("محاضر تتحول لمهام، وقرارات بضغطة، ومواعيد ما تفوتكم")}>
        <LuxSeg label={tr("الاجتماعات")} items={TABS.map((t) => ({ id: t.id, label: t.label, count: badge(t.id) || undefined }))} value={tab} onChange={setTab} />
      </LuxHead>

      {tab === "minutes" && (
        <>
          {/* ── الاجتماع الجاي (MeetLux) ── */}
          <section className="mt-hero lx-in flex flex-col gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-[#FFB444]">{liveOn ? tr("اجتماع شغّال الحين") : tr("الاجتماع الجاي")}</div>
              <h2 className="lx-h1 !mt-1 !text-[40px] md:!text-[52px]" dir="auto">
                {nextBooking ? (supName ? tr("{0} مع {1}", formatWeekday(nextBooking.date), supName) : formatWeekday(nextBooking.date)) : tr("ما فيه موعد محجوز")}
              </h2>
              <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 text-[15px] text-[#E9D3B8]">
                {nextBooking ? (
                  <>
                    <span>{formatDateShort(nextBooking.date)}</span>
                    <span aria-hidden>·</span>
                    <span dir="ltr">{nextBooking.time}</span>
                    {nextBooking.note && (
                      <>
                        <span aria-hidden>·</span>
                        <span dir="auto">{nextBooking.note}</span>
                      </>
                    )}
                  </>
                ) : (
                  tr("احجزوا من أوقات المشرف/ة، ويوصلكم تذكير قبله.")
                )}
              </p>
              {canWrite && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link to="/meeting-minutes/live" className="lx-go">
                    <Plus size={18} aria-hidden />
                    {liveOn ? tr("كمّلوا الاجتماع") : tr("ابدأوا محضر جديد")}
                  </Link>
                  {nextBooking ? (
                    <button type="button" className="lx-ghost" onClick={() => downloadIcs(nextBooking.date, nextBooking.time, nextBooking.durationMin, supName)}>
                      <CalendarPlus size={17} aria-hidden />
                      {tr("أضيفوه للتقويم")}
                    </button>
                  ) : (
                    <button type="button" className="lx-ghost" onClick={() => setTab("appointments")}>
                      <CalendarPlus size={17} aria-hidden />
                      {tr("احجزوا موعد")}
                    </button>
                  )}
                  <Link to="/meet" className="lx-ghost">
                    <Video size={17} aria-hidden />
                    {tr("اجتماع فيديو")}
                  </Link>
                  <Link data-learn="new-minutes" to="/meeting-minutes/new" className="lx-fix !min-h-[44px] px-1">
                    {tr("أو اكتبوا محضر اجتماع خلص")}
                  </Link>
                </div>
              )}
            </div>
            <div className="mt-count self-start md:self-center" role="timer" aria-label={left ? tr("باقي {0}", left.label) : tr("ما فيه موعد")}>
              <span className="text-[13px] font-bold text-[#FFB444]">{tr("باقي")}</span>
              <b dir="ltr">{left ? left.big : "—"}</b>
              <span className="mt-1 text-[13px] text-[#E9D3B8]">{left ? left.small : tr("بدون موعد")}</span>
            </div>
          </section>

          <MeetLiveStrip />

          {/* ── الجاهزية: جدول الأعمال + تجهيز المشرف/ة + أسئلة للدكتورة ── */}
          <section className="lx-card lx-in flex flex-col gap-5 py-5 md:flex-row md:gap-0" aria-label={tr("جاهزية الاجتماع")}>
            {[
              { title: tr("جدول الأعمال"), done: a.readiness.doneCount, total: a.readiness.totalCount, note: a.readiness.totalCount === 0 ? tr("ما فيه بنود سابقة") : a.readiness.doneCount >= a.readiness.totalCount ? tr("جاهز") : tr("كمّلوه"), go: () => setDlg("meeting") },
              { title: tr("تجهيز المشرف/ة"), done: setupDone, total: 4, note: setupDone === 4 ? tr("جاهزة") : 4 - setupDone === 1 ? tr("باقي خطوة وحدة") : tr("باقي {0} خطوات", 4 - setupDone), go: () => setDlg("supervisor") },
              { title: tr("أسئلة للدكتورة"), done: answered, total: answered + openDecisions, note: openDecisions ? tr("{0} تنتظر", openDecisions) : tr("جاهزة"), go: () => setTab("decisions") },
            ].map((p) => (
              <button key={p.title} type="button" className="mt-prog text-start" onClick={p.go}>
                <span className="flex items-center justify-between gap-3">
                  <b className="text-[16px] text-[#F2EBE3]">{p.title}</b>
                  <b className="text-[16px] text-[#FFC777]" dir="ltr">
                    {p.done}/{p.total}
                  </b>
                </span>
                <span className="mtl-bar block" aria-hidden>
                  <i style={{ width: `${p.total ? Math.round((Math.min(p.done, p.total) / p.total) * 100) : 0}%` }} />
                </span>
                <span className="text-[13px] font-bold text-[#FFC777]">{p.note}</span>
              </button>
            ))}
          </section>

          {justSaved && (
            <div className={clsx(glassCard, "relative p-4")}>
              <button onClick={() => setJustSaved(null)} aria-label={tr("إغلاق")} className="absolute end-3 top-3 text-[#B8ADA2] hover:text-[#F4F0EC]">
                <X size={16} />
              </button>
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <Check size={16} className="text-[#7fd6a0]" />{trx("انحفظ محضر {0}", formatDateFull(justSaved.date))}</p>
              <p className="mt-1 text-xs text-[#B8ADA2]">
                {justSaved.sent ? tr("وانرسل للاعتماد. لو المشرف/ة ما فعّلت الإيميل، أرسلوا لها الرابط بواتساب:") : tr("ما أُرسل للاعتماد. تقدرون ترسلونه من القائمة تحت.")}
              </p>
              {justSaved.sent && supervisorUrl && (
                <a
                  href={whatsappUrl(approvalRequestMessage(formatDateFull(justSaved.date), supervisorUrl))}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#FF8A24]/50 px-4 py-1.5 text-xs font-bold text-[#FFB444] hover:bg-[#FF6B00]/10"
                >
                  <MessageCircle size={14} />{tr("أرسلوا الرابط بواتساب")}</a>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)]">
            <section className="lx-card lx-in p-[18px] lg:order-2" aria-labelledby="mt-min-h">
              <div className="mb-2 flex items-center gap-2.5 px-1">
                <span className="lx-ic" aria-hidden>
                  <FileText size={17} />
                </span>
                <h2 id="mt-min-h" className="lx-h2 flex-1">
                  {tr("المحاضر")}
                </h2>
                <span className="text-[13px] text-[#ABA095]">{tr("{0} محاضر · {1} معتمدة", a.minutes.length, approvedCount)}</span>
              </div>
              <MinutesList
                minutes={a.minutes}
                loading={a.loading}
                actions={meetings.actions}
                approvals={meetings.approvals}
                tasks={a.tasks}
                memberName={a.memberName}
                canDelete={(m) => isLeader || m.createdById === currentUser?.id}
                onDelete={(id) => void a.deleteMinutes(id)}
                driveConnected={!!driveStatus?.connected}
                uploadingId={a.uploadingId}
                onUploadDrive={a.handleUploadDrive}
                onDownload={a.handleDownload}
                onSendApproval={a.handleSendApproval}
                supervisorUrl={supervisorUrl}
                highlightId={justSaved?.id}
              />
            </section>
            <div className="flex flex-col gap-[18px] lg:order-1">
              <section className="lx-card lx-in p-[18px]" aria-labelledby="mt-dec-h">
                <div className="mb-1 flex items-center gap-2.5">
                  <span className="lx-ic" aria-hidden>
                    <Award size={17} />
                  </span>
                  <h2 id="mt-dec-h" className="lx-h2 flex-1">
                    {tr("قرارات للمشرف/ة")}
                  </h2>
                </div>
                {recentDecisions.length === 0 ? (
                  <p className="m-0 mt-2 text-[14px] text-[#ABA095]">{tr("ما فيه قرارات للحين. اسألوا المشرف/ة بضغطة من تبويب القرارات.")}</p>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {recentDecisions.map((d) => (
                      <li key={d.id} className="mt-dec">
                        <span className={clsx("mt-dec-ic", d.status === "answered" ? "done" : "wait")} aria-hidden>
                          {d.status === "answered" ? <Check size={14} strokeWidth={3} /> : <CircleHelp size={15} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#F2EBE3]" dir="auto" title={d.question}>
                          {d.status === "answered" && d.chosenIndex !== null && d.options[d.chosenIndex] ? d.options[d.chosenIndex] : d.question}
                        </span>
                        <span className={clsx("text-[12px] font-extrabold", d.status === "answered" ? "text-[#FFC777]" : "text-[#ABA095]")}>{d.status === "answered" ? tr("معتمد") : tr("ينتظر")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <button type="button" className="lx-card lx-in flex items-center gap-3 p-[18px] text-start" onClick={() => setDlg("drive")}>
                <span className="lx-ic lg" aria-hidden>
                  <Folder size={18} />
                </span>
                <span className="min-w-0 flex-1 leading-[1.4]">
                  <b className="block text-[16px] text-[#F2EBE3]">{driveStatus?.connected ? tr("درايف الفريق مربوط") : tr("درايف الفريق: {0}", driveValue)}</b>
                  <span className="block text-[13px] text-[#ABA095]">{driveStatus?.connected ? tr("كل محضر معتمد PDF ينحفظ لحاله") : tr("اربطوه عشان المحاضر تنحفظ لحالها")}</span>
                </span>
                <span className="lx-fix">{driveStatus?.connected ? tr("افتحوه") : tr("اربطوه")}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "decisions" && (
        <DecisionsTab decisions={meetings.decisions} availability={meetings.availability} supervisorUrl={supervisorUrl} canWrite={canWrite} onAsk={meetings.askDecision} onCancel={meetings.cancelDecision} />
      )}

      {tab === "appointments" && (
        <AppointmentsTab availability={meetings.availability} bookings={meetings.bookings} supervisorUrl={supervisorUrl} canWrite={canWrite} onBook={meetings.bookSlot} onCancel={meetings.cancelBooking} />
      )}

      <Dialog open={dlg === "meeting"} onClose={() => setDlg(null)} title={tr("الاجتماع القادم")}>
        <div className="space-y-4">
          <p className="text-sm">
            {nextBooking ? (
              <>
                <b>{formatDateFull(nextBooking.date)}</b> · {nextBooking.time}
              </>
            ) : (
              <span className="text-[#B8ADA2]">{tr("ما فيه اجتماع محجوز. احجزوا موعد من تبويب «المواعيد».")}</span>
            )}
          </p>
          {!nextBooking && (
            <button
              type="button"
              onClick={() => {
                setDlg(null);
                setTab("appointments");
              }}
              className="rounded-full border border-[#FF8A24]/50 px-4 py-1.5 text-sm font-bold text-[#FFB444] hover:bg-[#FF6B00]/10"
            >{tr("افتحوا المواعيد")}</button>
          )}
          {canWrite && (
            <ReadinessCard
              readiness={a.readiness}
              nextBooking={nextBooking}
              onUseAgenda={(text) => {
                setDlg(null);
                navigate("/meeting-minutes/new", { state: { agendaSeed: text } });
              }}
            />
          )}
        </div>
      </Dialog>

      <Dialog open={dlg === "supervisor"} onClose={() => setDlg(null)} title={tr("تجهيز المشرف/ة")}>
        <SupervisorSetupCard
          supervisorName={project?.supervisorName ?? ""}
          onSaveName={(supervisorName) => updateProject({ supervisorName })}
          supervisorUrl={supervisorUrl}
          projectTitle={project?.title ?? ""}
          hasAvailability={hasAvailability}
          canWrite={canWrite}
        />
      </Dialog>

      <Dialog open={dlg === "drive"} onClose={() => setDlg(null)} title={tr("درايف الفريق")}>
        {driveStatus && (driveStatus.configured || driveStatus.unreachable) ? (
          <DriveCard status={driveStatus} onChanged={refreshDrive} />
        ) : (
          <p className="text-sm leading-relaxed text-[#B8ADA2]">{tr("ربط الدرايف مو مفعّل على الخادم بعد.")}</p>
        )}
      </Dialog>
    </div>
  );
}
