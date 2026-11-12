import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, CircleAlert, CircleCheck, CircleHelp, Download, ImageUp, Share2 } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import { DocAvatar, SupIcons } from "../components/sup/SupParts";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useMeetings } from "../hooks/useMeetings";
import { useTasksData } from "../hooks/useTasksData";
import { useResearchProject } from "../hooks/useResearchProject";
import { useTeamChat } from "../hooks/useTeamChat";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { notifySupervisor } from "../lib/supervisorNotify";
import { effectiveApproval } from "../lib/meetings";
import { formatDateFull, formatDateShort, toISODate } from "../lib/date";
import { inferPlace, placeByKey } from "../lib/taskLinks";
import { publicOrigin } from "../lib/publicUrl";
import { tr } from "../lib/i18n";
import { arNum, downloadMinutesPdf, logoDataUrl, uploadLogo } from "../lib/minutesPdf";
import { attendanceSummary, two, type Attendee, type Capture } from "../lib/minutesLive";

/* المحضر النهائي — القيم منقولة من design-reference/supervisor (MinDocD/M، MinSpec):
   هيرو سينمائي، أربعة أقسام بأرقام ذهبية 01–04، والختم ينطبع لما تعتمده الدكتورة */

interface Row {
  id: string;
  meeting_date: string;
  agenda: string | null;
  attendees: string[];
  discussion: string;
  decisions: string;
  action_items: string;
  created_by: string | null;
  created_at: string;
  title?: string;
  room?: string;
  started_at?: string | null;
  ended_at?: string | null;
  attendance?: Attendee[];
  captures?: Capture[];
  open_items?: string;
}

const lines = (s: string | null | undefined) => (s ?? "").split("\n").map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
const hhmm = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

export default function MinutesDoc() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { team, currentUser, canWrite } = useAuth();
  const { showToast } = useToast();
  const { roster } = useTeamRoster();
  const meetings = useMeetings();
  const { tasks } = useTasksData();
  const { project } = useResearchProject();
  const { send } = useTeamChat();
  const [row, setRow] = useState<Row | null>(null);
  const [all, setAll] = useState<{ id: string; meeting_date: string; created_at: string }[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<"" | "pdf" | "send" | "share" | "logo">("");
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !id) return;
    void supabase!.from("meeting_minutes").select("*").eq("id", id).maybeSingle().then(({ data, error }) => (error || !data ? setFailed(true) : setRow(data as Row)));
    void supabase!.from("meeting_minutes").select("id, meeting_date, created_at").order("meeting_date").order("created_at").then(({ data }) => setAll((data ?? []) as typeof all));
  }, [id]);

  const number = useMemo(() => two(Math.max(1, all.findIndex((m) => m.id === id) + 1)), [all, id]);
  const approval = useMemo(() => {
    const a = meetings.approvals.find((x) => x.minutesId === id);
    return a ? { ...a, effective: effectiveApproval(a) } : null;
  }, [meetings.approvals, id]);
  const approved = approval?.effective === "approved" || approval?.status === "approved";
  const who = (pid: string | null | undefined) => (pid ? roster.find((m) => m.id === pid) : undefined);

  if (!team || !currentUser) return null;
  if (failed) {
    return (
      <div className="v3 px-4 py-16 text-center">
        <p className="text-[15px] text-[#E9D3B8]">{tr("ما لقينا هالمحضر.")}</p>
        <Link to="/meeting-minutes" className="text-[#FFC777]">
          {tr("ارجعوا للمحاضر")}
        </Link>
      </div>
    );
  }
  if (!row) {
    return (
      <div className="v3 flex flex-col gap-3 px-4 py-6" role="status" aria-label={tr("نحمّل…")}>
        <div className="sup-skel" style={{ height: 220, borderRadius: 28 }} />
        <div className="sup-skel" style={{ height: 120 }} />
      </div>
    );
  }

  const caps = row.captures ?? [];
  const att = row.attendance ?? [];
  const sum = attendanceSummary(att.filter((a) => a.joinedAt !== "pending"), row.started_at ?? null, row.ended_at ?? null);
  const title = row.title?.trim() || tr("محضر اجتماع");
  const discussion = lines(row.discussion).filter((x) => x !== "—");
  const decisions = lines(row.decisions);
  const open = lines(row.open_items);
  const actions = meetings.actions.filter((a) => a.minutesId === id);
  const linked = caps.filter((c) => c.tag === "task" && c.linkTaskId).map((c) => ({ id: c.id, text: c.text, assigneeId: c.by, dueDate: c.dueDate ?? null, taskId: c.linkTaskId ?? null }));
  const rows = [...actions.map((a) => ({ id: a.id, text: a.text, assigneeId: a.assigneeId, dueDate: a.dueDate, taskId: a.taskId })), ...linked];
  // «لو انكتبت البنود قبل وضع الاجتماع» نعرض النص نفسه
  const legacyActions = rows.length ? [] : lines(row.action_items);
  const timeRange = row.started_at ? `${hhmm(row.started_at)} - ${hhmm(row.ended_at)}` : "";
  const proposer = (text: string) => {
    const c = caps.find((x) => x.tag === "decision" && x.text.trim() === text);
    const p = c?.by === "supervisor" ? tr("الدكتورة") : who(c?.by)?.name.split(/\s+/)[0];
    return p ? tr("اقترحها {0}", p) : "";
  };
  const dueLabel = (d: string | null) => (!d ? "—" : d === toISODate(new Date()) ? tr("اليوم") : formatDateShort(d));

  const pdf = async () => {
    setBusy("pdf");
    const r = await downloadMinutesPdf(
      {
        number: arNum(number),
        title,
        dateLabel: formatDateFull(row.meeting_date),
        timeRange: timeRange.replace(" - ", " – "),
        projectTitle: project?.title ?? "",
        supervisorName: project?.supervisorName ?? approval?.supervisorName ?? "",
        attendees: (att.length ? att.filter((a) => a.joinedAt && a.role !== "supervisor").map((a) => a.name.split(/\s+/)[0]) : row.attendees),
        came: att.length ? sum.came : row.attendees.length,
        total: att.length ? sum.total : row.attendees.length,
        room: row.room ?? "",
        discussion,
        decisions,
        actions: rows.length ? rows.map((a) => ({ text: a.text, owner: who(a.assigneeId)?.name.split(/\s+/)[0] ?? "—", due: dueLabel(a.dueDate) })) : legacyActions.map((t) => ({ text: t, owner: "—", due: "—" })),
        open,
        writer: who(row.created_by)?.name ?? "",
        approvedOn: approved && approval?.resolvedAt ? new Date(approval.resolvedAt).toLocaleDateString("en-GB").replace(/\/0?/g, "/").replace(/^0/, "") : null,
        logoDataUrl: await logoDataUrl(team.id),
      },
      tr("محضر {0} - {1}.pdf", title, row.meeting_date),
    );
    setBusy("");
    if (r === "failed") showToast({ title: tr("المتصفح منع النافذة — اسمحوا بالنوافذ المنبثقة وجرّبوا مرة ثانية."), icon: CircleAlert });
  };
  const sendToDoc = async () => {
    setBusy("send");
    const r = await meetings.requestApproval(row.id);
    if (!r.error) void notifySupervisor("minutes", row.id);
    setBusy("");
    showToast({ title: r.error ? tr("ما انرسل للاعتماد") : tr("انرسل المحضر للدكتورة ✓"), icon: r.error ? CircleAlert : CircleCheck });
  };
  const share = async () => {
    setBusy("share");
    const r = await send(tr("📝 محضر «{0}» · {1}\n{2}", title, formatDateShort(row.meeting_date), `${publicOrigin()}/#/meeting-minutes/${row.id}`));
    setBusy("");
    showToast({ title: r.error ? tr("ما انرسل — جرّبوا مرة ثانية.") : tr("انرسل بالمحادثة ✓"), icon: r.error ? CircleAlert : CircleCheck });
  };
  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    setBusy("logo");
    const p = await uploadLogo(team.id, f);
    setBusy("");
    showToast({ title: p ? tr("انرفع الشعار ✓ يطلع بالـPDF") : tr("الشعار لازم صورة أصغر من ٢ ميغا."), icon: p ? CircleCheck : CircleAlert });
  };

  const section = (n: string, head: string, body: React.ReactNode, i: number) => (
    <section className="md-sec" style={{ animationDelay: `${i * 90}ms` }} aria-labelledby={`md-h-${n}`}>
      <div className="flex items-baseline gap-4">
        <span className="md-num" aria-hidden>
          {n}
        </span>
        <h2 id={`md-h-${n}`} className="m-0 text-[24px] font-extrabold text-[#F2EBE3]">
          {head}
        </h2>
      </div>
      <div className="mt-3">{body}</div>
    </section>
  );

  const seal = approved ? (
    <section className="sup-glass flex flex-col items-center text-center" aria-label={tr("اعتماد المحضر")}>
      <div className="sup-seal">
        <div className="sup-obj" role="img" aria-label={tr("ختم ذهبي")} style={{ width: 150, height: 150 }}>
          <img src="/sup/seal.jpg" alt="" width={150} height={150} />
        </div>
      </div>
      <div className="-mt-1 text-[12px] font-bold text-[#FFB444]">{tr("معتمد من المشرف/ة")}</div>
      <div className="mt-1 text-[24px] font-extrabold text-[#F2EBE3]">{approval?.supervisorName || project?.supervisorName || tr("المشرف/ة")}</div>
      <div className="mt-2 w-full border-t border-white/10 pt-2 text-[12px] text-[#E9D3B8]">{approval?.resolvedAt ? `${formatDateFull(approval.resolvedAt.slice(0, 10))} · ${hhmm(approval.resolvedAt)}` : ""}</div>
    </section>
  ) : (
    <section className="sup-glass" aria-label={tr("اعتماد المحضر")}>
      <b className="block text-[16px]">{approval ? (approval.status === "changes_requested" ? tr("المشرف/ة طلب/ت تعديل") : tr("بانتظار اعتماد المشرف/ة")) : tr("لسا ما انرسل للاعتماد")}</b>
      {approval?.note && <p className="m-0 mt-1 text-[13px] text-[#E9D3B8]" dir="auto">«{approval.note}»</p>}
      <p className="m-0 mt-1 text-[13px] text-[#ABA095]">{tr("لما يعتمده ينطبع عليه الختم ويوصله إيصال.")}</p>
      {(!approval || approval.status === "changes_requested") && canWrite && (
        <button type="button" className="sup-btn-primary mt-3 w-full" disabled={busy === "send"} onClick={() => void sendToDoc()}>
          {tr("أرسلوه للدكتورة")}
        </button>
      )}
    </section>
  );

  const tools = (
    <section className="sup-glass flex flex-col gap-2">
      <button type="button" className="sup-btn-cream flex w-full items-center justify-center gap-2" disabled={busy === "pdf"} onClick={() => void pdf()}>
        <Download size={17} aria-hidden />
        {busy === "pdf" ? tr("نجهّزه…") : tr("نزّلوه PDF رسمي")}
      </button>
      <button type="button" className="sup-btn-ghost flex w-full items-center justify-center gap-2" disabled={busy === "share" || !canWrite} onClick={() => void share()}>
        <Share2 size={16} aria-hidden />
        {tr("شاركوه بالمحادثة")}
      </button>
      <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" className="ci-text flex w-full items-center justify-center gap-2" disabled={busy === "logo" || !canWrite} onClick={() => logoInput.current?.click()}>
        <ImageUp size={15} aria-hidden />
        {tr("شعار الجامعة للـPDF")}
      </button>
    </section>
  );

  const roll = att.length > 0 && (
    <section className="sup-glass" aria-labelledby="md-att">
      <div className="flex items-center">
        <b id="md-att" className="flex-1 text-[16px]">
          {tr("الحضور")}
        </b>
        <span className="text-[12px] font-bold text-[#FFC777]">
          {sum.minutes ? tr("{0} من {1} · {2} دقيقة", sum.came, sum.total, sum.minutes) : tr("{0} من {1}", sum.came, sum.total)}
        </span>
      </div>
      {att.map((a) => (
        <div key={a.id} className="sup-row">
          {a.role === "supervisor" ? <DocAvatar name={a.name} px={28} /> : <Avatar initials="" name={a.name} avatar={who(a.id)?.avatar ?? undefined} px={28} ring="#1A120E" />}
          <span className="min-w-0 flex-1 text-[14px] font-bold">
            {a.role === "supervisor" ? a.name : a.name.split(/\s+/)[0]}
            {a.id === row.created_by && <small className="ms-1 text-[12px] font-normal text-[#ABA095]">{tr("· كاتب المحضر")}</small>}
            {a.role === "supervisor" && <small className="ms-1 text-[12px] font-normal text-[#ABA095]">{tr("· المشرف/ة")}</small>}
          </span>
          <span className="text-[12px] text-[#E9D3B8]" dir="ltr">
            {a.joinedAt && a.joinedAt !== "pending" ? hhmm(a.joinedAt) : tr("غاب")}
          </span>
        </div>
      ))}
    </section>
  );

  return (
    <div className="v3 px-4 py-4 lg:px-6 lg:py-6">
      <div className="mb-3 flex items-center gap-2 lg:hidden">
        <button type="button" className="tc-round" aria-label={tr("رجوع")} onClick={() => navigate("/meeting-minutes")}>
          <ChevronLeft size={18} className="rtl:rotate-180" />
        </button>
        <span className="flex-1 text-center text-[13px] text-[#ABA095]">{tr("المحاضر · {0} من {1}", number, two(all.length || 1))}</span>
        <span style={{ width: 44 }} />
      </div>
      <header className="md-hero">
        <img src="/sup/pen_hero.jpg" alt="" aria-hidden className="md-hero-img" />
        <div className="md-hero-in">
          <div className="text-[13px] font-bold text-[#FFB444]">{tr("محضر اجتماع · رقم {0}", number)}</div>
          <h1 className="md-title">{title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-[#E9D3B8]">
            <span>{formatDateFull(row.meeting_date)}</span>
            {timeRange && <span dir="ltr">{timeRange}</span>}
            {row.room && <span>{row.room}</span>}
          </div>
          {att.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex">
                {att.filter((a) => a.joinedAt && a.joinedAt !== "pending").map((a) => (
                  <span key={a.id} className="-ms-2 first:ms-0">
                    {a.role === "supervisor" ? <DocAvatar name={a.name} px={30} /> : <Avatar initials="" name={a.name} avatar={who(a.id)?.avatar ?? undefined} px={30} ring="#1A120E" />}
                  </span>
                ))}
              </div>
              <span className="text-[13px] text-[#EAE3DC]">{tr("{0}/{1} حاضرين", sum.came, sum.total)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col">
          {section(
            "01",
            tr("النقاش"),
            discussion.length ? (
              <ul className="m-0 list-disc space-y-2 ps-5 text-[16px] leading-[1.8] text-[#E9D3B8]">
                {discussion.map((x, i) => (
                  <li key={i} dir="auto">{x}</li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[14px] text-[#ABA095]">—</p>
            ),
            0,
          )}
          {section(
            "02",
            tr("القرارات"),
            decisions.length ? (
              <div className="flex flex-col gap-2.5">
                {decisions.map((x, i) => (
                  <div key={i} className="md-dec">
                    <span className="md-check" aria-hidden>
                      {SupIcons.check}
                    </span>
                    <div className="min-w-0">
                      <b className="block text-[16px] text-[#F2EBE3]" dir="auto">{x}</b>
                      {proposer(x) && <span className="text-[12px] text-[#ABA095]">{proposer(x)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 text-[14px] text-[#ABA095]">—</p>
            ),
            1,
          )}
          {section(
            "03",
            tr("بنود العمل"),
            rows.length ? (
              <div role="table" aria-label={tr("بنود العمل")} className="md-table">
                <div role="row" className="md-tr md-th max-md:hidden">
                  <span role="columnheader">{tr("البند")}</span>
                  <span role="columnheader">{tr("المسؤول")}</span>
                  <span role="columnheader">{tr("الموعد")}</span>
                  <span role="columnheader">{tr("مكانه")}</span>
                </div>
                {rows.map((a) => {
                  const p = who(a.assigneeId);
                  const t = a.taskId ? tasks.find((x) => x.id === a.taskId) : undefined;
                  const place = placeByKey(t?.sectionKey ?? inferPlace(a.text));
                  return (
                    <div key={a.id} role="row" className="md-tr">
                      <b role="cell" className="text-[15px] text-[#F2EBE3]" dir="auto">{a.text}</b>
                      <span role="cell" className="flex items-center gap-2 text-[14px]">
                        {p && <Avatar initials="" name={p.name} avatar={p.avatar ?? undefined} px={26} ring="#1A120E" />}
                        {p?.name.split(/\s+/)[0] ?? "—"}
                      </span>
                      <span role="cell" className="text-[14px] text-[#E9D3B8]">{dueLabel(a.dueDate ?? t?.dueDate ?? null)}</span>
                      <span role="cell">
                        {place && (
                          <Link to={place.route} className="md-place">
                            {place.label}
                            <ChevronLeft size={13} aria-hidden className="ltr:rotate-180" />
                          </Link>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : legacyActions.length ? (
              <ul className="m-0 list-disc space-y-2 ps-5 text-[15px] text-[#E9D3B8]">{legacyActions.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul>
            ) : (
              <p className="m-0 text-[14px] text-[#ABA095]">—</p>
            ),
            2,
          )}
          {section(
            "04",
            tr("مفتوح للاجتماع الجاي"),
            open.length ? (
              <div className="flex flex-col gap-2">
                {open.map((x, i) => (
                  <div key={i} className="flex items-center gap-2 text-[15px] text-[#EAE3DC]">
                    <CircleHelp size={16} aria-hidden className="flex-none text-[#FFC777]" />
                    <span dir="auto">{x}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 text-[14px] text-[#ABA095]">{tr("لا شي — كل شي انحسم ✓")}</p>
            ),
            3,
          )}
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          {seal}
          {tools}
          {roll}
        </aside>
      </div>
    </div>
  );
}
