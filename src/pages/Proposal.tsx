import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, Eye, FileDown, Paperclip, Sparkles } from "lucide-react";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import QuestionSuggestions from "../components/QuestionSuggestions";
import { useAuth } from "../context/AuthContext";
import { useProposal } from "../hooks/useProposal";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import type { ProposalSectionKey, ResearchProjectStatus, ResearchType, SectionStatus } from "../data/types";
import { daysUntil, formatDateLongEn } from "../lib/date";
import { openAgent } from "../lib/agentBus";
import { isEn, tr, trx } from "../lib/i18n";

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

const STATUS: Record<SectionStatus, { label: () => string; cls: string }> = {
  done: { label: () => tr("خلص"), cls: "done" },
  "in-progress": { label: () => tr("نكتبه"), cls: "doing" },
  "not-started": { label: () => tr("ما بدأ"), cls: "todo" },
};

const TYPE_LABEL: Record<Exclude<ResearchType, "">, [string, string]> = {
  quantitative: ["كمّي", "Quantitative"],
  qualitative: ["نوعي", "Qualitative"],
  "mixed-methods": ["مختلط", "Mixed methods"],
};
const PROJECT_STATUS: Record<ResearchProjectStatus, string> = {
  planning: "التخطيط",
  active: "جارٍ العمل",
  writing: "الكتابة",
  submitted: "تم التسليم",
};

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

const CheckSvg = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

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

/** «انحفظ تلقائيًا قبل ثواني ✓» — يتحدّث مع الوقت */
function SavedNote({ at }: { at: number | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);
  if (!at) return <span className="v3-mut text-[13px]">{tr("يحفظ تلقائيًا لما تطلعون من الحقل")}</span>;
  const min = Math.floor((Date.now() - at) / 60000);
  return (
    <span key={at} className="v3-saved text-[13px] text-[#7FE0A6]" role="status">
      {min < 1 ? tr("انحفظ تلقائيًا قبل ثواني") : trx("انحفظ تلقائيًا قبل {0} د", min)}
      <CheckSvg />
    </span>
  );
}

export default function Proposal() {
  const { sections, gap, aim, questions, updateSection, updateGap, updateAimStatement, setResearchQuestions } = useProposal();
  const { project, updateProject } = useResearchProject();
  const { canWrite } = useAuth();
  const { roster } = useTeamRoster();
  const memberById = (id: string) => roster.find((m) => m.id === id);

  const ordered = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections]);
  const doneCount = ordered.filter((s) => s.status === "done").length;
  const pct = ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0;

  const [activeKey, setActiveKey] = useState<ProposalSectionKey | null>(null);
  // أول ما توصل الأقسام: نفتح أول قسم ما خلص
  useEffect(() => {
    if (activeKey || ordered.length === 0) return;
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

  const owner = active ? memberById(active.ownerId) : undefined;
  const supervisor = project?.supervisorName?.trim();
  const typeLabel = project?.researchType ? bi(...TYPE_LABEL[project.researchType]) : "";
  const daysLeft = project?.targetSubmissionDate ? daysUntil(project.targetSubmissionDate) : null;
  const meta = [
    typeLabel,
    supervisor ? tr("المشرف/ة {0}", supervisor) : "",
    daysLeft !== null && daysLeft >= 0 ? tr("التسليم بعد {0} يوم", daysLeft.toLocaleString(isEn ? "en" : "ar-EG")) : "",
  ].filter(Boolean);

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
      <p className="mt-1.5 line-clamp-4 text-[13px] leading-relaxed" dir="auto" style={{ color: body ? "#CFC6BE" : variant === "aim" ? "#FFB444" : "#776C63" }}>
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
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-[32px]">
          <div className="v3-blob" style={{ width: 700, height: 520, insetInlineEnd: -260, top: -320, background: "#D9380A", opacity: 0.32 }} />
          <div className="v3-blob alt" style={{ width: 420, height: 300, insetInlineEnd: 60, top: -160, background: "#FFD25A", opacity: 0.18, filter: "blur(110px)" }} />
        </div>

        {/* الترويسة */}
        <header className="v3-rise relative mb-5 min-w-0" style={rise(0)}>
          <div className="v3-eye">{tr("رحلة البحث · أكتب")}</div>
          <h1 className="v3-k m-0 text-[24px] leading-snug sm:text-[30px]" dir="auto">
            {project?.title?.trim() || tr("المقترح البحثي")}
          </h1>
          {meta.length > 0 && <p className="v3-mut m-0 text-sm">{meta.join(" · ")}</p>}
        </header>

        <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_270px]">
          {/* ١) عمود الأقسام */}
          <nav aria-label={tr("أقسام المقترح")} className="v3-g v3-rise min-w-0 self-start p-4 lg:row-span-2 xl:row-span-1" style={rise(1)}>
            <div className="flex items-center gap-3.5 px-1.5 pb-3.5">
              <div className="v3-ring h-14 w-14 lg:h-16 lg:w-16" style={{ ["--v3-target" as string]: `${pct}%` }} role="img" aria-label={tr("{0}٪ مكتمل", pct)} />
              <div>
                <div className="v3-k text-lg">{tr("المقترح البحثي")}</div>
                <div className="v3-mut text-[13px]">{trx("{0} من {1} أقسام خلصت", doneCount.toLocaleString(isEn ? "en" : "ar-EG"), ordered.length.toLocaleString(isEn ? "en" : "ar-EG"))}</div>
              </div>
            </div>

            {/* جوال: شريط أفقي ينسحب */}
            <div className="v3-scroll-x -mx-1 flex gap-2 px-1 pb-1 lg:hidden">
              {ordered.map((s, i) => {
                const on = s.key === active?.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActiveKey(s.key)}
                    aria-current={on ? "step" : undefined}
                    className="v3-tap flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-3 text-sm font-bold"
                    style={on ? { background: "rgba(255,140,40,.18)", border: "1px solid rgba(255,180,68,.45)" } : { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                      style={s.status === "done" ? { background: "#7FE0A6", color: "#0b2015" } : on ? { background: "#F6F1EC", color: "#160904" } : { border: "1.5px solid rgba(255,255,255,.22)", color: "#CFC6BE" }}
                    >
                      {s.status === "done" ? <CheckSvg size={13} /> : (i + 1).toLocaleString(isEn ? "en" : "ar-EG")}
                    </span>
                    {bi(s.labelAr, s.labelEn)}
                  </button>
                );
              })}
            </div>

            {/* كمبيوتر: قائمة عمودية */}
            <ol className="m-0 hidden list-none flex-col gap-1 p-0 lg:flex">
              {ordered.map((s, i) => {
                const on = s.key === active?.key;
                const st = STATUS[s.status];
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setActiveKey(s.key)}
                      aria-current={on ? "step" : undefined}
                      className={`v3-tap flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start ${on ? "v3-sheen" : "hover:bg-white/[0.04]"}`}
                      style={on ? { background: "rgba(255,140,40,.14)", border: "1px solid rgba(255,180,68,.35)" } : { border: "1px solid transparent" }}
                    >
                      {s.status === "done" ? (
                        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: "#7FE0A6", color: "#0b2015" }}>
                          <CheckSvg />
                        </span>
                      ) : (
                        <span
                          className="v3-k flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[13px]"
                          style={on ? { background: "#F6F1EC", color: "#160904" } : { border: "1.5px solid rgba(255,255,255,.22)", color: "#CFC6BE" }}
                        >
                          {(i + 1).toLocaleString(isEn ? "en" : "ar-EG")}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[15px] font-bold">{bi(s.labelAr, s.labelEn)}</span>
                        {!isEn && <span className="v3-en block">{s.labelEn}</span>}
                      </span>
                      <span className={`v3-st ${st.cls}`}>{st.label()}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-3 flex flex-col gap-2">
              <button type="button" className="v3-bw" onClick={() => window.print()}>
                <FileDown size={16} />
                {tr("صدّر PDF")}
              </button>
              <Link to="/proposal/export" className="v3-bd">
                <Eye size={16} />
                {tr("شوف المستند كامل")}
              </Link>
            </div>
          </nav>

          {/* ٢) المحرر — قسم واحد */}
          <div className="flex min-w-0 flex-col gap-4">
            {active && (
              <section className="v3-g v3-rise flex flex-col gap-4 p-5 sm:px-6 sm:py-[22px]" style={rise(2)} aria-labelledby="v3-sec-title">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="v3-eye">{trx("القسم {0} من {1}", (activeIdx + 1).toLocaleString(isEn ? "en" : "ar-EG"), ordered.length.toLocaleString(isEn ? "en" : "ar-EG"))}</div>
                    <h2 id="v3-sec-title" className="v3-k m-0 text-[22px] sm:text-[26px]">
                      {bi(active.labelAr, active.labelEn)}
                    </h2>
                    {!isEn && <div className="v3-en text-[13px]">{active.labelEn}</div>}
                  </div>
                  <label className={`v3-st ${STATUS[active.status].cls} relative min-h-[32px] cursor-pointer`}>
                    <span className="sr-only">{tr("حالة القسم")}</span>
                    {STATUS[active.status].label()}
                    <select
                      value={active.status}
                      disabled={!canWrite}
                      onChange={(e) => saved(updateSection(active.key, { status: e.target.value as SectionStatus }))}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    >
                      {(Object.keys(STATUS) as SectionStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS[s].label()}
                        </option>
                      ))}
                    </select>
                  </label>
                  {owner && (
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-bold" style={{ background: "#FFC85A", color: "#1A0A02" }}>
                        {owner.initials}
                      </span>
                      <span className="text-[13px]">{owner.name.split(" ")[0]}</span>
                    </div>
                  )}
                </div>

                {/* خيط الفجوة: ٤ بطاقات تتعبّى من قسم الفجوة */}
                {showThread && (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">
                            {tr("اللي نعرفه")} {!isEn && <span className="v3-en font-normal">· What we know</span>}
                          </span>
                          <AutoSaveTextarea value={gap.whatWeKnow.join("\n")} onSave={(v) => saved(updateGap({ whatWeKnow: v.split("\n").filter(Boolean) }))} placeholder={tr("سطر لكل نقطة...")} rows={4} />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">
                            {tr("اللي ما نعرفه")} {!isEn && <span className="v3-en font-normal">· What we don't know</span>}
                          </span>
                          <AutoSaveTextarea value={gap.whatWeDontKnow.join("\n")} onSave={(v) => saved(updateGap({ whatWeDontKnow: v.split("\n").filter(Boolean) }))} placeholder={tr("سطر لكل نقطة...")} rows={4} />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-[#FFB444]">
                          {tr("الفجوة")} {!isEn && <span className="v3-en font-normal">· Research Gap</span>}
                        </span>
                        <AutoSaveTextarea value={gap.gapStatement} onSave={(v) => saved(updateGap({ gapStatement: v }))} placeholder={tr("اكتبوا صياغة الفجوة البحثية هنا...")} className="!border-[rgba(255,180,68,.45)]" />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold">
                          {tr("وش بتدرسون أنتم")} {!isEn && <span className="v3-en font-normal">· Your Study</span>}
                        </span>
                        <AutoSaveTextarea value={gap.studyConnection} onSave={(v) => saved(updateGap({ studyConnection: v }))} placeholder={tr("كيف تربط دراستكم بهذي الفجوة؟")} />
                      </label>
                    </>
                  ) : active.key === "aim" ? (
                    <AutoSaveTextarea
                      label={tr("هدف الدراسة")}
                      value={aim.statement}
                      onSave={(v) => saved(updateAimStatement(v))}
                      placeholder={tr("اكتبوا هدف الدراسة… مثال: «تستكشف هذه الدراسة تجربة … خلال …»")}
                      rows={5}
                      className="min-h-[120px]"
                    />
                  ) : active.key === "questions" ? (
                    <>
                      <AutoSaveTextarea
                        label={tr("أسئلة البحث")}
                        key={questions.map((q) => q.text).join("|")}
                        value={questions.map((q) => q.text).join("\n")}
                        onSave={(v) => saved(setResearchQuestions(v.split("\n").filter(Boolean)))}
                        placeholder={tr("سؤال بحث واحد بكل سطر...")}
                        rows={5}
                        className="min-h-[120px]"
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
                      placeholder={tr("اكتبوا محتوى هذا القسم هنا...")}
                      rows={8}
                      className="min-h-[160px]"
                    />
                  )}

                  {/* نص القسم الإضافي لأقسام الفجوة/الهدف/الأسئلة — كان حقل مستقل بقائمة الأقسام، باقي ومحفوظ */}
                  {gapRelated && (
                    <details open={!!active.content.trim()} className="v3-g2 px-4 py-2">
                      <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-bold">{tr("ملاحظات القسم (اختياري)")}</summary>
                      <AutoSaveTextarea value={active.content} onSave={(content) => saved(updateSection(active.key, { content }))} placeholder={tr("اكتبوا محتوى هذا القسم هنا...")} className="mb-2" />
                    </details>
                  )}
                </div>

                {sectionAttachments[active.key] && (
                  <p className="m-0 flex items-center gap-1.5 text-xs text-[#FFB444]">
                    <Paperclip size={12} />
                    <bdi className="truncate">{sectionAttachments[active.key].name}</bdi>
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                  {canWrite && !sectionAttachments[active.key] && (
                    <FileAttach compact onAttach={(m) => attachToSection(active.key, m)} buttonClassName="v3-bd !text-sm" />
                  )}
                  <button type="button" className="v3-bd !text-sm" onClick={draftPrompt}>
                    <Sparkles size={15} color="#FFB444" />
                    {showThread ? tr("اكتب لي مسودة من الفجوة") : tr("اكتب لي مسودة")}
                  </button>
                  <span className="ms-auto">
                    <SavedNote at={savedAt} />
                  </span>
                  {canWrite && (
                    <button type="button" className="v3-bw !text-sm" onClick={markDoneAndNext} disabled={active.status === "done" && !next}>
                      {next ? tr("علّمه خلص وانتقل للقسم الجاي ←") : tr("علّمه خلص")}
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* تحذير الفجوة الموجود — بطاقة تحت المحرر */}
            {gapRelated && !gap.connectsToAim && (
              <div
                className="v3-g v3-rise flex flex-wrap items-center gap-3.5 px-5 py-4"
                style={{ ...rise(3), borderColor: "rgba(255,138,122,.3)", background: "linear-gradient(180deg,rgba(255,120,100,.08),rgba(255,255,255,.02)),rgba(14,10,8,.72)" }}
                role="note"
              >
                <AlertCircle size={22} color="#FF8A7A" className="shrink-0" />
                <div className="min-w-[200px] flex-1">
                  <div className="font-bold">{tr("الهدف لازم يطلع من الفجوة")}</div>
                  <div className="v3-mut text-sm">{tr("الفجوة البحثية لسا ما ترتبط بوضوح بهدف الدراسة. صيغوا الفجوة بشكل نهائي أول، وبعدها اكتبوا الهدف منها.")}</div>
                </div>
                {active?.key !== "gap" && (
                  <button type="button" className="v3-bd !text-sm" onClick={() => setActiveKey("gap")}>
                    {tr("وريني الفجوة")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ٣) العمود الجانبي */}
          <aside className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:col-start-2 xl:col-start-auto xl:grid-cols-1">
            <div className="v3-g v3-hover v3-rise flex flex-col gap-3 p-[18px]" style={rise(4)}>
              <div className="v3-k text-base">{tr("معلومات البحث")}</div>
              {!editInfo ? (
                <>
                  <div>
                    <div className="v3-mut text-xs">{tr("المشرف/ة")}</div>
                    <div className="text-[15px] font-bold" dir="auto">
                      {supervisor || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="v3-mut text-xs">{tr("نوع البحث")}</div>
                    <div className="text-[15px] font-bold">{project?.researchType ? `${TYPE_LABEL[project.researchType][0]} · ${TYPE_LABEL[project.researchType][1]}` : "—"}</div>
                  </div>
                  <div>
                    <div className="v3-mut text-xs">{tr("الحالة")}</div>
                    <div className="text-[15px] font-bold">{tr(PROJECT_STATUS[project?.status ?? "planning"])}</div>
                  </div>
                  {canWrite && (
                    <button type="button" className="v3-link self-start" onClick={() => setEditInfo(true)}>
                      {tr("عدّل المعلومات")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="v3-mut text-xs">{tr("اسم المشرف/ة")} {!isEn && "· Supervisor"}</span>
                    <input
                      defaultValue={project?.supervisorName ?? ""}
                      dir="auto"
                      onBlur={(e) => {
                        if (e.target.value !== (project?.supervisorName ?? "")) saved(updateProject({ supervisorName: e.target.value }));
                      }}
                      placeholder={tr("اسم المشرف/ة")}
                      className="v3-select"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="v3-mut text-xs">{tr("نوع البحث")} {!isEn && "· Research Type"}</span>
                    <select value={project?.researchType ?? ""} onChange={(e) => saved(updateProject({ researchType: e.target.value as ResearchType }))} className="v3-select">
                      <option value="">{tr("اختاروا النوع")}</option>
                      {(Object.keys(TYPE_LABEL) as Exclude<ResearchType, "">[]).map((k) => (
                        <option key={k} value={k}>
                          {`${TYPE_LABEL[k][0]} — ${TYPE_LABEL[k][1]}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="v3-mut text-xs">{tr("الحالة")} {!isEn && "· Project Status"}</span>
                    <select value={project?.status ?? "planning"} onChange={(e) => saved(updateProject({ status: e.target.value as ResearchProjectStatus }))} className="v3-select">
                      {(Object.keys(PROJECT_STATUS) as ResearchProjectStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {tr(PROJECT_STATUS[k])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="v3-bd self-start !text-sm" onClick={() => setEditInfo(false)}>
                    <Check size={15} />
                    {tr("تم")}
                  </button>
                </>
              )}
            </div>

            <div className="v3-g v3-hover v3-rise flex flex-col gap-2.5 p-[18px]" style={rise(5)}>
              <div className="v3-k text-base">
                {tr("الملخص")} {!isEn && <span className="v3-mut text-xs font-normal">· Abstract</span>}
              </div>
              <div className="v3-mut text-[13px]">{tr("١٥٠–٢٥٠ كلمة. نكتبه آخر شي بعد ما تخلص الأقسام.")}</div>
              <AutoSaveTextarea
                label={tr("الملخص")}
                value={project?.abstract ?? ""}
                onSave={(v) => saved(updateProject({ abstract: v }))}
                onDraft={(d) => setAbstractWords(countWords(d))}
                placeholder={tr("اكتبوا ملخصًا يغطي: الخلفية، هدف الدراسة، المنهج، والخلاصة.")}
                rows={4}
              />
              <div className="v3-bar" aria-hidden>
                <i style={{ width: `${Math.min(100, (abstractWords / 250) * 100)}%`, background: abstractWords > 250 ? "#FF8A7A" : undefined }} />
              </div>
              <div className="text-xs" style={{ color: abstractWords >= 150 && abstractWords <= 250 ? "#7FE0A6" : "#B8ADA2" }}>
                {trx("{0} / ١٥٠–٢٥٠ كلمة", abstractWords.toLocaleString(isEn ? "en" : "ar-EG"))}
              </div>
            </div>

            <div className="v3-g v3-hover v3-rise flex flex-col gap-2.5 p-[18px]" style={{ ...rise(6), borderColor: "rgba(255,180,68,.3)" }}>
              <div className="flex items-center gap-2.5">
                <span className="v3-orb h-[30px] w-[30px]" aria-hidden />
                <div className="v3-k text-[15px]">{tr("باحث الأدبيات")}</div>
              </div>
              <div className="v3-mut text-[13px] leading-relaxed">{tr("يدوّر لكم دراسات لمراجعة الأدبيات، ويساعدكم تصيغون كل قسم من الفجوة.")}</div>
              <button
                type="button"
                className="v3-bw !text-sm"
                onClick={() => openAgent(active ? tr("ساعدني في قسم «{0}» بالمقترح البحثي", bi(active.labelAr, active.labelEn)) : undefined)}
              >
                {tr("اسأل الوكيل")}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
