import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useMeetingMinutes } from "./useMeetingMinutes";
import { useMeetings } from "./useMeetings";
import { useResearchStages } from "./useResearchStages";
import { useTasksData } from "./useTasksData";
import { useTeamRoster } from "./useTeamRoster";
import { driveErrorMessage, getDriveStatus, peekDriveStatus, uploadMinutesToDrive, type DriveStatus } from "../lib/driveTeam";
import { buildMeetingMinutesDoc } from "../lib/meetingMinutesExport";
import { toISODate } from "../lib/date";
import { buildReadiness, supervisorLink } from "../lib/meetings";
import { getCurrentStage } from "../lib/progress";
import { notifySupervisor } from "../lib/supervisorNotify";
import { driveNotice } from "../lib/driveNotice";
import type { MeetingMinutesRow } from "../data/types";
import { tr } from "../lib/i18n";
import { publicOrigin } from "../lib/publicUrl";

type DocInput = Pick<MeetingMinutesRow, "meetingDate" | "agenda" | "attendees" | "discussion" | "decisions" | "actionItems">;
export interface MinutesFormPayload {
  meetingDate: string;
  agenda: string;
  attendeeIds: string[];
  discussion: string;
  decisions: string;
  actions: { text: string; assigneeId: string; dueDate: string }[];
  sendToSupervisor: boolean;
}
export interface JustSaved {
  id: string;
  date: string;
  sent: boolean;
}

const minutesFileName = (date: string, style: "dark" | "official" = "dark") => tr("محضر اجتماع - {0}{1}.docx", date, style === "dark" ? " — Wesync" : "");

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** كل منطق المحاضر (الحفظ، التصدير، الرفع لدرايف، الإرسال للاعتماد) بمكان واحد — تستخدمه صفحة الاجتماعات وصفحة «محضر جديد» بدون أي تغيير بالسلوك */
export function useMinutesActions() {
  const { currentUser, team } = useAuth();
  const { showToast } = useToast();
  const { roster } = useTeamRoster();
  const { minutes, loading, addMinutes, deleteMinutes, reload } = useMeetingMinutes();
  const meetings = useMeetings();
  const { tasks } = useTasksData();
  const { stages } = useResearchStages();
  const location = useLocation();

  // آخر حالة معروفة تظهر فورًا، والطلب الحقيقي يحدّثها بالخلفية
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(() => peekDriveStatus(currentUser?.id));
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<JustSaved | null>(() => (location.state as { justSaved?: JustSaved } | null)?.justSaved ?? null);

  const supervisorUrl = team?.shareToken ? supervisorLink(publicOrigin(), team.shareToken) : null;
  const memberName = useCallback((id: string | null | undefined) => roster.find((m) => m.id === id)?.name ?? "", [roster]);

  // بعد ربط/فك/مشاركة: نطلب الحالة من جديد بدل النتيجة المشتركة
  const refreshDrive = useCallback(() => {
    getDriveStatus({ fresh: true }).then(setDriveStatus);
  }, []);
  useEffect(() => {
    getDriveStatus().then(setDriveStatus);
  }, []);

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
          const nid = driveNotice.start();
          const r = await uploadMinutesToDrive(blob, minutesFileName(input.meetingDate), minutesId);
          await reload();
          if (r.error) driveNotice.fail(nid, driveErrorMessage(r.error));
          else driveNotice.done(nid, r.data?.driveViewLink);
        }
      } catch {
        // السجل محفوظ بالموقع بأي حال — التنزيل يقدرون يعيدونه من القائمة
      }
    })();
  };

  /** يرجّع رسالة خطأ لو فشل، أو معلومات الحفظ لو نجح */
  const handleSubmit = async (p: MinutesFormPayload): Promise<{ error: string | null; saved?: JustSaved }> => {
    if (!currentUser) return { error: tr("سجّلوا دخولكم أول.") };
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
    if (error || !row) return { error: error === "no research project" ? tr("ما لقينا مشروع بحث مربوط بحسابكم — تأكدوا إنكم داخل فريق.") : tr("تعذّر حفظ المحضر — حاولوا مرة ثانية.") };

    let tasksCreated = 0;
    if (p.actions.length > 0) {
      const r = await meetings.createActions(row.id, p.actions);
      tasksCreated = r.created;
      if (r.error) showToast({ title: tr("انحفظ المحضر، لكن البنود ما تحولت لمهام"), desc: r.error, icon: X, tone: "rose" });
    }
    let sent = false;
    if (p.sendToSupervisor) {
      const r = await meetings.requestApproval(row.id);
      sent = !r.error;
      if (sent) void notifySupervisor("minutes", row.id);
    }

    const saved = { id: row.id, date: p.meetingDate, sent };
    setJustSaved(saved);
    showToast({
      title: tr("تم حفظ المحضر"),
      desc: [tasksCreated > 0 ? `${tasksCreated} ${tasksCreated === 1 ? tr("بند صار مهمة") : tr("بنود صارت مهام")}` : "", sent ? tr("وانرسل للمشرف/ة للاعتماد") : "", tr("ونزّلنا لكم Word.")].filter(Boolean).join(tr("، ")),
      icon: Check,
      tone: "brand",
    });
    exportInBackground(row.id, { meetingDate: p.meetingDate, agenda: p.agenda.trim(), attendees: attendeeNames, discussion: p.discussion, decisions: p.decisions, actionItems: actionsText });
    return { error: null, saved };
  };

  const handleDownload = async (m: MeetingMinutesRow, style: "dark" | "official") => {
    try {
      saveBlob(await buildMeetingMinutesDoc(m, style), minutesFileName(m.meetingDate, style));
    } catch {
      showToast({ title: tr("ما قدرنا نجهّز الملف"), desc: tr("حاولوا مرة ثانية."), icon: X, tone: "rose" });
    }
  };

  const handleUploadDrive = async (m: MeetingMinutesRow) => {
    setUploadingId(m.id);
    const nid = driveNotice.start();
    try {
      const blob = await buildMeetingMinutesDoc(m);
      const r = await uploadMinutesToDrive(blob, minutesFileName(m.meetingDate), m.id);
      await reload();
      if (r.error) driveNotice.fail(nid, driveErrorMessage(r.error));
      else driveNotice.done(nid, r.data?.driveViewLink);
    } catch {
      driveNotice.fail(nid, driveErrorMessage(undefined));
    }
    setUploadingId(null);
  };

  const handleSendApproval = async (m: MeetingMinutesRow) => {
    const r = await meetings.requestApproval(m.id);
    if (r.error) {
      showToast({ title: tr("ما انرسل للاعتماد"), desc: r.error, icon: X, tone: "rose" });
      return;
    }
    const n = await notifySupervisor("minutes", m.id);
    showToast({ title: tr("انرسل للاعتماد"), desc: n.sent ? tr("وصل المشرف/ة إيميل.") : tr("اضغطوا «ذكّروها بواتساب» لإرسال الرابط لها."), icon: Check, tone: "brand" });
  };

  return {
    roster, minutes, loading, deleteMinutes, meetings, tasks, memberName, supervisorUrl, today,
    driveStatus, refreshDrive, uploadingId, justSaved, setJustSaved, readiness, nextBooking,
    handleSubmit, handleDownload, handleUploadDrive, handleSendApproval,
  };
}
