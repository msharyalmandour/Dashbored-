import { Fragment, useState } from "react";
import { CheckCircle2, ChevronDown, CloudUpload, Download, ExternalLink, Loader2, MessageCircle, NotebookPen, Pencil, Send, Trash2, Circle } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import ThreeDotsMenu from "../ui/ThreeDotsMenu";
import ApprovalBadge from "./ApprovalBadge";
import { formatDateFull, formatDateShort, formatHijri, formatMonthYear, relativeDayLabel } from "../../lib/date";
import { actionProgress, approvalRequestMessage, effectiveApproval, isActionDone, whatsappUrl } from "../../lib/meetings";
import type { MeetingMinutesRow, MinutesActionRow, MinutesApprovalRow, Task } from "../../data/types";

interface MinutesListProps {
  minutes: MeetingMinutesRow[];
  loading: boolean;
  actions: MinutesActionRow[];
  approvals: MinutesApprovalRow[];
  tasks: Task[];
  memberName: (id: string | null | undefined) => string;
  canDelete: (m: MeetingMinutesRow) => boolean;
  onDelete: (id: string) => void;
  driveConnected: boolean;
  uploadingId: string | null;
  onUploadDrive: (m: MeetingMinutesRow) => void;
  onDownload: (m: MeetingMinutesRow, style: "dark" | "official") => void;
  onSendApproval: (m: MeetingMinutesRow) => Promise<void>;
  supervisorUrl: string | null;
  highlightId?: string | null;
}

export default function MinutesList(props: MinutesListProps) {
  const { minutes, loading, actions, approvals, tasks, memberName, supervisorUrl } = props;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-brand-950/45">جاري التحميل...</p>;
  if (minutes.length === 0) {
    return (
      <Card>
        <EmptyState icon={NotebookPen} title="ما فيه محاضر بعد" desc="أول محضر اجتماع تحفظونه بيظهر هنا، ويوصل للمشرف/ة وللدرايف." />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {minutes.map((m, i) => {
        const approval = approvals.find((a) => a.minutesId === m.id);
        const status = effectiveApproval(approval);
        const mActions = actions.filter((a) => a.minutesId === m.id);
        const prog = actionProgress(mActions, tasks);
        const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
        const expanded = open[m.id] ?? props.highlightId === m.id;
        return (
          <Fragment key={m.id}>
            {(i === 0 || formatMonthYear(minutes[i - 1].meetingDate) !== formatMonthYear(m.meetingDate)) && (
              <h4 className="pt-2 text-xs font-extrabold tracking-wide text-brand-950/45">{formatMonthYear(m.meetingDate)}</h4>
            )}
            <Card className={`!p-0 ${props.highlightId === m.id ? "ring-2 ring-brand-400/60" : ""}`}>
              <div className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-brand-950">{formatDateFull(m.meetingDate)}</p>
                    <p className="text-xs text-brand-950/45">
                      {relativeDayLabel(m.meetingDate)}
                      {formatHijri(m.meetingDate) && <> · {formatHijri(m.meetingDate)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ApprovalBadge status={status} />
                    {props.canDelete(m) && (
                      <ThreeDotsMenu items={[{ label: "حذف المحضر", confirmLabel: "تأكيد الحذف؟", icon: Trash2, tone: "danger", onClick: () => props.onDelete(m.id) }]} />
                    )}
                  </div>
                </div>

                {prog.total > 0 && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-brand-950/55">
                      <span>إنجاز بنود هذا الاجتماع</span>
                      <span>{prog.done} من {prog.total}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {status === "changes_requested" && approval && (
                  <div className="rounded-2xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm">
                    <p className="font-extrabold text-rose-500"><Pencil size={13} className="me-1 inline" />{approval.supervisorName || "المشرف/ة"} طلب تعديلًا:</p>
                    <p className="mt-1 whitespace-pre-wrap text-brand-950/80">{approval.note}</p>
                    <p className="mt-1 text-xs text-brand-950/50">عدّلوا ما يلزم، ثم أعيدوا الإرسال للاعتماد.</p>
                  </div>
                )}

                <p className="whitespace-pre-wrap text-sm text-brand-950/75">{m.discussion}</p>
                {m.decisions && <p className="whitespace-pre-wrap text-sm text-brand-950/75"><b>القرارات:</b> {m.decisions}</p>}

                {mActions.length > 0 ? (
                  <ul className="space-y-1.5">
                    {mActions.map((a) => {
                      const done = isActionDone(a, tasks);
                      return (
                        <li key={a.id} className="flex items-start gap-2 text-sm">
                          {done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" /> : <Circle size={16} className="mt-0.5 shrink-0 text-brand-950/30" />}
                          <span className={done ? "text-brand-950/45 line-through" : "text-brand-950/80"}>
                            {a.text}
                            <span className="text-xs text-brand-950/45"> — {memberName(a.assigneeId)}{a.dueDate ? ` · ${formatDateShort(a.dueDate)}` : ""}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  m.actionItems && <p className="whitespace-pre-wrap text-sm text-brand-950/75"><b>المهام:</b> {m.actionItems}</p>
                )}

                {(m.agenda || m.attendees.length > 0) && (
                  <div>
                    <button onClick={() => setOpen((o) => ({ ...o, [m.id]: !expanded }))} className="flex items-center gap-1 text-xs font-bold text-brand-950/50 hover:text-brand-700">
                      <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                      {expanded ? "إخفاء التفاصيل" : "جدول الأعمال والحاضرون"}
                    </button>
                    {expanded && (
                      <div className="mt-2 space-y-2 rounded-xl bg-surface-muted/60 p-3 text-xs text-brand-950/65">
                        {m.attendees.length > 0 && <p><b>الحاضرون:</b> {m.attendees.join("، ")}</p>}
                        {m.agenda && <p className="whitespace-pre-wrap leading-relaxed">{m.agenda}</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-brand-100/60 pt-3">
                  <button onClick={() => props.onDownload(m, "dark")} className="flex items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-brand-950/60 hover:bg-brand-50 hover:text-brand-700">
                    <Download size={12} />
                    Word
                  </button>
                  <button onClick={() => props.onDownload(m, "official")} title="نسخة بيضاء بسيطة للطباعة" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-950/45 hover:bg-brand-50 hover:text-brand-700">
                    نسخة للطباعة
                  </button>
                  {m.driveViewLink ? (
                    <a href={m.driveViewLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-brand-950/60 hover:bg-brand-50 hover:text-brand-700">
                      <ExternalLink size={12} />
                      فتح بدرايف
                    </a>
                  ) : (
                    props.driveConnected && (
                      <button onClick={() => props.onUploadDrive(m)} disabled={props.uploadingId === m.id} className="flex items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-brand-950/60 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50">
                        {props.uploadingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <CloudUpload size={12} />}
                        رفع لدرايف
                      </button>
                    )
                  )}
                  <span className="flex-1" />
                  {(status === "none" || status === "changes_requested") && (
                    <button
                      onClick={async () => {
                        setSending(m.id);
                        await props.onSendApproval(m);
                        setSending(null);
                      }}
                      disabled={sending === m.id}
                      className="flex items-center gap-1.5 rounded-lg border border-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-surface-muted disabled:opacity-50"
                    >
                      {sending === m.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      {status === "none" ? "أرسلوه للاعتماد" : "أعيدوا الإرسال"}
                    </button>
                  )}
                  {status === "pending" && supervisorUrl && (
                    <a href={whatsappUrl(approvalRequestMessage(formatDateFull(m.meetingDate), supervisorUrl))} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-surface-muted">
                      <MessageCircle size={12} />
                      ذكّروها بواتساب
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </Fragment>
        );
      })}
    </div>
  );
}
