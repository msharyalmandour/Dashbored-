import { useMemo, useState } from "react";
import { BookMarked, Check, Copy, ExternalLink, LayoutGrid, Plus, Quote, Table2, Trash2, X } from "lucide-react";
import PaperQA from "../components/research/PaperQA";
import { useResearchProject } from "../hooks/useResearchProject";
import { hasAiAccess } from "../lib/plans";
import clsx from "clsx";
import { FilterPill, ResearchHeader, SourceTag, glassCard, gradientPill, pillField, sourceFromLink, themeLabelAr } from "../components/ui/researchUi";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
import { useAuth } from "../context/AuthContext";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useTeamRoster } from "../hooks/useTeamRoster";
import type { EvidencePaper, EvidenceSection, LiteratureTheme } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";
import { buildReferenceList, toCitation, type CitationStyle } from "../lib/citation";

const sectionFilters: { id: "all" | EvidenceSection; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "background", label: "خلفية البحث" },
  { id: "literature-review", label: "مراجعة الأدبيات" },
  { id: "gap", label: "الفجوة" },
  { id: "methodology", label: "المنهجية" },
  { id: "other", label: "أخرى" },
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
  keyFinding: "",
  relevance: "",
  section: "other" as EvidenceSection,
};

export default function EvidenceLibrary() {
  const { currentUser, isLeader, team, mode } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { project } = useResearchProject();
  const canAsk = mode === "supabase" && hasAiAccess(team);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [copiedTable, setCopiedTable] = useState(false);
  const { papers, addPaper, updateReviewStatus, deletePaper } = useEvidencePapers();
  const { roster } = useTeamRoster();
  const [filter, setFilter] = useState<"all" | EvidenceSection>("all");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedList, setCopiedList] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const memberById = (id: string) => roster.find((m) => m.id === id);

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

  /** جدول مقارنة الدراسات كنص مفصول بـ Tab — يلصق مباشرة بـ Word أو Excel */
  const copyComparisonTable = async (list: EvidencePaper[]) => {
    const clean = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();
    const rows = [
      ["الدراسة", "المؤلفون", "السنة", "التصميم والعينة", "أهم النتائج", "الصلة ببحثنا"],
      ...list.map((p) => [p.title, p.authors, String(p.year), p.studyDesign, p.keyFinding, p.relevance]),
    ];
    try {
      await navigator.clipboard.writeText(rows.map((r) => r.map(clean).join("\t")).join("\n"));
      setCopiedTable(true);
      setTimeout(() => setCopiedTable(false), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  const reviewedCount = papers.filter((p) => p.reviewStatus === "reviewed").length;

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
    "flex items-center gap-1.5 rounded-full border border-white/[0.14] px-3.5 py-1.5 text-xs font-semibold text-[#B8ADA2] transition hover:border-[#FF8A24]/50 hover:text-[#F4F0EC]";
  const segBtn = (on: boolean) =>
    clsx(
      "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
      on ? "bg-[#FF6B00]/20 text-[#FFB444]" : "text-[#B8ADA2] hover:text-[#F4F0EC]",
    );

  return (
    <div className="space-y-6">
      <ResearchHeader
        title="مكتبة الأدلة"
        subtitle={
          papers.length === 0
            ? "دراساتكم المحفوظة تنجمع هنا، مرتبة حسب محاور بحثكم."
            : `${papers.length} دراسات حفظتوها، مرتبة حسب محاور بحثكم. ${reviewedCount} منها تمت مراجعتها.`
        }
        action={
          <button onClick={() => setShowForm((v) => !v)} className={gradientPill}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "إلغاء" : g(isFemale, "أضف دراسة", "أضف دراسة")}
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {sectionFilters.map((f) => (
          <FilterPill key={f.id} active={filter === f.id} count={countFor(f.id)} onClick={() => setFilter(f.id)}>
            {f.label}
          </FilterPill>
        ))}
      </div>

      {showForm && (
        <div className={clsx(glassCard, "p-5")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="عنوان الدراسة"
              className={clsx(pillField, "col-span-full")}
            />
            <input
              value={form.authors}
              onChange={(e) => setForm((f) => ({ ...f, authors: e.target.value }))}
              placeholder="المؤلفون"
              className={pillField}
            />
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
              placeholder="سنة النشر"
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
              placeholder="تصميم الدراسة"
              className={clsx(pillField, "col-span-full")}
            />
            <textarea
              value={form.keyFinding}
              onChange={(e) => setForm((f) => ({ ...f, keyFinding: e.target.value }))}
              placeholder="أهم النتائج"
              rows={2}
              className={clsx(fieldBox, "col-span-full")}
            />
            <textarea
              value={form.relevance}
              onChange={(e) => setForm((f) => ({ ...f, relevance: e.target.value }))}
              placeholder="الصلة بالبحث"
              rows={2}
              className={clsx(fieldBox, "col-span-full")}
            />
          </div>
          <button onClick={submitPaper} disabled={!form.title.trim()} className={clsx(gradientPill, "mt-4")}>
            حفظ الدراسة
          </button>
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
                ["cards", "بطاقات", LayoutGrid],
                ["table", "جدول مقارنة", Table2],
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
              {copiedTable ? "تم نسخ الجدول" : "نسخ الجدول (Word / Excel)"}
            </button>
          )}
          <button onClick={() => copyReferenceList(filtered)} className={toolBtn}>
            {copiedList ? <Check size={13} /> : <Copy size={13} />}
            {copiedList ? "تم نسخ القائمة" : "نسخ كل المراجع"}
          </button>
        </div>
      )}

      {view === "table" && filtered.length > 0 && (
        <div className={clsx(glassCard, "overflow-x-auto p-0")}>
          <table className="w-full min-w-[720px] border-collapse text-start text-xs">
            <thead>
              <tr className="text-[#B8ADA2]">
                {["الدراسة", "التصميم والعينة", "أهم النتائج", "الصلة ببحثنا"].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((paper) => (
                <tr key={paper.id} className="border-t border-white/10 align-top">
                  <td className="w-[28%] px-4 py-3">
                    <p className="font-bold leading-snug">{paper.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#B8ADA2]">
                      {paper.authors} · {paper.year}
                    </p>
                  </td>
                  <td className="w-[16%] px-4 py-3 text-[#B8ADA2]">{paper.studyDesign || "—"}</td>
                  <td className="w-[28%] px-4 py-3 text-[#B8ADA2]">{paper.keyFinding || "—"}</td>
                  <td className="px-4 py-3 text-[#B8ADA2]">{paper.relevance || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={view === "cards" || filtered.length === 0 ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "hidden"}>
        {filtered.map((paper) => {
          const addedBy = memberById(paper.addedById);
          const reviewed = paper.reviewStatus === "reviewed";
          return (
            <article key={paper.id} className={clsx(glassCard, "flex flex-col p-5")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SourceTag label={sourceFromLink(paper.link)} />
                  {reviewed && <span className="text-[11px] font-semibold text-[#7fd6a0]">✓ تمت مراجعتها</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[#B8ADA2]">{paper.year}</span>
                  {(isLeader || paper.addedById === currentUser?.id) && (
                    <ThreeDotsMenu
                      items={[
                        {
                          label: "حذف الدراسة",
                          confirmLabel: "تأكيد الحذف؟",
                          icon: Trash2,
                          tone: "danger",
                          onClick: () => deletePaper(paper.id),
                        },
                      ]}
                    />
                  )}
                </div>
              </div>

              <h3 className="mt-3 text-[17px] font-bold leading-snug" dir="auto">
                {paper.link ? (
                  <a href={paper.link} target="_blank" rel="noreferrer" className="hover:text-[#FFB444]">
                    {paper.title}
                  </a>
                ) : (
                  paper.title
                )}
              </h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#B8ADA2]">{paper.keyFinding || paper.relevance || "—"}</p>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm">
                <span className="flex items-center gap-1.5 text-[#FFB444]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFB444]" />
                  {themeLabelAr[paper.theme] ?? paper.theme}
                </span>
                {paper.link && (
                  <a href={paper.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#B8ADA2] hover:text-[#F4F0EC]">
                    <ExternalLink size={13} />
                    الأصل
                  </a>
                )}
              </div>

              <details className="group mt-3">
                <summary className="cursor-pointer list-none text-xs font-semibold text-[#B8ADA2] hover:text-[#F4F0EC]">
                  تفاصيل وأدوات <span className="inline-block transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-3 space-y-3 text-sm">
                  <p className="text-[#B8ADA2]">
                    {paper.authors} · {paper.studyDesign}
                  </p>
                  {paper.relevance && (
                    <div className="rounded-2xl bg-white/[0.05] p-3">
                      <p className="text-[11px] font-bold text-[#B8ADA2]">الصلة بالبحث</p>
                      <p className="mt-0.5 text-xs leading-relaxed">{paper.relevance}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => updateReviewStatus(paper.id, reviewed ? "collected" : "reviewed")}
                      className={clsx(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                        reviewed ? "border-[#7fd6a0]/60 text-[#7fd6a0]" : "border-[#FF8A24]/60 text-[#FFB444] hover:bg-[#FF6B00]/10",
                      )}
                    >
                      {reviewed ? "تمت مراجعتها" : "تم جمعها — علّموها مراجَعة"}
                    </button>
                    <button onClick={() => copyCitation(paper)} className={toolBtn}>
                      {copiedId === paper.id ? <Check size={13} /> : <Quote size={13} />}
                      {copiedId === paper.id ? "تم النسخ" : "نسخ الاقتباس"}
                    </button>
                  </div>
                  {addedBy && (
                    <div className="flex items-center gap-1.5 text-xs text-[#B8ADA2]">
                      <Avatar initials={addedBy.initials} color={addedBy.color} size="sm" />
                      أضافها {addedBy.name.split(" ")[0]}
                    </div>
                  )}
                  {canAsk && (
                    <PaperQA
                      title={paper.title}
                      keyFinding={paper.keyFinding}
                      relevance={paper.relevance}
                      projectTitle={project?.title}
                      allowPdf
                    />
                  )}
                </div>
              </details>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className={clsx(glassCard, "col-span-full p-2")}>
            <EmptyState
              icon={BookMarked}
              title={filter === "all" ? "المكتبة لسا فاضية" : "لا توجد دراسات بهذا القسم"}
              desc={
                filter === "all"
                  ? "أول دراسة تضيفونها هنا تبدأ مكتبة أدلة بحثكم — أضيفوا أول دراسة، أو احفظوها من «البحث عن دراسات»."
                  : "جرّبوا فلتر ثاني، أو أضيفوا دراسة جديدة تحت هذا القسم."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
