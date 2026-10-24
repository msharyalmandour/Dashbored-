import { useState } from "react";
import clsx from "clsx";
import { ChevronLeft, CheckCircle2, CloudUpload, Download, ExternalLink, Loader2, MessageCircle, NotebookPen, Pencil, Send, Trash2, Circle } from "lucide-react";
import Dialog from "../ui/Dialog";
import EmptyState from "../ui/EmptyState";
import ThreeDotsMenu from "../ui/ThreeDotsMenu";
import ApprovalBadge from "./ApprovalBadge";
import { glassCard } from "../ui/researchUi";
import { formatDateFull, formatDateShort, formatHijri, relativeDayLabel } from "../../lib/date";
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

const arDigit = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean).length;
const toolBtn = "flex items-center gap-1.5 rounded-full border border-white/[0.14] px-3.5 py-1.5 text-xs font-semibold text-[#B8ADA2] transition hover:border-[#FF8A24]/50 hover:text-[#F4F0EC] disabled:opacity-50";

/** المحاضر السابقة: صفوف هادئة (رقم + تاريخ + عدد القرارات والبنود + حالة)، والتفاصيل والأدوات بنافذة */
export default function MinutesList(props: MinutesListProps) {
  const { minutes, loading, actions, approvals, tasks, memberName, supervisorUrl } = props;
  const [openId, setOpenId] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-[#B8ADA2]">جاري التحميل...</p>;
  if (minutes.length === 0) {
    return (
      <div className={clsx(glassCard, "p-2")}>
        <EmptyState icon={NotebookPen} title="ما فيه محاضر بعد" desc="أول محضر اجتماع تحفظونه بيظهر هنا، ويوصل للمشرف/ة وللدرايف." />
      </div>
    );
  }

  const m = minutes.find((x) => x.id === openId) ?? null;
  const approval = m ? approvals.find((a) => a.minutesId === m.id) : undefined;
  const status = effectiveApproval(approval);
  const mActions = m ? actions.filter((a) => a.minutesId === m.id) : [];
  const prog = actionProgress(mActions, tasks);
  const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;

  return (
    <>
      <ul className="space-y-2.5">
        {minutes.map((x, i) => {
          const st = effectiveApproval(approvals.find((a) => a.minutesId === x.id));
          const items = actions.filter((a) => a.minutesId === x.id).length || lines(x.actionItems);
          const decisionCount = lines(x.decisions);
          return (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => setOpenId(x.id)}
                className={clsx(
                  glassCard,
                  "flex w-full items-center gap-4 p-4 text-start transition hover:border-[#FF8A24]/60",
                  props.highlightId === x.id && "!border-[#FFB444] shadow-[0_0_0_2px_rgba(255,180,68,.35)]",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FF8A24]/60 text-sm font-bold text-[#FFB444]">{arDigit(minutes.length - i)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{formatDateFull(x.meetingDate)}</span>
                  <span className="block text-xs text-[#B8ADA2]">
                    {decisionCount > 0 ? `${arDigit(decisionCount)} ${decisionCount === 1 ? "قرار" : "قرارات"}` : "بدون قرارات"} · {items > 0 ? `${arDigit(items)} ${items === 1 ? "بند" : "بنود"}` : "بدون بنود"}
                  </span>
                </span>
                <ApprovalBadge status={st} />
                <ChevronLeft size={16} className="shrink-0 text-[#B8ADA2]" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!m} onClose={() => setOpenId(null)} title={m ? formatDateFull(m.meetingDate) : ""}>
        {m && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[#B8ADA2]">
                {relativeDayLabel(m.meetingDate)}
                {formatHijri(m.meetingDate) && <> · {formatHijri(m.meetingDate)}</>}
              </p>
              <div className="flex items-center gap-2">
                <ApprovalBadge status={status} />
                {props.canDelete(m) && (
                  <ThreeDotsMenu
                    items={[
                      {
                        label: "حذف المحضر",
                        confirmLabel: "تأكيد الحذف؟",
                        icon: Trash2,
                        tone: "danger",
                        onClick: () => {
                          props.onDelete(m.id);
                          setOpenId(null);
                        },
                      },
                    ]}
                  />
                )}
              </div>
            </div>

            {prog.total > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#B8ADA2]">
                  <span>إنجاز بنود هذا الاجتماع</span>
                  <span>
                    {prog.done} من {prog.total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {status === "changes_requested" && approval && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm">
                <p className="font-extrabold text-rose-300">
                  <Pencil size={13} className="me-1 inline" />
                  {approval.supervisorName || "المشرف/ة"} طلب تعديلًا:
                </p>
                <p className="mt-1 whitespace-pre-wrap">{approval.note}</p>
                <p className="mt-1 text-xs text-[#B8ADA2]">عدّلوا ما يلزم، ثم أعيدوا الإرسال للاعتماد.</p>
              </div>
            )}

            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.discussion}</p>
            {m.decisions && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                <b>القرارات:</b> {m.decisions}
              </p>
            )}

            {mActions.length > 0 ? (
              <ul className="space-y-1.5">
                {mActions.map((a) => {
                  const done = isActionDone(a, tasks);
                  return (
                    <li key={a.id} className="flex items-start gap-2 text-sm">
                      {done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#7fd6a0]" /> : <Circle size={16} className="mt-0.5 shrink-0 text-[#B8ADA2]/50" />}
                      <span className={done ? "text-[#B8ADA2] line-through" : ""}>
                        {a.text}
                        <span className="text-xs text-[#B8ADA2]">
                          {" "}
                          — {memberName(a.assigneeId)}
                          {a.dueDate ? ` · ${formatDateShort(a.dueDate)}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              m.actionItems && (
                <p className="whitespace-pre-wrap text-sm">
                  <b>المهام:</b> {m.actionItems}
                </p>
              )
            )}

            {(m.agenda || m.attendees.length > 0) && (
              <div className="space-y-2 rounded-2xl bg-white/[0.04] p-3.5 text-xs text-[#B8ADA2]">
                {m.attendees.length > 0 && (
                  <p>
                    <b className="text-[#F4F0EC]">الحاضرون:</b> {m.attendees.join("، ")}
                  </p>
                )}
                {m.agenda && <p className="whitespace-pre-wrap leading-relaxed">{m.agenda}</p>}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <button onClick={() => props.onDownload(m, "dark")} className={toolBtn}>
                <Download size={12} />
                Word
              </button>
              <button onClick={() => props.onDownload(m, "official")} title="نسخة بيضاء بسيطة للطباعة" className={toolBtn}>
                نسخة للطباعة
              </button>
              {m.driveViewLink ? (
                <a href={m.driveViewLink} target="_blank" rel="noreferrer" className={toolBtn}>
                  <ExternalLink size={12} />
                  فتح بدرايف
                </a>
              ) : (
                props.driveConnected && (
                  <button onClick={() => props.onUploadDrive(m)} disabled={props.uploadingId === m.id} className={toolBtn}>
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
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-4 py-1.5 text-xs font-bold text-[#1A0F00] disabled:opacity-50"
                >
                  {sending === m.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  {status === "none" ? "أرسلوه للاعتماد" : "أعيدوا الإرسال"}
                </button>
              )}
              {status === "pending" && supervisorUrl && (
                <a href={whatsappUrl(approvalRequestMessage(formatDateFull(m.meetingDate), supervisorUrl))} target="_blank" rel="noreferrer" className={toolBtn}>
                  <MessageCircle size={12} />
                  ذكّروها بواتساب
                </a>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
