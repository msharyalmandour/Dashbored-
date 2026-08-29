import { useMemo, useState } from "react";
import { BookMarked, Check, Copy, Quote } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import { useAuth } from "../context/AuthContext";
import { evidenceLibrary, teamMembers } from "../data/mockData";
import type { EvidencePaper, EvidenceSection } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";
import { buildReferenceList, toCitation, type CitationStyle } from "../lib/citation";

const ATTACHED_KEY = "nursync.attachedPapers";

function loadAttachedPapers(): EvidencePaper[] {
  try {
    const raw = localStorage.getItem(ATTACHED_KEY);
    return raw ? (JSON.parse(raw) as EvidencePaper[]) : [];
  } catch {
    return [];
  }
}

function titleFromFileName(name: string): string {
  return name.replace(/\.[^./]+$/, "").replace(/[_-]+/g, " ");
}

const sectionFilters: { id: "all" | EvidenceSection; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "background", label: "خلفية البحث" },
  { id: "literature-review", label: "مراجعة الأدبيات" },
  { id: "gap", label: "الفجوة" },
  { id: "methodology", label: "المنهجية" },
  { id: "other", label: "أخرى" },
];

export default function EvidenceLibrary() {
  const { currentUser } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const [filter, setFilter] = useState<"all" | EvidenceSection>("all");
  const [attachedPapers, setAttachedPapers] = useState<EvidencePaper[]>(loadAttachedPapers);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedList, setCopiedList] = useState(false);
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;

  const copyCitation = async (paper: EvidencePaper) => {
    try {
      await navigator.clipboard.writeText(toCitation(paper, citationStyle));
      setCopiedId(paper.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  const copyReferenceList = async (papers: EvidencePaper[]) => {
    try {
      await navigator.clipboard.writeText(buildReferenceList(papers, citationStyle));
      setCopiedList(true);
      setTimeout(() => setCopiedList(false), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  const allPapers = [...attachedPapers, ...evidenceLibrary];
  const reviewedCount = allPapers.filter((p) => p.reviewStatus === "reviewed").length;

  const filtered = useMemo(
    () =>
      allPapers
        .filter((p) => filter === "all" || p.section === filter)
        // اللي لسا ما تُراجع يطلع أول — عشان محد يضيع بين الدراسات المكدسة
        .sort((a, b) => Number(a.reviewStatus === "reviewed") - Number(b.reviewStatus === "reviewed")),
    [allPapers, filter],
  );

  const handleAttach = (meta: AttachedFileMeta) => {
    const newPaper: EvidencePaper = {
      id: `e-local-${Date.now()}`,
      title: titleFromFileName(meta.name),
      authors: "—",
      year: new Date().getFullYear(),
      theme: "Delirium",
      studyDesign: "—",
      keyFinding: "لسا ما تمت مراجعتها — أضيفي ملخص النتائج بعد القراءة.",
      relevance: "لسا ما تمت مراجعتها.",
      section: "other",
      reviewStatus: "collected",
      addedById: currentUser?.id ?? teamMembers[0].id,
    };
    setAttachedPapers((prev) => {
      const updated = [newPaper, ...prev];
      localStorage.setItem(ATTACHED_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="space-y-5">
      {allPapers.length > 0 && (
        <div className="flex items-center gap-4 rounded-2xl bg-surface-muted px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-brand-950/50">
              <span>تقدم المراجعة</span>
              <span className="text-brand-600">
                {reviewedCount} من {allPapers.length} دراسة
              </span>
            </div>
            <ProgressBar value={(reviewedCount / allPapers.length) * 100} />
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
        <FileAttach
          compact
          onAttach={handleAttach}
          label={g(isFemale, "أرفقي دراسة PDF جديدة", "أرفق دراسة PDF جديدة")}
        />
      </div>

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
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold",
                      paper.reviewStatus === "reviewed"
                        ? "bg-brand-50 text-brand-600"
                        : "bg-amber-accent-50 text-amber-accent-600",
                    )}
                  >
                    {paper.reviewStatus === "reviewed" ? "تمت مراجعتها" : "تم جمعها"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface-muted p-2.5">
                    <p className="text-[11px] font-bold text-brand-950/45">أهم النتائج</p>
                    <p className="mt-0.5 text-xs text-brand-950/70">{paper.keyFinding}</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-2.5">
                    <p className="text-[11px] font-bold text-brand-950/45">الصلة بالبحث</p>
                    <p className="mt-0.5 text-xs text-brand-950/70">{paper.relevance}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-brand-950/40">
                    <Avatar initials={addedBy.initials} color={addedBy.color} size="sm" />
                    أضافها {addedBy.name.split(" ")[0]}
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
                  ? "أول دراسة تضيفينها هنا تبدأ مكتبة أدلة بحثكم — أرفقي أول ملف PDF."
                  : "جربي فلتر ثاني، أو أرفقي دراسة جديدة تحت هذا القسم."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
