import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { Check, HardDrive, MessageCircle, X } from "lucide-react";
import DriveCard from "../components/DriveCard";
import AgentOrb from "../components/ui/AgentOrb";
import Dialog from "../components/ui/Dialog";
import { Segmented } from "../components/ui/page";
import { ResearchHeader, glassCard, gradientPill } from "../components/ui/researchUi";
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
import { formatDateFull, formatDateShort } from "../lib/date";
import { approvalRequestMessage, whatsappUrl } from "../lib/meetings";

type Tab = "minutes" | "decisions" | "appointments";
type Dlg = "meeting" | "supervisor" | "drive" | null;

const TABS: { id: Tab; label: string }[] = [
  { id: "minutes", label: "المحاضر" },
  { id: "decisions", label: "قرارات للمشرف/ة" },
  { id: "appointments", label: "المواعيد" },
];

const SENT_KEY = "wesync.supervisorInviteSent";
const arDigit = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

/** بطاقة صغيرة بالشريط: نقطة لون + عنوان + قيمة + رابط واحد يفتح التفاصيل بنافذة */
function MiniCard({ dot, title, value, link, onOpen }: { dot: string; title: string; value: string; link: string; onOpen: () => void }) {
  return (
    <div className={clsx(glassCard, "flex flex-col gap-1 p-4")}>
      <p className="flex items-center gap-2 text-xs text-[#B8ADA2]">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
        {title}
      </p>
      <p className="text-base font-bold">{value}</p>
      <button type="button" onClick={onOpen} className="mt-auto text-start text-xs font-semibold text-[#FFB444] hover:underline">
        {link}
      </button>
    </div>
  );
}

export default function MeetingMinutes() {
  const { currentUser, isLeader, canWrite } = useAuth();
  const { project, updateProject } = useResearchProject();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const a = useMinutesActions();
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
        ? { title: "انربط درايف الفريق", desc: "أنشأنا مجلد Wesync وشاركناه مع الأعضاء.", icon: Check, tone: "brand" }
        : { title: "ما انربط الدرايف", desc: driveReturnMessage(reason), icon: HardDrive, tone: "rose" },
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

  const driveValue = !driveStatus ? "…" : driveStatus.connected ? "مربوط" : driveStatus.configured ? "غير مربوط" : driveStatus.unreachable ? "ما قدرنا نتأكد" : "غير مفعّل بعد";
  const driveDot = driveStatus?.connected ? "#7fd6a0" : "#FFB444";

  return (
    <div className="space-y-6">
      <ResearchHeader
        title="الاجتماعات والمشرف/ة"
        subtitle="محاضر منظّمة تتحول لمهام، وقرارات بضغطة، ومواعيد ما تفوتكم."
        action={<Segmented items={TABS.map((t) => ({ id: t.id, label: t.label, badge: badge(t.id) }))} value={tab} onChange={setTab} />}
      />

      {tab === "minutes" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniCard
              dot="#FF6B00"
              title="الاجتماع القادم"
              value={nextBooking ? `${formatDateShort(nextBooking.date)} · ${nextBooking.time}` : "ما فيه موعد"}
              link={nextBooking ? "التفاصيل وجاهزية الاجتماع" : "جاهزية الاجتماع"}
              onOpen={() => setDlg("meeting")}
            />
            <MiniCard dot="#FFB444" title="تجهيز المشرف/ة" value={`${arDigit(setupDone)} من ٤`} link={setupDone === 4 ? "جاهزة — التفاصيل" : "كمّلوا التجهيز"} onOpen={() => setDlg("supervisor")} />
            <MiniCard dot={driveDot} title="درايف الفريق" value={driveValue} link="التفاصيل" onOpen={() => setDlg("drive")} />
          </div>

          {canWrite && (
            <section className="relative isolate overflow-hidden rounded-[32px] border border-[rgba(255,107,0,.3)] bg-[radial-gradient(ellipse_at_50%_0%,#2E0E04_0,#140804_60%,#0A0605_100%)] px-6 py-10 text-center text-[#F4F0EC]">
              <div aria-hidden className="pointer-events-none absolute left-1/2 -top-[150px] -z-10 h-[300px] w-[520px] -translate-x-1/2 rounded-full bg-[#E8400A] opacity-40 blur-[100px]" />
              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                <AgentOrb size={56} />
                <h2 className="font-kufi text-2xl font-extrabold md:text-3xl">خلصتوا اجتماع؟</h2>
                <p className="text-sm text-[#B8ADA2]">سجّلوا المحضر وبنوده تتحول لمهام بمسؤول وموعد، ويوصل للمشرف/ة.</p>
                <Link to="/meeting-minutes/new" className={clsx(gradientPill, "mt-1 !px-7 !py-3")}>
                  + محضر جديد
                </Link>
              </div>
            </section>
          )}

          {justSaved && (
            <div className={clsx(glassCard, "relative p-4")}>
              <button onClick={() => setJustSaved(null)} aria-label="إغلاق" className="absolute end-3 top-3 text-[#B8ADA2] hover:text-[#F4F0EC]">
                <X size={16} />
              </button>
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <Check size={16} className="text-[#7fd6a0]" />
                انحفظ محضر {formatDateFull(justSaved.date)}
              </p>
              <p className="mt-1 text-xs text-[#B8ADA2]">
                {justSaved.sent ? "وانرسل للاعتماد. لو المشرف/ة ما فعّلت الإيميل، أرسلوا لها الرابط بواتساب:" : "ما أُرسل للاعتماد. تقدرون ترسلونه من القائمة تحت."}
              </p>
              {justSaved.sent && supervisorUrl && (
                <a
                  href={whatsappUrl(approvalRequestMessage(formatDateFull(justSaved.date), supervisorUrl))}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#FF8A24]/50 px-4 py-1.5 text-xs font-bold text-[#FFB444] hover:bg-[#FF6B00]/10"
                >
                  <MessageCircle size={14} />
                  أرسلوا الرابط بواتساب
                </a>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="font-kufi text-lg font-bold">المحاضر السابقة</h2>
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
          </div>
        </>
      )}

      {tab === "decisions" && (
        <DecisionsTab decisions={meetings.decisions} availability={meetings.availability} supervisorUrl={supervisorUrl} canWrite={canWrite} onAsk={meetings.askDecision} onCancel={meetings.cancelDecision} />
      )}

      {tab === "appointments" && (
        <AppointmentsTab availability={meetings.availability} bookings={meetings.bookings} supervisorUrl={supervisorUrl} canWrite={canWrite} onBook={meetings.bookSlot} onCancel={meetings.cancelBooking} />
      )}

      <Dialog open={dlg === "meeting"} onClose={() => setDlg(null)} title="الاجتماع القادم">
        <div className="space-y-4">
          <p className="text-sm">
            {nextBooking ? (
              <>
                <b>{formatDateFull(nextBooking.date)}</b> · {nextBooking.time}
              </>
            ) : (
              <span className="text-[#B8ADA2]">ما فيه اجتماع محجوز. احجزوا موعد من تبويب «المواعيد».</span>
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
            >
              افتحوا المواعيد
            </button>
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

      <Dialog open={dlg === "supervisor"} onClose={() => setDlg(null)} title="تجهيز المشرف/ة">
        <SupervisorSetupCard
          supervisorName={project?.supervisorName ?? ""}
          onSaveName={(supervisorName) => updateProject({ supervisorName })}
          supervisorUrl={supervisorUrl}
          projectTitle={project?.title ?? ""}
          hasAvailability={hasAvailability}
          canWrite={canWrite}
        />
      </Dialog>

      <Dialog open={dlg === "drive"} onClose={() => setDlg(null)} title="درايف الفريق">
        {driveStatus && driveStatus.configured ? (
          <DriveCard status={driveStatus} onChanged={refreshDrive} />
        ) : (
          <p className="text-sm leading-relaxed text-[#B8ADA2]">
            {driveStatus?.unreachable ? "ما قدرنا نوصل لخدمة الدرايف الحين. جرّبوا بعد شوي." : "ربط الدرايف مو مفعّل على الخادم بعد."}
          </p>
        )}
      </Dialog>
    </div>
  );
}
