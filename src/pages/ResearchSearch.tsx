import { useState } from "react";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Library,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useResearchSearch } from "../hooks/useResearchSearch";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import type { LiteratureTheme, ResearchSearchResult } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";
import { formatDateLong } from "../lib/date";

const themeOptions: LiteratureTheme[] = [
  "Delirium",
  "Nursing Knowledge",
  "Detection Tools",
  "Tool Utilization",
  "Patient Outcomes",
];

const sourceTypeStyle: Record<ResearchSearchResult["sourceType"], string> = {
  "peer-reviewed": "bg-brand-100 text-brand-700",
  general: "bg-amber-accent-100 text-amber-accent-700",
  other: "bg-surface-muted text-brand-950/50",
};

const sourceTypeLabel: Record<ResearchSearchResult["sourceType"], string> = {
  "peer-reviewed": "محكّمة",
  general: "مصدر عام",
  other: "غير مصنّف",
};

function ResultCard({
  result,
  addedById,
}: {
  result: ResearchSearchResult;
  addedById: string;
}) {
  const { addPaper } = useEvidencePapers();
  const { showToast } = useToast();
  const [theme, setTheme] = useState<LiteratureTheme>(themeOptions[0]);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (adding || added) return;
    setAdding(true);
    const { error } = await addPaper({
      title: result.title,
      authors: result.authors || "غير معروف",
      year: result.year ?? new Date().getFullYear(),
      theme,
      studyDesign: "",
      keyFinding: result.summaryAr,
      relevance: result.relevanceReason,
      section: "literature-review",
      addedById,
    });
    setAdding(false);
    if (!error) {
      setAdded(true);
      showToast({ title: "انضافت لمكتبة الأدلة", icon: Check, tone: "brand" });
    }
  };

  return (
    <Card className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-bold text-brand-950 hover:text-brand-600"
        >
          {result.title}
          <ExternalLink size={13} className="shrink-0 text-brand-950/40" />
        </a>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${sourceTypeStyle[result.sourceType]}`}
        >
          {sourceTypeLabel[result.sourceType]}
        </span>
      </div>

      {(result.authors || result.year) && (
        <p className="text-xs text-brand-950/45">
          {[result.authors, result.year].filter(Boolean).join(" · ")}
        </p>
      )}

      <p className="text-sm text-brand-950/70">{result.summaryAr}</p>
      <p className="text-xs text-brand-950/50">
        <b className="font-semibold text-brand-950/70">سبب الصلة:</b> {result.relevanceReason}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as LiteratureTheme)}
          disabled={added}
          className="rounded-lg border border-brand-100 bg-paper px-2 py-1.5 text-xs outline-none focus:border-brand-300 disabled:opacity-50"
        >
          {themeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={adding || added}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {adding ? (
            <Loader2 size={13} className="animate-spin" />
          ) : added ? (
            <Check size={13} />
          ) : (
            <Library size={13} />
          )}
          {added ? "انضافت" : "أضف لمكتبة الأدلة"}
        </button>
      </div>
    </Card>
  );
}

export default function ResearchSearch() {
  const { currentUser } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { project } = useResearchProject();
  const { searches, loading, searching, runSearch } = useResearchSearch();

  const [topic, setTopic] = useState(project?.title ?? "");
  const [activeResult, setActiveResult] = useState<{
    results: ResearchSearchResult[];
    noveltyNote: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!topic.trim() || !currentUser || searching) return;
    setError(null);
    setActiveResult(null);
    const { row, error: searchError } = await runSearch(topic.trim(), currentUser.id);
    if (searchError || !row) {
      setError("تعذّر إتمام البحث — حاولوا مرة ثانية.");
      return;
    }
    setActiveResult({ results: row.results, noveltyNote: row.noveltyNote });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">وكيل البحث العلمي</h1>
        <p className="text-sm text-brand-950/50">
          اكتبوا عنوان بحثكم، ووكيل الذكاء الاصطناعي يبحث فعليًا بالويب عن دراسات حقيقية قريبة من موضوعكم.
        </p>
      </div>

      <Card tone="cream">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-brand-950">
          <Search size={18} className="text-brand-500" />
          ابحثوا عن دراسات قريبة من بحثكم
        </h3>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="عنوان بحث التخرج..."
            className="w-full rounded-lg border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !topic.trim()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searching ? "جاري البحث..." : "ابحث"}
          </button>
        </div>
        {searching && (
          <p className="mt-3 text-xs text-brand-950/45">
            بحث ويب حقيقي ممكن ياخذ لحظات أطول من باقي أدوات الموقع — نتصفح مصادر فعلية، مو نتخمّن. 🌐
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>
        )}
      </Card>

      {activeResult && (
        <div className="space-y-3">
          {activeResult.noveltyNote && (
            <Card tone="teal" className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-bold text-brand-950">وش الجديد ببحثكم؟</p>
                <p className="mt-1 text-sm text-brand-950/70">{activeResult.noveltyNote}</p>
              </div>
            </Card>
          )}

          {activeResult.results.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="ما لقينا نتائج كافية"
                desc="جرّبوا تعدّلوا صياغة العنوان أو تخصّصوه أكثر."
              />
            </Card>
          ) : (
            activeResult.results.map((r, i) => (
              <ResultCard key={`${r.url}-${i}`} result={r} addedById={currentUser?.id ?? ""} />
            ))
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
          <BadgeCheck size={16} className="text-brand-500" />
          عمليات البحث السابقة
        </h3>
        {loading ? (
          <p className="text-sm text-brand-950/45">جاري التحميل...</p>
        ) : searches.length === 0 ? (
          <Card>
            <EmptyState
              icon={Search}
              title={g(isFemale, "ما بحثتوا بعد", "ما بحثتوا بعد")}
              desc="أول بحث تسوّونه بيظهر هنا عشان ترجعون له بدون إعادة البحث."
            />
          </Card>
        ) : (
          searches.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveResult({ results: s.results, noveltyNote: s.noveltyNote })}
              className="block w-full text-start"
            >
              <Card interactive className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-950">{s.queryText}</p>
                  <p className="text-xs text-brand-950/45">
                    {formatDateLong(s.createdAt)} · {s.results.length} نتيجة
                  </p>
                </div>
              </Card>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
