import { useState } from "react";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  GraduationCap,
  Library,
  ListTree,
  Loader2,
  Ruler,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import Card from "../components/ui/Card";
import AiLockedCard from "../components/AiLockedCard";
import PaperQA from "../components/research/PaperQA";
import ToolsFinder from "../components/research/ToolsFinder";
import SearchStrategy from "../components/research/SearchStrategy";
import { hasAiAccess } from "../lib/plans";
import EmptyState from "../components/ui/EmptyState";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
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
  projectTitle,
}: {
  result: ResearchSearchResult;
  addedById: string;
  projectTitle?: string;
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
      // التصميم والعينة يجون من الملخص الأصلي (لو مذكورين) — الطالبة تراجعهم بعد الإضافة
      studyDesign: [result.studyDesign, result.sampleSize].filter(Boolean).join(" · "),
      keyFinding: result.keyFinding || result.summaryAr,
      relevance: result.relevanceReason,
      section: "literature-review",
      addedById,
      link: result.url,
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

      {(result.authors || result.year || result.journal) && (
        <p className="text-xs text-brand-950/45">
          {[result.authors, result.year, result.journal].filter(Boolean).join(" · ")}
        </p>
      )}

      {(result.studyDesign || result.sampleSize || result.source || result.doi) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          {result.studyDesign && (
            <span className="rounded-full bg-sky-accent-50 px-2 py-0.5 text-sky-accent-600">{result.studyDesign}</span>
          )}
          {result.sampleSize && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-brand-950/60">{result.sampleSize}</span>
          )}
          {result.source && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-brand-950/40">
              {result.source === "pubmed" ? "PubMed" : result.source === "openalex" ? "OpenAlex" : "بحث ويب"}
            </span>
          )}
          {result.doi && (
            <span dir="ltr" className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-brand-950/40">
              DOI {result.doi}
            </span>
          )}
        </div>
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
        <a
          href={`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${result.title}"`)}`}
          target="_blank"
          rel="noreferrer"
          title="افتحوا الدراسة في Google Scholar لتشوفون كم مرة اقتُبست"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-brand-600 hover:bg-surface-muted"
        >
          <GraduationCap size={13} />
          Google Scholar
        </a>
        {result.abstract && (
          <PaperQA
            title={result.title}
            abstract={result.abstract}
            keyFinding={result.keyFinding}
            projectTitle={projectTitle}
          />
        )}
      </div>
    </Card>
  );
}

export default function ResearchSearch() {
  const { currentUser, isLeader, team } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { project } = useResearchProject();
  const { searches, loading, searching, runSearch, deleteSearch } = useResearchSearch();

  const [tab, setTab] = useState<"papers" | "tools" | "strategy">("papers");
  const [topic, setTopic] = useState(project?.title ?? "");
  const [activeResult, setActiveResult] = useState<{
    results: ResearchSearchResult[];
    noveltyNote: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!topic.trim() || !currentUser || searching) return;
    setError(null);
    setLimitMessage(null);
    setActiveResult(null);
    const { row, error: searchError, limitMessage: limitMsg } = await runSearch(topic.trim(), currentUser.id);
    if (limitMsg) {
      setLimitMessage(limitMsg);
      return;
    }
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
          اكتبوا عنوان بحثكم، والوكيل يبحث بقواعد أبحاث حقيقية (PubMed وOpenAlex) ويلخّص لكم أقرب الدراسات بالعربي،
          ويساعدكم بأدوات القياس واستراتيجية البحث.
        </p>
      </div>

      {!hasAiAccess(team) && <AiLockedCard feature="وكيل البحث العلمي" />}

      {hasAiAccess(team) && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["papers", "دراسات قريبة", Search],
              ["tools", "أدوات القياس", Ruler],
              ["strategy", "استراتيجية البحث", ListTree],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === id ? "bg-brand-500 text-white" : "bg-paper text-brand-950/60 hover:bg-surface-muted"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
      {hasAiAccess(team) && tab === "tools" && <ToolsFinder />}
      {hasAiAccess(team) && tab === "strategy" && <SearchStrategy defaultTopic={project?.title ?? ""} />}

      {hasAiAccess(team) && tab === "papers" && (
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
        {topic.trim() && (
          <a
            href={`https://scholar.google.com/scholar?q=${encodeURIComponent(topic.trim())}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
          >
            <GraduationCap size={13} />
            ابحثوا بنفس العنوان في Google Scholar (يفتح بنافذة جديدة)
          </a>
        )}
        {searching && (
          <p className="mt-3 text-xs text-brand-950/45">
            نبحث في PubMed وOpenAlex، ثم نرتّب الدراسات ونلخّصها بالعربي من ملخصاتها الأصلية — ياخذ غالبًا ١٠–٢٠ ثانية. 🔎
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>
        )}
        {limitMessage && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-accent-50 px-3 py-2.5 text-sm font-medium text-amber-accent-700">
            <Sparkles size={15} className="mt-0.5 shrink-0" />
            {limitMessage}
          </p>
        )}
      </Card>
      )}

      {tab === "papers" && activeResult && (
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
              <ResultCard
                key={`${r.url}-${i}`}
                result={r}
                addedById={currentUser?.id ?? ""}
                projectTitle={project?.title}
              />
            ))
          )}
        </div>
      )}

      <div className={tab === "papers" ? "space-y-3" : "hidden"}>
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
            <Card key={s.id} interactive className="flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveResult({ results: s.results, noveltyNote: s.noveltyNote })}
                className="min-w-0 flex-1 text-start"
              >
                <p className="truncate text-sm font-bold text-brand-950">{s.queryText}</p>
                <p className="text-xs text-brand-950/45">
                  {formatDateLong(s.createdAt)} · {s.results.length} نتيجة
                </p>
              </button>
              {(isLeader || s.createdById === currentUser?.id) && (
                <ThreeDotsMenu
                  items={[
                    {
                      label: "حذف عملية البحث",
                      confirmLabel: "تأكيد الحذف؟",
                      icon: Trash2,
                      tone: "danger",
                      onClick: () => deleteSearch(s.id),
                    },
                  ]}
                />
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
