import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, Check, Copy, ExternalLink, LayoutGrid, Quote, Search, Sparkles, Table2, Trash2 } from "lucide-react";
import Dialog from "../components/ui/Dialog";
import { useLocation } from "react-router-dom";
import { openAgent } from "../lib/agentBus";
import ReferencesToolsCard from "../components/research/ReferencesToolsCard";
import { PageDropOverlay, StudyDropCard, usePageDrop, useStudyQueue } from "../components/research/StudyDrop";
import { useResearchProject } from "../hooks/useResearchProject";
import { hasAiAccess } from "../lib/plans";
import clsx from "clsx";
import { ResearchHeader, glassCard, gradientPill, pillField, themeLabelAr } from "../components/ui/researchUi";
import EmptyState from "../components/ui/EmptyState";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
import { useAuth } from "../context/AuthContext";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import type { EvidencePaper, EvidenceSection, LiteratureTheme } from "../data/types";
import { buildReferenceList, toCitation, type CitationStyle } from "../lib/citation";
import { LITERATURE_COLUMNS, authorCell, buildLiteratureTableDoc, literatureTsv } from "../lib/literatureTable";
import { downloadWordDoc } from "../lib/wordExport";
import { tr } from "../lib/i18n";

const sectionFilters: { id: "all" | EvidenceSection; label: string; short?: string }[] = [
  { id: "all", label: tr("الكل") },
  { id: "background", label: tr("خلفية البحث"), short: tr("الخلفية") },
  { id: "literature-review", label: tr("مراجعة الأدبيات"), short: tr("الأدبيات") },
  { id: "gap", label: tr("الفجوة") },
  { id: "methodology", label: tr("المنهجية") },
  { id: "other", label: tr("أخرى") },
];

const themeOptions: LiteratureTheme[] = [
  "Delirium",
  "Nursing Knowledge",
  "Detection Tools",
  "Tool Utilization",
  "Patient Outcomes",
];

const emptyForm = {
  title: "",
  authors: "",
  year: new Date().getFullYear(),
  theme: themeOptions[0],
  studyDesign: "",
  country: "",
  aim: "",
  sample: "",
  dataCollection: "",
  keyFinding: "",
  relevance: "",
  section: "other" as EvidenceSection,
  link: undefined as string | undefined,
};

export default function EvidenceLibrary() {
  const { currentUser, isLeader, team, mode } = useAuth();
  const { project } = useResearchProject();
  const canAsk = mode === "supabase" && hasAiAccess(team);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [copiedTable, setCopiedTable] = useState(false);
  const { papers, addPaper, updateReviewStatus, deletePaper } = useEvidencePapers();
  const [filter, setFilter] = useState<"all" | EvidenceSection>("all");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedList, setCopiedList] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);
  // ويسي لاحظ رابط دراسة انلصق بخانة ثانية وأرسله هنا (state.link): نفتح النموذج والرابط جاهز
  const evidenceLocation = useLocation();
  useEffect(() => {
    const link = (evidenceLocation.state as { link?: string } | null)?.link;
    if (!link) return;
    setShowForm(true);
    setForm((f) => ({ ...f, link }));
  }, [evidenceLocation.state]);
  // «ارموا الدراسة»: ويسي يقراها وتنضاف للمكتبة والجدول بكل خاناتها
  const pickRef = useRef<(() => void) | null>(null);
  const dropOn = canAsk && !!currentUser;
  const drops = useStudyQueue({ add: addPaper, remove: deletePaper, existingTitles: papers.map((p) => p.title), addedById: currentUser?.id ?? "" });
  const { addFiles } = drops;
  const onPageFiles = useCallback((f: FileList) => addFiles(f), [addFiles]);
  const dragging = usePageDrop(onPageFiles, dropOn);

  const copyCitation = async (paper: EvidencePaper) => {
    try {
      await navigator.clipboard.writeText(toCitation(paper, citationStyle));
      setCopiedId(paper.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  const copyReferenceList = async (list: EvidencePaper[]) => {
    try {
      await navigator.clipboard.writeText(buildReferenceList(list, citationStyle));
      setCopiedList(true);
      setTimeout(() => setCopiedList(false), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  /** جدول الدراسات (أعمدة نموذج الدكتورة) كنص مفصول بـ Tab — يلصق مباشرة بـ Word أو Excel */
  const copyComparisonTable = async (list: EvidencePaper[]) => {
    try {
      await navigator.clipboard.writeText(literatureTsv(list));
      setCopiedTable(true);
      setTimeout(() => setCopiedTable(false), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  const [exportingTable, setExportingTable] = useState(false);
  const exportTableWord = async (list: EvidencePaper[]) => {
    setExportingTable(true);
    try {
      downloadWordDoc(await buildLiteratureTableDoc(list, project?.title ?? ""), `${tr("جدول الدراسات")}.docx`);
    } finally {
      setExportingTable(false);
    }
  };


  const filtered = useMemo(
    () =>
      papers
        .filter((p) => filter === "all" || p.section === filter)
        .sort((a, b) => Number(a.reviewStatus === "reviewed") - Number(b.reviewStatus === "reviewed")),
    [papers, filter],
  );

  const submitPaper = async () => {
    if (!form.title.trim()) return;
    await addPaper({ ...form, addedById: currentUser?.id ?? "" });
    setForm(emptyForm);
    setShowForm(false);
  };

  const countFor = (id: "all" | EvidenceSection) => (id === "all" ? papers.length : papers.filter((p) => p.section === id).length);
  const fieldBox = `${pillField} !rounded-2xl`;
  const toolBtn =
    "flex items-center gap-1.5 rounded-full border border-white/[0.14] px-3.5 py-1.5 text-xs font-semibold text-ws-muted transition hover:border-ws-accent2/50 hover:text-ws-text";
  const segBtn = (on: boolean) =>
    clsx(
      "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
      on ? "bg-ws-accent/20 text-ws-accent3" : "text-ws-muted hover:text-ws-text",
    );

  const inTable = (p: EvidencePaper) => !!(p.aim?.trim() && p.keyFinding?.trim());
  const tableCount = papers.filter(inTable).length;
  const shown = filtered.filter((p) => !q.trim() || `${p.title} ${p.authors} ${p.country ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  const segs = sectionFilters.filter((f) => f.id === "all" || f.id !== "other" || countFor("other") > 0);

  return (
    <div className="space-y-6">
      <ResearchHeader title={tr("مكتبة الأدلة")} subtitle={papers.length ? tr("{0} دراسة · {1} منها بالجدول", papers.length, tableCount) : tr("لسه فاضية")} />

      {dropOn ? (
        <>
          <PageDropOverlay show={dragging} />
          <StudyDropCard items={drops.items} onFiles={addFiles} onUndo={drops.undo} onDismiss={drops.dismiss} onImport={() => setImportOpen(true)} pickRef={pickRef} hero={papers.length === 0} />
        </>
      ) : (
        <div className="sd-card flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[15px] font-bold text-ws-text">{tr("ارموا الدراسة هنا")}</p>
          <button type="button" className="sdz-glass" onClick={() => setImportOpen(true)}>
            {tr("استيراد Zotero")}
          </button>
        </div>
      )}

      {importOpen && (
        <Dialog open onClose={() => setImportOpen(false)} title={tr("استيراد Zotero")}>
          {currentUser && <ReferencesToolsCard papers={papers} addPaper={addPaper as never} />}
          <button type="button" className="sdz-glass mt-3" onClick={() => (setImportOpen(false), setShowForm(true))}>
            {tr("أو اكتبوها يدوي")}
          </button>
        </Dialog>
      )}

      {papers.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="lb-seg" role="tablist" aria-label={tr("المحاور")}>
            {segs.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={clsx("lb-seg-btn", filter === f.id && "on")} onClick={() => setFilter(f.id)}>
                {f.short ?? f.label}
                <span className="lb-seg-n">{countFor(f.id)}</span>
              </button>
            ))}
          </div>
          <label className="lb-search">
            <Search size={16} aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("ابحثوا…")} aria-label={tr("ابحثوا بالمكتبة")} />
          </label>
        </div>
      )}

      {showForm && (
        <div className={clsx(glassCard, "p-5")}>
          {form.link && (
            <p className="mb-3 truncate text-[13px] font-semibold text-ws-muted" dir="ltr">
              🔗 {form.link}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={tr("عنوان الدراسة")}
              className={clsx(pillField, "col-span-full")}
            />
            <input
              value={form.authors}
              onChange={(e) => setForm((f) => ({ ...f, authors: e.target.value }))}
              placeholder={tr("المؤلفون")}
              className={pillField}
            />
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
              placeholder={tr("سنة النشر")}
              className={pillField}
            />
            <select
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value as LiteratureTheme }))}
              className={pillField}
            >
              {themeOptions.map((t) => (
                <option key={t} value={t}>
                  {themeLabelAr[t]}
                </option>
              ))}
            </select>
            <select
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value as EvidenceSection }))}
              className={pillField}
            >
              {sectionFilters
                .filter((s) => s.id !== "all")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
            </select>
            <input
              value={form.studyDesign}
              onChange={(e) => setForm((f) => ({ ...f, studyDesign: e.target.value }))}
              placeholder={tr("تصميم الدراسة (Methodology)")}
              className={clsx(pillField, "col-span-full")}
            />
            <input
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              placeholder={tr("الدولة (Country)")}
              className={pillField}
            />
            <input
              value={form.sample}
              onChange={(e) => setForm((f) => ({ ...f, sample: e.target.value }))}
              placeholder={tr("العينة (Sample)")}
              className={pillField}
            />
            <textarea
              value={form.aim}
              onChange={(e) => setForm((f) => ({ ...f, aim: e.target.value }))}
              placeholder={tr("هدف الدراسة (Aim)")}
              rows={2}
              className={clsx(fieldBox, "col-span-full")}
            />
            <textarea
              value={form.dataCollection}
              onChange={(e) => setForm((f) => ({ ...f, dataCollection: e.target.value }))}
              placeholder={tr("جمع البيانات (Data collection)")}
              rows={2}
              className={clsx(fieldBox, "col-span-full")}
            />
            <textarea
              value={form.keyFinding}
              onChange={(e) => setForm((f) => ({ ...f, keyFinding: e.target.value }))}
              placeholder={tr("أهم النتائج")}
              rows={2}
              className={clsx(fieldBox, "col-span-full")}
            />
            <textarea
              value={form.relevance}
              onChange={(e) => setForm((f) => ({ ...f, relevance: e.target.value }))}
              placeholder={tr("الصلة بالبحث")}
              rows={2}
              className={clsx(fieldBox, "col-span-full")}
            />
          </div>
          <button onClick={submitPaper} disabled={!form.title.trim()} className={clsx(gradientPill, "mt-4")}>{tr("حفظ الدراسة")}</button>
        </div>
      )}

      {papers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] p-1">
            {(["apa", "vancouver"] as CitationStyle[]).map((s) => (
              <button key={s} onClick={() => setCitationStyle(s)} className={segBtn(citationStyle === s)}>
                {s === "apa" ? "APA" : "Vancouver"}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] p-1">
            {(
              [
                ["cards", tr("بطاقات"), LayoutGrid],
                ["table", tr("جدول مقارنة"), Table2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setView(id)} className={segBtn(view === id)}>
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
          {view === "table" && (
            <button onClick={() => copyComparisonTable(filtered)} className={toolBtn}>
              {copiedTable ? <Check size={13} /> : <Copy size={13} />}
              {copiedTable ? tr("تم نسخ الجدول") : tr("نسخ الجدول (Word / Excel)")}
            </button>
          )}
          {view === "table" && (
            <button onClick={() => exportTableWord(filtered)} disabled={exportingTable} className={toolBtn}>
              <BookMarked size={13} />
              {tr("تصدير جدول الدراسات (Word)")}
            </button>
          )}
          <button onClick={() => copyReferenceList(filtered)} className={toolBtn}>
            {copiedList ? <Check size={13} /> : <Copy size={13} />}
            {copiedList ? tr("تم نسخ القائمة") : tr("نسخ كل المراجع")}
          </button>
        </div>
      )}

      {view === "table" && filtered.length > 0 && (
        <div className={clsx(glassCard, "overflow-x-auto p-0")}>
          <table className="w-full min-w-[1100px] border-collapse text-start text-xs">
            <thead>
              <tr className="text-ws-muted">
                {LITERATURE_COLUMNS.map((h) => (
                  <th key={h} className="px-3 py-3 text-start font-bold" dir="ltr">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((paper) => (
                <tr key={paper.id} className="border-t border-white/10 align-top">
                  <td className="w-[11%] px-3 py-3 font-bold leading-snug" dir="auto" title={paper.title}>
                    {authorCell(paper.authors, paper.year)}
                  </td>
                  <td className="w-[7%] px-3 py-3 text-ws-muted" dir="auto">{paper.country || "—"}</td>
                  <td className="w-[17%] px-3 py-3 text-ws-muted" dir="auto">{paper.aim || "—"}</td>
                  <td className="w-[12%] px-3 py-3 text-ws-muted" dir="auto">{paper.studyDesign || "—"}</td>
                  <td className="w-[16%] px-3 py-3 text-ws-muted" dir="auto">{paper.sample || "—"}</td>
                  <td className="w-[16%] px-3 py-3 text-ws-muted" dir="auto">{paper.dataCollection || "—"}</td>
                  <td className="px-3 py-3 text-ws-muted" dir="auto">{paper.keyFinding || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={view === "cards" && papers.length > 0 ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "hidden"}>
        {shown.map((paper) => {
          const reviewed = paper.reviewStatus === "reviewed";
          const ok = inTable(paper);
          const meta = [paper.country, paper.sample, paper.studyDesign].map((x) => (x ?? "").trim()).filter(Boolean).join(" · ");
          const menu = [
            { label: copiedId === paper.id ? tr("تم النسخ") : tr("نسخ الاقتباس"), icon: Quote, onClick: () => copyCitation(paper) },
            { label: reviewed ? tr("رجّعوها غير مراجَعة") : tr("علّموها مراجَعة"), icon: Check, onClick: () => updateReviewStatus(paper.id, reviewed ? "collected" : "reviewed") },
            ...(canAsk ? [{ label: tr("اسألوا ويسي عنها"), icon: Sparkles, onClick: () => openAgent(tr("عن الدراسة «{0}»: ", paper.title)) }] : []),
            ...(paper.link ? [{ label: tr("افتحوا الأصل"), icon: ExternalLink, onClick: () => window.open(paper.link, "_blank", "noopener") }] : []),
            ...(isLeader || paper.addedById === currentUser?.id
              ? [{ label: tr("حذف الدراسة"), confirmLabel: tr("تأكيد الحذف؟"), icon: Trash2, tone: "danger" as const, onClick: () => deletePaper(paper.id) }]
              : []),
          ];
          return (
            <article key={paper.id} className="lb-card">
              <div className="flex items-center gap-2">
                <span className="lb-axis">{(() => { const f = sectionFilters.find((x) => x.id === paper.section); return f?.short ?? f?.label ?? themeLabelAr[paper.theme] ?? tr("أخرى"); })()}</span>
                <span className="flex-1" />
                <span className="text-[13px] font-bold text-ws-muted" dir="ltr">
                  {paper.year}
                </span>
                <ThreeDotsMenu items={menu} />
              </div>
              <h3 className="lb-title" dir="ltr">
                {paper.title}
              </h3>
              {meta && (
                <p className="lb-meta" dir="auto">
                  {meta}
                </p>
              )}
              <div className="mt-auto pt-3">
                {ok ? (
                  <span className="lb-ok">
                    <Check size={14} strokeWidth={3} aria-hidden />
                    {tr("بالجدول")}
                  </span>
                ) : (
                  <span className="lb-miss">{tr("ناقص ملخّص")}</span>
                )}
              </div>
            </article>
          );
        })}
        {shown.length === 0 && (
          <div className={clsx(glassCard, "col-span-full p-2")}>
            <EmptyState icon={BookMarked} title={q.trim() ? tr("ما لقينا شي بهالبحث") : tr("لا توجد دراسات بهذا القسم")} desc={tr("جرّبوا فلتر ثاني.")} />
          </div>
        )}
      </div>
    </div>
  );
}
