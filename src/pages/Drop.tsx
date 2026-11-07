import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, Camera, Check, FileQuestion, FileUp, Link2, ListChecks, Loader2, MessageSquareQuote, NotebookPen, PenLine, X } from "lucide-react";
import clsx from "clsx";
import AgentOrb from "../components/ui/AgentOrb";
import { PageDropOverlay, usePageDrop } from "../components/research/StudyDrop";
import { useAuth } from "../context/AuthContext";
import { useTasksData } from "../hooks/useTasksData";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useMeetingMinutes } from "../hooks/useMeetingMinutes";
import { useSupervisorFeedback } from "../hooks/useSupervisorFeedback";
import { useProposal } from "../hooks/useProposal";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useTeamChat } from "../hooks/useTeamChat";
import { useResearchProject } from "../hooks/useResearchProject";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { readPaperFiles } from "../hooks/useProjectAgent";
import { sortDrop, toInputs, type DropInput, type SortItem } from "../lib/dropSort";
import { placeByKey } from "../lib/taskLinks";
import { addDaysISO, formatDateShort } from "../lib/date";
import { tr } from "../lib/i18n";
import type { EvidencePaper } from "../data/types";

/* ═══ «ارموا أي شي» ═══
   ترمون ملف/صور/نص/رابط → الوكيل يفهمه ويقسمه لأشياء (دراسة، مهام، محضر، ملاحظات المشرف/ة، نص قسم، موعد، رابط)
   → تشوفونها وتشيلون اللي ما تبونه → «حطوها بمكانها» تحفظ كل وحدة بصفحتها (بصلاحياتكم). */

// ملفات رُميت بأي صفحة ثانية — تنتقل هنا وتنفرز
let pending: File[] = [];
export function queueDropFiles(files: File[]) {
  pending = files;
}

/** الرمي من أي صفحة بالموقع (إلا مكتبة الأدلة اللي لها رمي الدراسات، والمحادثة) يودّي هنا */
export function GlobalDrop() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { team, mode } = useAuth();
  const enabled = mode === "supabase" && !!team && !["/evidence", "/drop", "/chat"].includes(pathname);
  const onFiles = useCallback(
    (f: FileList) => {
      queueDropFiles(Array.from(f));
      navigate("/drop");
    },
    [navigate],
  );
  const over = usePageDrop(onFiles, enabled);
  return <PageDropOverlay show={over} />;
}

type Kind = SortItem["kind"];
type Row = SortItem & { on: boolean; done?: { ok: boolean; to?: string; msg?: string } };
interface Batch {
  id: string;
  name: string;
  input: DropInput;
  status: "sorting" | "ready" | "saving" | "saved" | "failed";
  summary: string;
  rows: Row[];
  notes?: string[];
  error?: string;
}

const SECTION_LABEL: Record<string, string> = {
  background: tr("خلفية البحث"),
  "literature-review": tr("مراجعة الأدبيات"),
  problem: tr("مشكلة البحث"),
  gap: tr("الفجوة المعرفية"),
  aim: tr("هدف الدراسة"),
  questions: tr("أسئلة البحث"),
  methodology: tr("المنهجية"),
  ethics: tr("الأخلاقيات"),
  other: tr("عام"),
};

const KIND: Record<Kind, { icon: ReactNode; label: string }> = {
  paper: { icon: <BookOpen size={18} />, label: tr("دراسة علمية") },
  paper_info: { icon: <BookOpen size={18} />, label: tr("دراسة من رابط") },
  task: { icon: <ListChecks size={18} />, label: tr("مهمة") },
  minutes: { icon: <NotebookPen size={18} />, label: tr("محضر اجتماع") },
  supervisor_note: { icon: <MessageSquareQuote size={18} />, label: tr("ملاحظة من المشرف/ة") },
  section_text: { icon: <PenLine size={18} />, label: tr("نص لقسم بالمقترح") },
  event: { icon: <CalendarDays size={18} />, label: tr("موعد") },
  link: { icon: <Link2 size={18} />, label: tr("رابط") },
  other: { icon: <FileQuestion size={18} />, label: tr("ما له مكان تلقائي") },
};

export default function Drop() {
  const { currentUser, isLeader, canWrite } = useAuth();
  const { addTask } = useTasksData();
  const { addPaper } = useEvidencePapers();
  const { addMinutes } = useMeetingMinutes();
  const { addItems } = useSupervisorFeedback();
  const { sections, updateSection } = useProposal();
  const { addEvent } = useCalendarEvents();
  const { send } = useTeamChat();
  const { project } = useResearchProject();
  const { roster } = useTeamRoster();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Batch>) => setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const patchRow = (id: string, i: number, p: Partial<Row>) =>
    setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, rows: b.rows.map((r, j) => (j === i ? ({ ...r, ...p } as Row) : r)) } : b)));

  const sortOne = async (input: DropInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBatches((prev) => [{ id, name: input.name, input, status: "sorting", summary: "", rows: [] }, ...prev]);
    const r = await sortDrop(input);
    if (!r.data) patch(id, { status: "failed", error: r.message });
    else patch(id, { status: "ready", summary: r.data.summary, notes: r.data.notes, rows: r.data.items.map((it) => ({ ...it, on: it.kind !== "other" })) });
  };

  const takeFiles = async (list: FileList | File[] | null | undefined) => {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    const { inputs, rejected } = await toInputs(files);
    setNotes(rejected);
    for (const inp of inputs) void sortOne(inp);
  };
  const takeText = () => {
    const t = text.trim();
    if (t.length < 3) return;
    setText("");
    void sortOne({ name: t.length > 40 ? `${t.slice(0, 40)}…` : t, text: t });
  };

  // ملفات انرمت من صفحة ثانية
  useEffect(() => {
    if (pending.length) {
      const f = pending;
      pending = [];
      void takeFiles(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const over = usePageDrop(
    useCallback((f: FileList) => void takeFiles(f), []), // eslint-disable-line react-hooks/exhaustive-deps
    true,
  );

  const firstName = (id: string | null) => (id ? roster.find((m) => m.id === id)?.name.split(" ")[0] ?? "" : "");

  const destination = (r: Row): string => {
    switch (r.kind) {
      case "paper":
      case "paper_info":
        return tr("مكتبة الأدلة + جدول الأدبيات");
      case "task":
        return placeByKey(r.place)?.label ? tr("مهامي · {0}", placeByKey(r.place)!.label) : tr("مهامي");
      case "minutes":
        return tr("الاجتماعات");
      case "supervisor_note":
        return tr("ملاحظات المشرف/ة · {0}", SECTION_LABEL[r.section] ?? "");
      case "section_text":
        return tr("المقترح · {0}", SECTION_LABEL[r.section] ?? "");
      case "event":
        return tr("التقويم");
      case "link":
        return tr("المحادثة والملفات");
      default:
        return tr("الملفات");
    }
  };

  const body = (r: Row): ReactNode => {
    switch (r.kind) {
      case "paper":
        return tr("نقراها بالتفصيل ونعبّي الجدول لما تحطونها.");
      case "paper_info":
        return (
          <>
            <b dir="auto">{r.title}</b>
            <span className="dp-meta" dir="auto">
              {[r.authors, r.year].filter(Boolean).join(" · ")}
            </span>
            {r.summaryAr && (
              <span className="dp-meta dp-sum" dir="auto">
                {r.summaryAr}
              </span>
            )}
          </>
        );
      case "task":
        return (
          <>
            <b dir="auto">{r.title}</b>
            <span className="dp-meta">{[firstName(r.assigneeId) || tr("بدون مسؤول (يروح لكم)"), r.due ? formatDateShort(r.due) : tr("بعد أسبوع")].join(" · ")}</span>
          </>
        );
      case "minutes":
        return (
          <>
            <b>{tr("اجتماع {0}", formatDateShort(r.meetingDate))}</b>
            <span className="dp-meta dp-clip" dir="auto">
              {r.decisions || r.discussion}
            </span>
          </>
        );
      case "supervisor_note":
        return <b dir="auto">{r.comment}</b>;
      case "section_text":
        return (
          <span className="dp-meta dp-clip" dir="auto">
            {r.text}
          </span>
        );
      case "event":
        return (
          <>
            <b dir="auto">{r.title}</b>
            <span className="dp-meta">{[formatDateShort(r.date), r.time].filter(Boolean).join(" · ")}</span>
          </>
        );
      case "link":
        return (
          <>
            <b dir="auto">{r.label || r.url}</b>
            {r.summary && (
              <span className="dp-meta dp-sum" dir="auto">
                {r.summary}
              </span>
            )}
            <span className="dp-meta" dir="ltr">
              {r.url}
            </span>
          </>
        );
      default:
        return <span className="dp-meta">{r.why}</span>;
    }
  };

  const save = async (b: Batch) => {
    if (!currentUser) return;
    patch(b.id, { status: "saving" });
    const notesToAdd: { i: number; comment: string; sectionKey: string }[] = [];
    for (let i = 0; i < b.rows.length; i++) {
      const r = b.rows[i];
      if (!r.on || r.done?.ok) continue;
      let res: { ok: boolean; to?: string; msg?: string } = { ok: false };
      try {
        if (r.kind === "paper") {
          const read = await readPaperFiles(b.input.files ?? []);
          if (!read.data) res = { ok: false, msg: read.message };
          else {
            const p = read.data;
            const { error } = await addPaper({ title: p.title, authors: p.authors, year: p.year ?? new Date().getFullYear(), theme: p.theme as EvidencePaper["theme"], studyDesign: p.studyDesign, keyFinding: p.keyFinding, relevance: p.relevance, section: p.section, country: p.country, aim: p.aim, sample: p.sampleAndSetting, dataCollection: p.dataCollection, addedById: currentUser.id });
            res = error ? { ok: false, msg: error } : { ok: true, to: "/evidence" };
          }
        } else if (r.kind === "paper_info") {
          const ok = (v: string) => (/غير مذكور/.test(v) ? "" : v);
          const { error } = await addPaper({ title: r.title, authors: ok(r.authors), year: r.year ?? new Date().getFullYear(), theme: "عام" as EvidencePaper["theme"], studyDesign: ok(r.studyDesign), keyFinding: ok(r.keyFinding), relevance: ok(r.relevance), section: r.section, link: r.url || undefined, country: ok(r.country), aim: ok(r.aim), sample: ok(r.sampleAndSetting), dataCollection: ok(r.dataCollection), addedById: currentUser.id });
          res = error ? { ok: false, msg: error } : { ok: true, to: "/evidence" };
        } else if (r.kind === "task") {
          const { error, id } = await addTask({ title: r.title, description: tr("من «ارموا أي شي»: {0}", b.name), assigneeId: r.assigneeId ?? currentUser.id, dueDate: r.due || addDaysISO(new Date().toISOString().slice(0, 10), 7), priority: "medium", sectionKey: r.place || null });
          res = error ? { ok: false, msg: isLeader ? error : tr("المهام يضيفها القائد") } : { ok: true, to: id ? `/tasks?task=${id}` : "/tasks" };
        } else if (r.kind === "minutes") {
          const tasks = b.rows.filter((x): x is Row & { kind: "task" } => x.kind === "task" && x.on).map((x) => `- ${x.title}`).join("\n");
          const { error } = await addMinutes({ meetingDate: r.meetingDate, agenda: r.agenda, attendees: [], discussion: r.discussion, decisions: r.decisions, actionItems: tasks, createdById: currentUser.id });
          res = error ? { ok: false, msg: error } : { ok: true, to: "/meeting-minutes" };
        } else if (r.kind === "supervisor_note") {
          notesToAdd.push({ i, comment: r.comment, sectionKey: r.section });
          continue;
        } else if (r.kind === "section_text") {
          const sec = sections.find((s) => s.key === r.section);
          const content = sec?.content?.trim() ? `${sec.content.trim()}\n\n${r.text}` : r.text;
          const { error } = await updateSection(r.section, { content });
          res = error ? { ok: false, msg: error } : { ok: true, to: r.section === "methodology" ? "/methodology" : `/proposal?section=${r.section}` };
        } else if (r.kind === "event") {
          const type = /تسليم|اختبار|deadline|exam/i.test(r.title) ? "deadline" : "meeting";
          const { error } = await addEvent({ title: r.title, date: r.date, time: r.time, type, location: "" });
          res = error ? { ok: false, msg: error } : { ok: true, to: "/calendar" };
        } else if (r.kind === "link") {
          const { error } = await send([r.label, r.summary ? tr("الملخص: {0}", r.summary) : "", r.url].filter(Boolean).join("\n"));
          res = error ? { ok: false, msg: error } : { ok: true, to: "/files" };
        }
      } catch {
        res = { ok: false, msg: tr("ما انحفظت — جرّبوا مرة ثانية.") };
      }
      // رسائل الخطأ التقنية (إنجليزي) نخليها جملة واضحة
      if (!res.ok && (!res.msg || !/[\u0600-\u06FF]/.test(res.msg))) res = { ...res, msg: tr("ما انحفظت — جرّبوا مرة ثانية.") };
      patchRow(b.id, i, { done: res });
    }
    if (notesToAdd.length) {
      const { error } = await addItems(notesToAdd.map((n) => ({ comment: n.comment, sectionKey: n.sectionKey })), currentUser.id, project?.id ?? null);
      for (const n of notesToAdd) patchRow(b.id, n.i, { done: error ? { ok: false, msg: tr("ما انحفظت — جرّبوا مرة ثانية.") } : { ok: true, to: "/feedback" } });
    }
    // اللي فشل يقدرون يعيدونه (المحفوظ ما يتكرر)
    setBatches((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: x.rows.some((r) => r.on && r.kind !== "other" && !r.done?.ok) ? "ready" : "saved" } : x)));
  };

  const firstReady = batches.find((b) => b.status === "ready")?.id;

  return (
    <div className="mx-auto max-w-3xl">
      <PageDropOverlay show={over} />
      <section className="dp-hero hg-card">
        <AgentOrb size={72} state={batches.some((b) => b.status === "sorting") ? "thinking" : "idle"} />
        <h1 className="m-0 mt-3 text-[28px] font-extrabold text-[#F2EBE3]">{tr("ارموا أي شي")}</h1>
        <p className="m-0 mt-1.5 max-w-md text-[15px] leading-relaxed text-[#E9D3B8]">{tr("دراسة، رابط دراسة أو صفحة (نفتحه ونلخصه)، صورة سبورة، سكرين شوت من الدكتورة، ملاحظات اجتماع… الوكيل يفهمها ويقترح وين ينحط كل شي، وأنتم توافقون.")}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" className="tc-cream !min-h-[48px]" onClick={() => fileRef.current?.click()} disabled={!canWrite}>
            <FileUp size={18} aria-hidden />
            {tr("اختاروا ملف")}
          </button>
          <button type="button" className="tc-chip !min-h-[48px]" onClick={() => camRef.current?.click()} disabled={!canWrite}>
            <Camera size={18} aria-hidden />
            {tr("صوّروا")}
          </button>
        </div>
        <input ref={fileRef} type="file" multiple hidden accept="application/pdf,.pdf,image/*,.txt,.md,.csv,text/plain" onChange={(e) => (takeFiles(e.target.files), (e.target.value = ""))} />
        <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => (takeFiles(e.target.files), (e.target.value = ""))} />
        <div className="dp-paste">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={tr("أو الصقوا نص أو رابط هنا… (رابط PubMed أو DOI أو أي صفحة، ملاحظات اجتماع، كلام الدكتورة)")} aria-label={tr("الصقوا نص أو رابط")} className="dp-text outline-none" disabled={!canWrite} />
          <button type="button" className="tc-chip shrink-0" onClick={takeText} disabled={text.trim().length < 3}>
            {tr("افرزوها")}
          </button>
        </div>
        <p className="m-0 mt-2 text-[12px] text-[#ABA095]">{tr("PDF، صور (حتى ١٠)، أو نص. وتقدرون ترمونها بأي صفحة بالموقع.")}</p>
        {notes.map((n) => (
          <p key={n} className="m-0 mt-1 text-[13px] text-[#FF8A7A]" role="alert">
            {n}
          </p>
        ))}
      </section>

      {batches.map((b) => (
        <section key={b.id} className="dp-batch hg-card" aria-busy={b.status === "sorting" || b.status === "saving"}>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-extrabold text-[#F2EBE3]" dir="auto">
                {b.name}
              </span>
              <span className="block text-[13px] text-[#ABA095]">
                {b.status === "sorting" ? tr("الوكيل يقرا ويفرز…") : b.status === "failed" ? "" : b.summary || tr("هذا اللي لقيناه")}
              </span>
            </span>
            {b.status === "sorting" && <Loader2 size={20} className="animate-spin text-[#FFC777]" aria-hidden />}
            {(b.status === "failed" || b.status === "saved") && (
              <button type="button" className="sd-x" aria-label={tr("إخفاء")} onClick={() => setBatches((prev) => prev.filter((x) => x.id !== b.id))}>
                <X size={16} />
              </button>
            )}
          </div>
          {b.notes?.map((n) => (
            <p key={n} className="m-0 mt-2 text-[13px] text-[#FFC777]" role="status">
              {n}
            </p>
          ))}
          {b.status === "failed" && (
            <p className="m-0 mt-2 text-[14px] text-[#FF8A7A]" role="alert">
              {b.error}
            </p>
          )}
          {b.rows.length > 0 && (
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {b.rows.map((r, i) => (
                <li key={i} className={clsx("dp-row", !r.on && "off", r.done?.ok && "ok")}>
                  <span className="dp-ic" aria-hidden>
                    {r.done?.ok ? <Check size={18} strokeWidth={3} /> : KIND[r.kind].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[12px] font-bold text-[#FFC777]">
                      {KIND[r.kind].label} ← {destination(r)}
                    </p>
                    <div className="dp-body">{body(r)}</div>
                    {r.done && !r.done.ok && (
                      <p className="m-0 mt-1 text-[13px] text-[#FF8A7A]" role="alert">
                        {r.done.msg || tr("ما انحفظت")}
                      </p>
                    )}
                  </div>
                  {r.done?.ok && r.done.to ? (
                    <Link to={r.done.to} className="sd-act">
                      {tr("افتحوا")}
                    </Link>
                  ) : r.kind !== "other" && b.status === "ready" && !r.done ? (
                    <label className="dp-check">
                      <input type="checkbox" checked={r.on} onChange={(e) => patchRow(b.id, i, { on: e.target.checked })} />
                      <span className="sr-only">{tr("ضمّنوها")}</span>
                    </label>
                  ) : r.kind === "other" ? (
                    <Link to="/files" className="sd-act">
                      {tr("الملفات")}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {(b.status === "ready" || b.status === "saving") && b.rows.some((r) => r.on && r.kind !== "other" && !r.done?.ok) && (
            <button type="button" className={clsx(b.id === firstReady ? "tc-primary" : "tc-cream", "mt-3 w-full sm:w-auto")} onClick={() => save(b)} disabled={b.status === "saving" || !canWrite}>
              {b.status === "saving" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
              {b.status === "saving" ? tr("نحطها…") : tr("حطوها بمكانها ({0})", b.rows.filter((r) => r.on && r.kind !== "other" && !r.done?.ok).length)}
            </button>
          )}
          {b.status === "saved" && <p className="m-0 mt-3 text-[13px] text-[#ABA095]">{tr("خلصنا. افتحوا أي وحدة تتأكدون منها.")}</p>}
        </section>
      ))}
    </div>
  );
}
