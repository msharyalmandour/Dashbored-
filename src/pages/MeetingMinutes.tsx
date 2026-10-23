import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { CalendarClock, Check, CloudUpload, HardDrive, HelpCircle, MessageCircle, NotebookPen, X } from "lucide-react";
import DriveCard from "../components/DriveCard";
import Card from "../components/ui/Card";
import { HighlightCard, PageColumns, PageHeader, Panel, Segmented, ghostBtn } from "../components/ui/page";
import AppointmentsTab from "../components/meetings/AppointmentsTab";
import DecisionsTab from "../components/meetings/DecisionsTab";
import MinutesForm, { type MinutesFormPayload } from "../components/meetings/MinutesForm";
import MinutesList from "../components/meetings/MinutesList";
import ReadinessCard from "../components/meetings/ReadinessCard";
import SupervisorSetupCard from "../components/meetings/SupervisorSetupCard";
import { useResearchProject } from "../hooks/useResearchProject";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useMeetingMinutes } from "../hooks/useMeetingMinutes";
import { useMeetings } from "../hooks/useMeetings";
import { useResearchStages } from "../hooks/useResearchStages";
import { useTasksData } from "../hooks/useTasksData";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { driveErrorMessage, getDriveStatus, uploadMinutesToDrive, type DriveStatus } from "../lib/driveTeam";
import { buildMeetingMinutesDoc } from "../lib/meetingMinutesExport";
import { formatDateFull, toISODate } from "../lib/date";
import { approvalRequestMessage, buildReadiness, supervisorLink, whatsappUrl } from "../lib/meetings";
import { getCurrentStage } from "../lib/progress";
import { notifySupervisor } from "../lib/supervisorNotify";
import type { MeetingMinutesRow } from "../data/types";

type Tab = "minutes" | "decisions" | "appointments";
type DocInput = Pick<MeetingMinutesRow, "meetingDate" | "agenda" | "attendees" | "discussion" | "decisions" | "actionItems">;

const minutesFileName = (date: string, style: "dark" | "official" = "dark") => `محضر اجتماع - ${date}${style === "dark" ? " — Wesync" : ""}.docx`;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const TABS: { id: Tab; label: string; icon: typeof NotebookPen }[] = [
  { id: "minutes", label: "المحاضر", icon: NotebookPen },
  { id: "decisions", label: "قرارات للمشرف/ة", icon: HelpCircle },
  { id: "appointments", label: "المواعيد", icon: CalendarClock },
];

export default function MeetingMinutes() {
  const { currentUser, isLeader, canWrite, team } = useAuth();
  const { project, updateProject } = useResearchProject();
  const { showToast } = useToast();
  const { roster } = useTeamRoster();
  const { minutes, loading, addMinutes, deleteMinutes, reload } = useMeetingMinutes();
  const meetings = useMeetings();
  const { tasks } = useTasksData();
  const { stages } = useResearchStages();

  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = (["minutes", "decisions", "appointments"] as const).find((t) => t === searchParams.get("tab")) ?? "minutes";
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [agendaSeed, setAgendaSeed] = useState<{ text: string; n: number } | null>(null);
  const [justSaved, setJustSaved] = useState<{ id: string; date: string; sent: boolean } | null>(null);

  const supervisorUrl = team?.shareToken ? supervisorLink(window.location.origin, team.shareToken) : null;
  const memberName = useCallback((id: string | null | undefined) => roster.find((m) => m.id === id)?.name ?? "", [roster]);

  const refreshDrive = useCallback(() => {
    getDriveStatus().then(setDriveStatus);
  }, []);
  useEffect(() => {
    refreshDrive();
  }, [refreshDrive]);

  // رجعة من شاشة موافقة Google (?drive=connected | error)
  useEffect(() => {
    const result = searchParams.get("drive");
    if (!result) return;
    const reason = searchParams.get("reason");
    showToast(
      result === "connected"
        ? { title: "انربط درايف الفريق", desc: "أنشأنا مجلد Wesync وشاركناه مع الأعضاء.", icon: Check, tone: "brand" }
        : { title: "ما انربط الدرايف", desc: reason === "denied" ? "ما وافقتم على الصلاحية." : "صار خطأ أثناء الربط — جرّبوا مرة ثانية.", icon: HardDrive, tone: "rose" },
    );
    const next = new URLSearchParams(searchParams);
    next.delete("drive");
    next.delete("reason");
    setSearchParams(next, { replace: true });
    refreshDrive();
  }, [searchParams, setSearchParams, showToast, refreshDrive]);

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (t === "minutes") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  const today = toISODate(new Date());
  const lastMinutes = minutes[0];
  const readiness = useMemo(
    () =>
      buildReadiness({
        today,
        lastMeetingDate: lastMinutes?.meetingDate,
        lastActions: lastMinutes ? meetings.actions.filter((a) => a.minutesId === lastMinutes.id) : [],
        tasks,
        memberName,
        openDecisions: meetings.decisions.filter((d) => d.status === "open"),
        stageKey: getCurrentStage(stages)?.stageKey,
      }),
    [today, lastMinutes, meetings.actions, meetings.decisions, tasks, memberName, stages],
  );
  const nextBooking = meetings.bookings.find((b) => b.status === "confirmed" && b.date >= today);

  /** يبني Word مرة وحدة، وينزّله، ويرفعه لدرايف لو مربوط — كله بالخلفية بدون ما يعلّق الحفظ */
  const exportInBackground = (minutesId: string, input: DocInput) => {
    void (async () => {
      try {
        const blob = await buildMeetingMinutesDoc(input);
        saveBlob(blob, minutesFileName(input.meetingDate));
        if (driveStatus?.connected) {
          const r = await uploadMinutesToDrive(blob, minutesFileName(input.meetingDate), minutesId);
          await reload();
          showToast(
            r.error
              ? { title: "ما انرفع لدرايف", desc: driveErrorMessage(r.error), icon: CloudUpload, tone: "rose" }
              : { title: "انرفع لدرايف الفريق", desc: "المحضر الحين بمجلدكم المشترك.", icon: CloudUpload, tone: "brand" },
          );
        }
      } catch {
        // السجل محفوظ بالموقع بأي حال — التنزيل يقدرون يعيدونه من القائمة
      }
    })();
  };

  const handleSubmit = async (p: MinutesFormPayload): Promise<string | null> => {
    if (!currentUser) return "سجّلوا دخولكم أول.";
    const attendeeNames = roster.filter((m) => p.attendeeIds.includes(m.id)).map((m) => m.name);
    const actionsText = p.actions.map((a) => a.text).join("\n");
    const { row, error } = await addMinutes({
      meetingDate: p.meetingDate,
      agenda: p.agenda.trim(),
      attendees: attendeeNames,
      discussion: p.discussion,
      decisions: p.decisions,
      actionItems: actionsText,
      createdById: currentUser.id,
    });
    if (error || !row) return error === "no research project" ? "ما لقينا مشروع بحث مربوط بحسابكم — تأكدوا إنكم داخل فريق." : "تعذّر حفظ المحضر — حاولوا مرة ثانية.";

    let tasksCreated = 0;
    if (p.actions.length > 0) {
      const r = await meetings.createActions(row.id, p.actions);
      tasksCreated = r.created;
      if (r.error) showToast({ title: "انحفظ المحضر، لكن البنود ما تحولت لمهام", desc: r.error, icon: X, tone: "rose" });
    }
    let sent = false;
    if (p.sendToSupervisor) {
      const r = await meetings.requestApproval(row.id);
      sent = !r.error;
      if (sent) void notifySupervisor("minutes", row.id);
    }

    setJustSaved({ id: row.id, date: p.meetingDate, sent });
    showToast({
      title: "تم حفظ المحضر",
      desc: [tasksCreated > 0 ? `${tasksCreated} ${tasksCreated === 1 ? "بند صار مهمة" : "بنود صارت مهام"}` : "", sent ? "وانرسل للمشرف/ة للاعتماد" : "", "ونزّلنا لكم Word."].filter(Boolean).join("، "),
      icon: Check,
      tone: "brand",
    });
    exportInBackground(row.id, { meetingDate: p.meetingDate, agenda: p.agenda.trim(), attendees: attendeeNames, discussion: p.discussion, decisions: p.decisions, actionItems: actionsText });
    return null;
  };

  const handleDownload = async (m: MeetingMinutesRow, style: "dark" | "official") => {
    try {
      saveBlob(await buildMeetingMinutesDoc(m, style), minutesFileName(m.meetingDate, style));
    } catch {
      showToast({ title: "ما قدرنا نجهّز الملف", desc: "حاولوا مرة ثانية.", icon: X, tone: "rose" });
    }
  };

  const handleUploadDrive = async (m: MeetingMinutesRow) => {
    setUploadingId(m.id);
    let err: string | null = null;
    try {
      const blob = await buildMeetingMinutesDoc(m);
      const r = await uploadMinutesToDrive(blob, minutesFileName(m.meetingDate), m.id);
      await reload();
      err = r.error ? driveErrorMessage(r.error) : null;
    } catch {
      err = driveErrorMessage(undefined);
    }
    setUploadingId(null);
    showToast(err ? { title: "ما انرفع لدرايف", desc: err, icon: CloudUpload, tone: "rose" } : { title: "انرفع لدرايف", desc: "المحضر الحين بمجلد الفريق.", icon: Check, tone: "brand" });
  };

  const handleSendApproval = async (m: MeetingMinutesRow) => {
    const r = await meetings.requestApproval(m.id);
    if (r.error) {
      showToast({ title: "ما انرسل للاعتماد", desc: r.error, icon: X, tone: "rose" });
      return;
    }
    const n = await notifySupervisor("minutes", m.id);
    showToast({ title: "انرسل للاعتماد", desc: n.sent ? "وصل المشرف/ة إيميل." : "اضغطوا «ذكّروها بواتساب» لإرسال الرابط لها.", icon: Check, tone: "brand" });
  };

  const openDecisions = meetings.decisions.filter((d) => d.status === "open").length;
  const upcomingBookings = meetings.bookings.filter((b) => (b.status === "pending" || b.status === "confirmed") && b.date >= today).length;
  const badge = (t: Tab) => (t === "decisions" ? openDecisions : t === "appointments" ? upcomingBookings : 0);
  const driveOnTop = !!driveStatus?.configured && !driveStatus.connected;

  const minutesMain = (
    <>
      {driveOnTop && driveStatus && <DriveCard status={driveStatus} onChanged={refreshDrive} />}

      {canWrite && (
        <MinutesForm roster={roster.map((m) => ({ id: m.id, name: m.name }))} currentUserId={currentUser?.id ?? ""} agendaSeed={agendaSeed} onSubmit={handleSubmit} />
      )}

      {justSaved && (
        <Card tone="cream" className="relative !p-4">
          <button onClick={() => setJustSaved(null)} aria-label="إغلاق" className="absolute end-3 top-3 text-brand-950/40 hover:text-brand-700">
            <X size={16} />
          </button>
          <p className="flex items-center gap-2 text-sm font-extrabold text-brand-950">
            <Check size={16} className="text-emerald-500" />
            انحفظ محضر {formatDateFull(justSaved.date)}
          </p>
          <p className="mt-1 text-xs text-brand-950/60">
            {justSaved.sent ? "وانرسل للاعتماد. لو المشرف/ة ما فعّلت الإيميل، أرسلوا لها الرابط بواتساب:" : "ما أُرسل للاعتماد. تقدرون ترسلونه من القائمة تحت."}
          </p>
          {justSaved.sent && supervisorUrl && (
            <a href={whatsappUrl(approvalRequestMessage(formatDateFull(justSaved.date), supervisorUrl))} target="_blank" rel="noreferrer" className={clsx(ghostBtn, "mt-2.5")}>
              <MessageCircle size={14} />
              أرسلوا الرابط بواتساب
            </a>
          )}
        </Card>
      )}

      <Panel title="المحاضر السابقة">
        <MinutesList
          minutes={minutes}
          loading={loading}
          actions={meetings.actions}
          approvals={meetings.approvals}
          tasks={tasks}
          memberName={memberName}
          canDelete={(m) => isLeader || m.createdById === currentUser?.id}
          onDelete={(id) => void deleteMinutes(id)}
          driveConnected={!!driveStatus?.connected}
          uploadingId={uploadingId}
          onUploadDrive={handleUploadDrive}
          onDownload={handleDownload}
          onSendApproval={handleSendApproval}
          supervisorUrl={supervisorUrl}
          highlightId={justSaved?.id}
        />
      </Panel>

      {!driveOnTop && driveStatus && <DriveCard status={driveStatus} onChanged={refreshDrive} />}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="الفريق · الاجتماعات"
        title="الاجتماعات والمشرف/ة"
        subtitle="محاضر منظّمة تتحول لمهام، وقرارات بضغطة، ومواعيد ما تفوتكم."
        action={
          <Segmented
            items={TABS.map((t) => ({ id: t.id, label: t.label, badge: badge(t.id) }))}
            value={tab}
            onChange={setTab}
          />
        }
      />

      <SupervisorSetupCard
        supervisorName={project?.supervisorName ?? ""}
        onSaveName={(supervisorName) => updateProject({ supervisorName })}
        supervisorUrl={supervisorUrl}
        projectTitle={project?.title ?? ""}
        hasAvailability={!!meetings.availability?.windows?.length}
        canWrite={canWrite}
      />

      {tab === "minutes" && (
        <PageColumns
          main={<div className="space-y-6">{minutesMain}</div>}
          side={
            <>
              {nextBooking ? (
                <HighlightCard
                  kicker="الاجتماع القادم"
                  title="اجتماع مع المشرف/ة"
                  subtitle={`${formatDateFull(nextBooking.date)} · ${nextBooking.time}`}
                />
              ) : (
                <HighlightCard kicker="الاجتماع القادم" title="ما فيه اجتماع محجوز" subtitle="احجزوا موعد من تبويب «المواعيد»." />
              )}
              {canWrite && <ReadinessCard readiness={readiness} nextBooking={nextBooking} onUseAgenda={(text) => setAgendaSeed({ text, n: (agendaSeed?.n ?? 0) + 1 })} />}
            </>
          }
        />
      )}

      {tab === "decisions" && (
        <DecisionsTab decisions={meetings.decisions} availability={meetings.availability} supervisorUrl={supervisorUrl} canWrite={canWrite} onAsk={meetings.askDecision} onCancel={meetings.cancelDecision} />
      )}

      {tab === "appointments" && (
        <AppointmentsTab availability={meetings.availability} bookings={meetings.bookings} supervisorUrl={supervisorUrl} canWrite={canWrite} onBook={meetings.bookSlot} onCancel={meetings.cancelBooking} />
      )}
    </div>
  );
}
