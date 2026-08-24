import { useMemo, useState } from "react";
import { BookMarked } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import { useAuth } from "../context/AuthContext";
import { evidenceLibrary, teamMembers } from "../data/mockData";
import type { EvidencePaper, EvidenceSection } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";

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
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;

  const allPapers = [...attachedPapers, ...evidenceLibrary];

  const filtered = useMemo(
    () => allPapers.filter((p) => filter === "all" || p.section === filter),
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
                <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-950/40">
                  <Avatar initials={addedBy.initials} color={addedBy.color} size="sm" />
                  أضافها {addedBy.name.split(" ")[0]}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-brand-950/40">
            لا توجد مصادر مطابقة لهذا الفلتر
          </p>
        )}
      </div>
    </div>
  );
}
