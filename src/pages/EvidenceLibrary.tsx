import { useMemo, useState } from "react";
import { BookMarked, Check, Copy, Plus, Quote, X } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
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
  const { currentUser } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { papers, addPaper, updateReviewStatus } = useEvidencePapers();
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

  return (
    <div className="space-y-5">
      {papers.length > 0 && (
        <div className="flex items-center gap-4 rounded-2xl bg-surface-muted px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-brand-950/50">
              <span>تقدم المراجعة</span>
              <span className="text-brand-600">
                {reviewedCount} من {papers.length} دراسة
              </span>
            </div>
            <ProgressBar value={(reviewedCount / papers.length) * 100} />
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {sectionFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                filter === f.id
                  ? "bg-brand-500 text-white"
                  : "bg-paper text-brand-950/60 hover:bg-surface-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "إلغاء" : g(isFemale, "أضيفي دراسة جديدة", "أضف دراسة جديدة")}
        </button>
      </div>

      {showForm && (
        <Card tone="sky">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="عنوان الدراسة"
              className="col-span-full rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            />
            <input
              value={form.authors}
              onChange={(e) => setForm((f) => ({ ...f, authors: e.target.value }))}
              placeholder="المؤلفون"
              className="rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            />
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
              placeholder="سنة النشر"
              className="rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            />
            <select
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value as LiteratureTheme }))}
              className="rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            >
              {themeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value as EvidenceSection }))}
              className="rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
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
              className="rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            />
            <textarea
              value={form.keyFinding}
              onChange={(e) => setForm((f) => ({ ...f, keyFinding: e.target.value }))}
              placeholder="أهم النتائج"
              rows={2}
              className="col-span-full rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            />
            <textarea
              value={form.relevance}
              onChange={(e) => setForm((f) => ({ ...f, relevance: e.target.value }))}
              placeholder="الصلة بالبحث"
              rows={2}
              className="col-span-full rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            />
          </div>
          <button
            onClick={submitPaper}
            disabled={!form.title.trim()}
            className="mt-3 rounded-xl bg-sky-accent-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-accent-600 disabled:opacity-50"
          >
            حفظ الدراسة
          </button>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-brand-950/60">أسلوب الاقتباس:</span>
          <div className="flex overflow-hidden rounded-lg border border-brand-100">
            {(["apa", "vancouver"] as CitationStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setCitationStyle(s)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-bold transition-colors",
                  citationStyle === s
                    ? "bg-brand-500 text-white"
                    : "bg-paper text-brand-950/55 hover:bg-surface-muted",
                )}
              >
                {s === "apa" ? "APA" : "Vancouver"}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => copyReferenceList(filtered)}
          className="flex items-center gap-1.5 rounded-lg border border-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-paper"
        >
          {copiedList ? <Check size={13} /> : <Copy size={13} />}
          {copiedList ? "تم نسخ القائمة" : "نسخ كل المراجع"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((paper) => {
          const addedBy = memberById(paper.addedById);
          return (
            <Card key={paper.id} className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <BookMarked size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-brand-950">{paper.title}</p>
                <p className="mt-1 text-sm text-brand-950/50">
                  {paper.authors} · {paper.year} · {paper.studyDesign}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-accent-50 px-2 py-0.5 text-[11px] font-bold text-sky-accent-600">
                    {paper.theme}
                  </span>
                  <button
                    onClick={() =>
                      updateReviewStatus(paper.id, paper.reviewStatus === "reviewed" ? "collected" : "reviewed")
                    }
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors",
                      paper.reviewStatus === "reviewed"
                        ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                        : "bg-amber-accent-50 text-amber-accent-600 hover:bg-amber-accent-100",
                    )}
                  >
                    {paper.reviewStatus === "reviewed" ? "تمت مراجعتها" : "تم جمعها"}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface-muted p-2.5">
                    <p className="text-[11px] font-bold text-brand-950/45">أهم النتائج</p>
                    <p className="mt-0.5 text-xs text-brand-950/70">{paper.keyFinding || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-2.5">
                    <p className="text-[11px] font-bold text-brand-950/45">الصلة بالبحث</p>
                    <p className="mt-0.5 text-xs text-brand-950/70">{paper.relevance || "—"}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-brand-950/40">
                    {addedBy && (
                      <>
                        <Avatar initials={addedBy.initials} color={addedBy.color} size="sm" />
                        أضافها {addedBy.name.split(" ")[0]}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => copyCitation(paper)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-surface-muted"
                  >
                    {copiedId === paper.id ? <Check size={13} /> : <Quote size={13} />}
                    {copiedId === paper.id ? "تم النسخ" : "نسخ الاقتباس"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={BookMarked}
              title={filter === "all" ? "المكتبة لسا فاضية" : "لا توجد دراسات بهذا القسم"}
              desc={
                filter === "all"
                  ? "أول دراسة تضيفينها هنا تبدأ مكتبة أدلة بحثكم — أضيفي أول دراسة."
                  : "جربي فلتر ثاني، أو أضيفي دراسة جديدة تحت هذا القسم."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
