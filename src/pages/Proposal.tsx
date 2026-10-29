import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, Check, Eye, FileDown, Paperclip } from "lucide-react";
import AgentWave from "../components/ui/AgentWave";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import QuestionSuggestions from "../components/QuestionSuggestions";
import { useAuth } from "../context/AuthContext";
import { useProposal } from "../hooks/useProposal";
import { useResearchProject } from "../hooks/useResearchProject";
import type { ProposalSectionKey, ResearchProjectStatus, ResearchType } from "../data/types";
import { formatDateLongEn } from "../lib/date";
import WriteHeader, { TYPE_LABEL, V3Glow } from "../components/v3/WriteHeader";
import { EditorCard, SectionRail, WordsSaved } from "../components/v3/WriteKit";
import { usePaperMode } from "../lib/paperMode";
import { useTypingPresence } from "../hooks/useTypingPresence";
import { openAgent, setAgentContext } from "../lib/agentBus";
import { daysUntil } from "../lib/date";
import { isEn, tr } from "../lib/i18n";

/* المقترح البحثي — ترتيب v3 (لوحة «أكتب — المقترح البحثي»): ٣ أعمدة، قسم واحد مفتوح بالمحرر.
   ترتيب واجهة بس: نفس الحقول ونفس طريقة الحفظ (عند الخروج من الحقل) ونفس الجداول. */

const PROPOSAL_ATTACHMENTS_KEY = "nursync.proposalAttachments";

function loadProposalAttachments(): Record<string, AttachedFileMeta> {
  try {
    const raw = localStorage.getItem(PROPOSAL_ATTACHMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AttachedFileMeta>) : {};
  } catch {
    return {};
  }
}

/** نص بالعربي وتحته المصطلح الإنجليزي — بالواجهة الإنجليزية يكفي سطر واحد */
const bi = (ar: string, en: string) => (isEn ? en : ar);


const PROJECT_STATUS: Record<ResearchProjectStatus, string> = {
  planning: "التخطيط",
  active: "جارٍ العمل",
  writing: "الكتابة",
  submitted: "تم التسليم",
};

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** تلميح كل قسم فوق المحرر (والمدى المقترح للكلمات بالذهبي) */
const range = (r: string) => <b className="wf-num">{r}</b>;
const SECTION_HINT: Partial<Record<ProposalSectionKey, () => ReactNode>> = {
  background: () => (
    <>
      {tr("ابدأوا بحجم المشكلة عالميًا، بعدين في السعودية، وآخر شي ليش تهم فئة دراستكم.")} {range("300–500")} {tr("كلمة تكفي.")}
    </>
  ),
  "literature-review": () => (
    <>
      {tr("رتّبوا الدراسات حسب المحاور مو دراسة دراسة، وقارنوا نتائجها: وين تتفق ووين تختلف.")} {range("8–12")} {tr("دراسة حديثة تكفي.")}
    </>
  ),
  problem: () => (
    <>
      {tr("وضّحوا المشكلة بأرقام من الواقع، ووش يصير لو ما انحلّت. فقرة أو فقرتين.")} {range("150–300")} {tr("كلمة.")}
    </>
  ),
  gap: () => <>{tr("اكتبوا اللي نعرفه من الدراسات واللي ما نعرفه، وبعدها الفجوة بجملة وحدة واضحة يطلع منها هدفكم.")}</>,
  aim: () => <>{tr("جملة وحدة تبدأ بـ«تهدف هذه الدراسة إلى…»، وتطلع مباشرة من الفجوة.")}</>,
  questions: () => (
    <>
      {range("2–4")} {tr("أسئلة، كل سؤال يجاوب جزء من الهدف. النوعي يبدأ بـ«كيف» أو «ما تجربة…»، والكمّي يقيس علاقة أو فرق.")}
    </>
  ),
  methodology: () => <>{tr("ملخص قصير للمنهجية هنا — التفاصيل كاملة تنكتب في صفحة «المنهجية».")}</>,
};

/** حقل نصي يُحفظ عند الخروج منه (blur) فقط — نفس السلوك السابق، بشكل v3 */
function AutoSaveTextarea({
  value,
  onSave,
  placeholder,
  rows = 3,
  onDraft,
  className = "",
  label,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder: string;
  rows?: number;
  onDraft?: (draft: string) => void;
  className?: string;
  label?: string;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  // القيمة توصل متأخر (تحميل/تحديث من عضو ثاني): نحدّث المسودة إلا لو المستخدم يكتب فيها الحين
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(value);
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={draft}
      dir="auto"
      aria-label={label}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
        setDraft(e.target.value);
        onDraft?.(e.target.value);
      }}
      onBlur={() => {
        if (draft !== value) onSave(draft);
      }}
      placeholder={placeholder}
      rows={rows}
      className={`v3-field${draft.trim() ? "" : " v3-empty"} ${className}`}
    />
  );
}


export default function Proposal() {
  const { sections, gap, aim, questions, updateSection, updateGap, updateAimStatement, setResearchQuestions } = useProposal();
  const { project, updateProject } = useResearchProject();
  const { canWrite, currentUser } = useAuth();
  const [paper, setPaper] = usePaperMode(currentUser?.id);

  const ordered = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections]);
  const doneCount = ordered.filter((s) => s.status === "done").length;

  // ?section=<key> (من «افتح القسم ←» بالرئيسية) يفتح القسم نفسه مباشرة
  const [searchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState<ProposalSectionKey | null>(() => (searchParams.get("section") as ProposalSectionKey | null) || null);
  // أول ما توصل الأقسام: نفتح أول قسم ما خلص
  useEffect(() => {
    if (ordered.length === 0 || (activeKey && ordered.some((s) => s.key === activeKey))) return;
    setActiveKey((ordered.find((s) => s.status !== "done") ?? ordered[0]).key);
  }, [ordered, activeKey]);
  const activeIdx = Math.max(
    0,
    ordered.findIndex((s) => s.key === activeKey),
  );
  const active = ordered[activeIdx];

  const [sectionAttachments, setSectionAttachments] = useState<Record<string, AttachedFileMeta>>(loadProposalAttachments);
  const attachToSection = (key: string, meta: AttachedFileMeta) => {
    setSectionAttachments((prev) => {
      const updated = { ...prev, [key]: meta };
      localStorage.setItem(PROPOSAL_ATTACHMENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const [savedAt, setSavedAt] = useState<number | null>(null);
  // نفس دوال الحفظ السابقة؛ هنا بس نعرض «انحفظ ✓» لما ترجع بدون خطأ
  const saved = (p: unknown) => {
    Promise.resolve(p).then((r) => {
      if (!(r && typeof r === "object" && "error" in r && (r as { error?: unknown }).error)) setSavedAt(Date.now());
    });
  };

  const [editInfo, setEditInfo] = useState(false);
  const [abstractWords, setAbstractWords] = useState(() => countWords(project?.abstract ?? ""));
  useEffect(() => setAbstractWords(countWords(project?.abstract ?? "")), [project?.abstract]);

  const gapRelated = active && (active.key === "gap" || active.key === "aim" || active.key === "questions");
  const showThread = active && (active.key === "aim" || active.key === "questions");
  const next = ordered[activeIdx + 1];
  // عدد الكلمات و«فلان يكتب الحين» تحت النص
  const typing = useTypingPresence(`proposal:${active?.key ?? ""}`);
  const savedText =
    active?.key === "aim" ? aim.statement : active?.key === "questions" ? questions.map((q) => q.text).join(" ") : active?.key === "gap" ? [gap.whatWeKnow.join(" "), gap.whatWeDontKnow.join(" "), gap.gapStatement, gap.studyConnection].join(" ") : active?.content ?? "";
  const [liveWords, setLiveWords] = useState<{ key: string; n: number } | null>(null);
  const words = liveWords && liveWords.key === active?.key ? liveWords.n : countWords(savedText);
  const onWriting = (d: string) => {
    if (active && active.key !== "gap") setLiveWords({ key: active.key, n: countWords(d) });
    typing.ping();
  };

  const markDoneAndNext = async () => {
    if (!active) return;
    saved(updateSection(active.key, { status: "done" }));
    if (next) setActiveKey(next.key);
  };

  const draftPrompt = () => {
    if (!active) return;
    const name = bi(active.labelAr, active.labelEn);
    const gapText = gap.gapStatement.trim();
    openAgent(
      gapText && showThread
        ? tr("اكتب لي مسودة لقسم «{0}» تطلع من الفجوة البحثية هذي: «{1}»", name, gapText)
        : tr("ساعدني أكتب مسودة لقسم «{0}» في مقترحنا البحثي", name),
    );
  };

  const supervisor = project?.supervisorName?.trim();
  const daysLeft = project?.targetSubmissionDate ? daysUntil(project.targetSubmissionDate) : null;
  // «الكوتش · القسم المفتوح» جنب كرة الوكيل
  const activeLabel = active ? bi(active.labelAr, active.labelEn) : null;
  useEffect(() => {
    setAgentContext(activeLabel);
    return () => setAgentContext(null);
  }, [activeLabel]);

  const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

  const threadCard = (title: string, en: string, body: string, variant: "plain" | "gap" | "aim", emptyText: string) => (
    <div
      className={`min-w-0 rounded-[18px] px-3.5 py-3 ${variant === "aim" ? "v3-glow" : ""}`}
      style={
        variant === "gap"
          ? { border: "1px solid rgba(255,180,68,.5)", background: "linear-gradient(180deg,rgba(255,150,40,.16),rgba(255,150,40,.04))" }
          : variant === "aim"
            ? { border: "1.5px dashed rgba(255,180,68,.6)" }
            : { border: "1px solid rgba(255,255,255,.1)" }
      }
    >
      <div className="text-sm font-bold">{title}</div>
      {!isEn && <div className="v3-en">{en}</div>}
      <p className="mt-1.5 line-clamp-4 text-[13px] leading-relaxed" dir="auto" style={{ color: body ? "var(--ws-c-text)" : variant === "aim" ? "var(--ws-c-muted)" : "var(--ws-c-muted)" }}>
        {body || emptyText}
      </p>
    </div>
  );

  return (
    <div className="v3 relative">
      {/* ── للطباعة/تصدير PDF فقط: المستند كامل بالترتيب، مثل قبل ── */}
      <div className="hidden text-black print:block" dir="ltr" lang="en">
        <h1 className="text-2xl font-extrabold">{project?.title || "Research Proposal"}</h1>
        {project?.description && <p className="mt-1 text-sm">{project.description}</p>}
        <p className="mt-3 text-xs">{`Exported ${formatDateLongEn(new Date().toISOString().slice(0, 10))} — Wesync`}</p>
        <div className="my-4 border-t" />
        {project?.abstract?.trim() && (
          <section className="mb-4 break-inside-avoid">
            <h2 className="font-bold">Abstract</h2>
            <p className="whitespace-pre-wrap text-sm">{project.abstract}</p>
          </section>
        )}
        {ordered.map((s) => (
          <section key={s.key} className="mb-4 break-inside-avoid">
            <h2 className="font-bold">{s.labelEn}</h2>
            {s.content.trim() && <p className="whitespace-pre-wrap text-sm">{s.content}</p>}
            {s.key === "gap" && (
              <div className="text-sm">
                {gap.whatWeKnow.length > 0 && <p>What we know: {gap.whatWeKnow.join("; ")}</p>}
                {gap.whatWeDontKnow.length > 0 && <p>What we don't know: {gap.whatWeDontKnow.join("; ")}</p>}
                {gap.gapStatement && <p className="whitespace-pre-wrap">Research gap: {gap.gapStatement}</p>}
                {gap.studyConnection && <p className="whitespace-pre-wrap">Our study: {gap.studyConnection}</p>}
              </div>
            )}
            {s.key === "aim" && aim.statement && <p className="whitespace-pre-wrap text-sm">{aim.statement}</p>}
            {s.key === "questions" && questions.length > 0 && (
              <ol className="list-decimal ps-5 text-sm">
                {questions.map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      <div className="relative print:hidden">
        <V3Glow />
        <WriteHeader fallbackTitle={tr("المقترح البحثي")} style={rise(0)} live={{ proposal: doneCount }} />

        <div className="relative grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* ١) قائمة الأقسام */}
          <SectionRail
            title={tr("أقسام المقترح")}
            items={ordered.map((s) => ({ key: s.key, label: bi(s.labelAr, s.labelEn), en: s.labelEn, done: s.status === "done" }))}
            activeKey={active?.key}
            onPick={(k) => setActiveKey(k as ProposalSectionKey)}
            style={rise(1)}
            footer={
              <>
                <Link to="/proposal/export" className="wf-gb">
                  <Eye size={16} aria-hidden />
                  {tr("المستند كامل")}
                </Link>
                <button type="button" className="wf-gb" onClick={() => window.print()}>
                  <FileDown size={16} aria-hidden />
                  {tr("صدّر PDF")}
                </button>
              </>
            }
          />

          {/* ٢) المحرر + الملخص ومعلومات البحث */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            {active && (
              <EditorCard
                index={activeIdx + 1}
                total={ordered.length}
                title={bi(active.labelAr, active.labelEn)}
                en={active.labelEn}
                paper={paper}
                onPaper={setPaper}
                hint={SECTION_HINT[active.key]?.()}
                style={rise(2)}
                titleId="v3-sec-title"
              >
                {/* خيط الفجوة: ٤ بطاقات تتعبّى من قسم الفجوة */}
                {gapRelated && (
                  <div className="ws-paper-only flex-wrap gap-2">
                    {gap.gapStatement.trim() && <span className="ws-paper-chip" dir="auto">{tr("الفجوة: {0}", gap.gapStatement.trim().length > 90 ? `${gap.gapStatement.trim().slice(0, 90)}…` : gap.gapStatement.trim())}</span>}
                    {!gap.connectsToAim && <span className="ws-paper-chip warn">{tr("الهدف لازم يطلع من الفجوة")}</span>}
                  </div>
                )}
                {showThread && (
                  <div className="ws-dark-only grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {threadCard(tr("اللي نعرفه"), "What we know", gap.whatWeKnow.join("، "), "plain", tr("لسا ما انكتب — من قسم الفجوة"))}
                    {threadCard(tr("اللي ما نعرفه"), "What we don't know", gap.whatWeDontKnow.join("، "), "plain", tr("لسا ما انكتب — من قسم الفجوة"))}
                    {threadCard(tr("الفجوة"), "Research Gap", gap.gapStatement, "gap", tr("اكتبوا الفجوة أول من قسم «الفجوة المعرفية»"))}
                    {threadCard(tr("هدفنا"), "Aim", active.key === "questions" ? aim.statement : "", "aim", active.key === "questions" ? tr("اكتبوا الهدف أول") : tr("هنا تكتبونه ← مربوط بالفجوة"))}
                  </div>
                )}

                {/* المحرر حسب القسم — نفس الحقول السابقة */}
                <div key={active.key} className="flex flex-col gap-3">
                  {active.key === "gap" ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="wf-fld !mt-0">
                          <span className="wf-lbl">
                            {tr("اللي نعرفه")} {!isEn && <span className="font-normal">· What we know</span>}
                          </span>
                          <AutoSaveTextarea value={gap.whatWeKnow.join("\n")} onSave={(v) => saved(updateGap({ whatWeKnow: v.split("\n").filter(Boolean) }))} placeholder={tr("سطر لكل نقطة...")} rows={4} className="wf-ed sm" />
                        </label>
                        <label className="wf-fld !mt-0">
                          <span className="wf-lbl">
                            {tr("اللي ما نعرفه")} {!isEn && <span className="font-normal">· What we don't know</span>}
                          </span>
                          <AutoSaveTextarea value={gap.whatWeDontKnow.join("\n")} onSave={(v) => saved(updateGap({ whatWeDontKnow: v.split("\n").filter(Boolean) }))} placeholder={tr("سطر لكل نقطة...")} rows={4} className="wf-ed sm" />
                        </label>
                      </div>
                      <label className="wf-fld !mt-0">
                        <span className="wf-lbl">
                          {tr("الفجوة")} {!isEn && <span className="font-normal">· Research Gap</span>}
                        </span>
                        <AutoSaveTextarea value={gap.gapStatement} onSave={(v) => saved(updateGap({ gapStatement: v }))} placeholder={tr("اكتبوا صياغة الفجوة البحثية هنا...")} className="wf-ed sm !shadow-[inset_0_0_0_1.5px_rgba(255,180,68,.45)]" />
                      </label>
                      <label className="wf-fld !mt-0">
                        <span className="wf-lbl">
                          {tr("وش بتدرسون أنتم")} {!isEn && <span className="font-normal">· Your Study</span>}
                        </span>
                        <AutoSaveTextarea value={gap.studyConnection} onSave={(v) => saved(updateGap({ studyConnection: v }))} placeholder={tr("كيف تربط دراستكم بهذي الفجوة؟")} className="wf-ed sm" />
                      </label>
                    </>
                  ) : active.key === "aim" ? (
                    <AutoSaveTextarea
                      label={tr("هدف الدراسة")}
                      value={aim.statement}
                      onSave={(v) => saved(updateAimStatement(v))}
                      onDraft={onWriting}
                      placeholder={tr("اكتبوا هدف الدراسة… مثال: «تستكشف هذه الدراسة تجربة … خلال …»")}
                      rows={5}
                      className="wf-ed !min-h-[180px]"
                    />
                  ) : active.key === "questions" ? (
                    <>
                      <AutoSaveTextarea
                        label={tr("أسئلة البحث")}
                        key={questions.map((q) => q.text).join("|")}
                        value={questions.map((q) => q.text).join("\n")}
                        onSave={(v) => saved(setResearchQuestions(v.split("\n").filter(Boolean)))}
                        onDraft={onWriting}
                        placeholder={tr("سؤال بحث واحد بكل سطر...")}
                        rows={5}
                        className="wf-ed !min-h-[180px]"
                      />
                      <QuestionSuggestions
                        topic={project?.title ?? ""}
                        existing={questions.map((q) => q.text)}
                        canWrite={canWrite}
                        onAdd={(text) => saved(setResearchQuestions([...questions.map((q) => q.text), text]))}
                      />
                    </>
                  ) : (
                    <AutoSaveTextarea
                      label={bi(active.labelAr, active.labelEn)}
                      value={active.content}
                      onSave={(content) => saved(updateSection(active.key, { content }))}
                      onDraft={onWriting}
                      placeholder={tr("اكتبوا {0} هنا…", bi(active.labelAr, active.labelEn))}
                      rows={10}
                      className="wf-ed"
                    />
                  )}

                  {/* نص القسم الإضافي لأقسام الفجوة/الهدف/الأسئلة — كان حقل مستقل بقائمة الأقسام، باقي ومحفوظ */}
                  {gapRelated && (
                    <details open={!!active.content.trim()} className="v3-g2 px-4 py-2">
                      <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-bold">{tr("ملاحظات القسم (اختياري)")}</summary>
                      <AutoSaveTextarea value={active.content} onSave={(content) => saved(updateSection(active.key, { content }))} placeholder={tr("اكتبوا محتوى هذا القسم هنا...")} className="wf-ed sm mb-2" />
                    </details>
                  )}
                </div>

                {sectionAttachments[active.key] && (
                  <p className="m-0 flex items-center gap-1.5 text-xs text-[var(--ws-c-muted)]">
                    <Paperclip size={12} />
                    <bdi className="truncate">{sectionAttachments[active.key].name}</bdi>
                  </p>
                )}

                <div className="ws-write-foot flex flex-wrap items-center gap-2.5">
                  <WordsSaved
                    words={words}
                    extra={
                      typing.names.length > 0 ? (
                        <> · {typing.names.length === 1 ? tr("{0} يكتب الحين", typing.names[0]) : tr("{0} يكتبون الحين", typing.names.join(tr(" و")))}</>
                      ) : savedAt ? (
                        <span className="text-[#7FE0A6]"> ✓</span>
                      ) : null
                    }
                  />
                  <span className="flex-1" />
                  {canWrite && !sectionAttachments[active.key] && <FileAttach compact onAttach={(m) => attachToSection(active.key, m)} buttonClassName="wf-gb" />}
                  <button type="button" className="wf-gb" onClick={draftPrompt}>
                    <AgentWave size={15} />
                    {showThread ? tr("اكتب لي مسودة من الفجوة") : tr("اكتب لي مسودة")}
                  </button>
                  {canWrite &&
                    (active.status === "done" ? (
                      <button type="button" className="wf-gb" onClick={() => saved(updateSection(active.key, { status: "in-progress" }))}>
                        <Check size={15} aria-hidden />
                        {tr("خلص · رجّعه للكتابة")}
                      </button>
                    ) : (
                      <button type="button" className="wf-pr" onClick={markDoneAndNext} disabled={words === 0}>
                        {tr("علّمه خلص ←")}
                      </button>
                    ))}
                </div>
              </EditorCard>
            )}

            {/* تحذير الفجوة الموجود — بطاقة تحت المحرر */}
            {gapRelated && !gap.connectsToAim && (
              <div className="hg-card flex flex-wrap items-center gap-3.5 !py-4" style={{ ...rise(3), boxShadow: "inset 0 0 0 1px rgba(255,138,122,.3), 0 30px 70px rgba(0,0,0,.45)" }} role="note">
                <AlertCircle size={22} color="#FF8A7A" className="shrink-0" />
                <div className="min-w-[200px] flex-1">
                  <div className="font-bold">{tr("الهدف لازم يطلع من الفجوة")}</div>
                  <div className="text-sm text-[#ABA095]">{tr("الفجوة البحثية لسا ما ترتبط بوضوح بهدف الدراسة. صيغوا الفجوة بشكل نهائي أول، وبعدها اكتبوا الهدف منها.")}</div>
                </div>
                {active?.key !== "gap" && (
                  <button type="button" className="wf-gb" onClick={() => setActiveKey("gap")}>
                    {tr("وريني الفجوة")}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
              {/* الملخص */}
              <section className="hg-card flex flex-col" style={rise(4)} aria-labelledby="abs-title">
                <div className="flex items-baseline gap-2">
                  <h3 id="abs-title" className="m-0 text-[18px] font-extrabold">
                    {tr("الملخص")}
                  </h3>
                  {!isEn && <span className="text-xs text-[#ABA095]" dir="ltr">Abstract</span>}
                  <span className="ms-auto text-xs" style={{ color: abstractWords >= 150 && abstractWords <= 250 ? "#7FE0A6" : "#ABA095" }}>
                    {abstractWords > 0 && (
                      <>
                        <span className="wf-num">{abstractWords}</span> /{" "}
                      </>
                    )}
                    <span className="wf-num">150–250</span> {tr("كلمة")}
                  </span>
                </div>
                <div className="mt-0.5 text-[13px] text-[#ABA095]">{tr("نكتبه آخر شي، بعد ما تخلص الأقسام.")}</div>
                <AutoSaveTextarea
                  label={tr("الملخص")}
                  value={project?.abstract ?? ""}
                  onSave={(v) => saved(updateProject({ abstract: v }))}
                  onDraft={(d) => setAbstractWords(countWords(d))}
                  placeholder={tr("الخلفية، هدف الدراسة، المنهج، والخلاصة…")}
                  rows={4}
                  className="wf-ed sm mt-3"
                />
              </section>

              {/* معلومات البحث */}
              <section className="hg-card flex flex-col" style={rise(5)} aria-labelledby="info-title">
                <div className="flex items-center">
                  <h3 id="info-title" className="m-0 text-[18px] font-extrabold">
                    {tr("معلومات البحث")}
                  </h3>
                  {canWrite && (
                    <button type="button" className="ms-auto min-h-[44px] px-1 text-[13px] font-bold text-[#FFC777]" onClick={() => setEditInfo((v) => !v)} aria-expanded={editInfo}>
                      {editInfo ? tr("تم") : tr("عدّل")}
                    </button>
                  )}
                </div>
                {!editInfo ? (
                  <div className="mt-2">
                    <div className="wf-kv">
                      <span>{tr("المشرف/ة")}</span>
                      <b dir="auto">{supervisor || "—"}</b>
                    </div>
                    <div className="wf-kv">
                      <span>{tr("نوع البحث")}</span>
                      <b>
                        {project?.researchType ? (
                          <>
                            {TYPE_LABEL[project.researchType][0]} · <bdi>{TYPE_LABEL[project.researchType][1]}</bdi>
                          </>
                        ) : (
                          "—"
                        )}
                      </b>
                    </div>
                    <div className="wf-kv">
                      <span>{tr("المرحلة")}</span>
                      <b>{tr(PROJECT_STATUS[project?.status ?? "planning"])}</b>
                    </div>
                    <div className="wf-kv">
                      <span>{tr("التسليم")}</span>
                      <b>
                        {daysLeft === null ? (
                          "—"
                        ) : daysLeft < 0 ? (
                          tr("فات الموعد")
                        ) : (
                          <>
                            {tr("بعد")} <span className="wf-num">{daysLeft}</span> {tr("يوم")}
                          </>
                        )}
                      </b>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col gap-1">
                    <label className="wf-fld !mt-2">
                      <span className="wf-lbl">
                        {tr("اسم المشرف/ة")} {!isEn && "· Supervisor"}
                      </span>
                      <input
                        defaultValue={project?.supervisorName ?? ""}
                        dir="auto"
                        onBlur={(e) => {
                          if (e.target.value !== (project?.supervisorName ?? "")) saved(updateProject({ supervisorName: e.target.value }));
                        }}
                        placeholder={tr("اسم المشرف/ة")}
                        className="wf-fin"
                      />
                    </label>
                    <label className="wf-fld !mt-2">
                      <span className="wf-lbl">
                        {tr("نوع البحث")} {!isEn && "· Research Type"}
                      </span>
                      <select value={project?.researchType ?? ""} onChange={(e) => saved(updateProject({ researchType: e.target.value as ResearchType }))} className="wf-fin">
                        <option value="">{tr("اختاروا النوع")}</option>
                        {(Object.keys(TYPE_LABEL) as Exclude<ResearchType, "">[]).map((k) => (
                          <option key={k} value={k}>
                            {`${TYPE_LABEL[k][0]} — ${TYPE_LABEL[k][1]}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="wf-fld !mt-2">
                      <span className="wf-lbl">
                        {tr("المرحلة")} {!isEn && "· Project Status"}
                      </span>
                      <select value={project?.status ?? "planning"} onChange={(e) => saved(updateProject({ status: e.target.value as ResearchProjectStatus }))} className="wf-fin">
                        {(Object.keys(PROJECT_STATUS) as ResearchProjectStatus[]).map((k) => (
                          <option key={k} value={k}>
                            {tr(PROJECT_STATUS[k])}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
