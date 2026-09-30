import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Library,
  ListTree,
  Loader2,
  Lightbulb,
  Ruler,
  Search,
  Sparkles,
  Trash2,
  X,
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
import { useResearchAgentState, type ResearchTab } from "../context/ResearchAgentContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import type { LiteratureTheme, ResearchSearchResult } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";
import { formatDateLong } from "../lib/date";

const SEARCH_MONTHLY_LIMIT = 10;
const GUIDE_KEY = "wesync.research.guide.dismissed";

const themeOptions: { value: LiteratureTheme; label: string }[] = [
  { value: "Delirium", label: "الهذيان" },
  { value: "Nursing Knowledge", label: "معرفة الممرضات" },
  { value: "Detection Tools", label: "أدوات الكشف" },
  { value: "Tool Utilization", label: "استخدام الأدوات" },
  { value: "Patient Outcomes", label: "نتائج المرضى" },
];

const exampleTopics = [
  "الاحتراق الوظيفي لدى ممرضات العناية المركزة",
  "رضا المرضى عن الرعاية التمريضية",
  "الإجهاد المهني وجودة النوم لدى الممرضات",
];

const tabs: { id: ResearchTab; label: string; when: string; icon: typeof Search }[] = [
  { id: "papers", label: "دراسات قريبة", when: "أبي أعرف وش انكتب قبل عن موضوعي", icon: Search },
  { id: "tools", label: "أدوات القياس", when: "أبي استبيان جاهز ومعتمد أستخدمه", icon: Ruler },
  { id: "strategy", label: "خطة البحث", when: "أبي كلمات وجمل أبحث فيها بنفسي", icon: ListTree },
];

function readGuideDismissed() {
  try {
    return localStorage.getItem(GUIDE_KEY) === "1";
  } catch {
    return false;
  }
}

function HowItWorks() {
  const [dismissed, setDismissed] = useState(readGuideDismissed);
  if (dismissed) return null;
  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      // بدون تخزين محلي: يظهر مرة ثانية بالزيارة الجاية، مو مشكلة
    }
  };
  const steps = [
    ["١", "اكتبوا موضوع بحثكم", "عنوان بحثكم أو موضوعه بكلمات بسيطة — مثل: الاحتراق الوظيفي عند الممرضات."],
    ["٢", "اضغطوا «ابحث» وانتظروا", "ياخذ حوالي ٢٠ ثانية. تقدرون تتنقلون بالموقع وتكملون شغلكم، ونخبركم لما تجهز النتائج."],
    ["٣", "اقرأوا وأضيفوا المفيد", "كل دراسة ملخّصة بالعربي. أي وحدة تعجبكم اضغطوا «أضيفوها لمكتبتكم» وتدخل مراجعة الأدبيات وقائمة المراجع تلقائيًا."],
  ];
  return (
    <Card tone="teal" className="relative">
      <button
        onClick={close}
        title="إخفاء الشرح"
        className="absolute end-3 top-3 rounded-lg p-1.5 text-brand-950/40 hover:bg-paper/60"
      >
        <X size={15} />
      </button>
      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-brand-950">
        <Lightbulb size={16} className="text-brand-600" />
        أول مرة؟ كذا تستخدمونه بثلاث خطوات
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map(([n, title, desc]) => (
          <div key={n} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white">
              {n}
            </span>
            <div>
              <p className="text-sm font-bold text-brand-950">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-brand-950/60">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** خطوات تقدّم تقريبية أثناء البحث — توقيتها تقديري (مو مربوطة بحالة السيرفر) */
function SearchProgress() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const stage = sec < 6 ? 0 : sec < 13 ? 1 : 2;
  const steps = ["نبحث في PubMed وOpenAlex", "نختار أقرب الدراسات لموضوعكم", "نلخّصها لكم بالعربي"];
  return (
    <div className="mt-4 rounded-2xl bg-surface-muted p-4" role="status" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-brand-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-1000"
          style={{ width: `${Math.min(92, 12 + sec * 4.5)}%` }}
        />
      </div>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 text-xs font-semibold ${
              i < stage ? "text-brand-600" : i === stage ? "text-brand-950" : "text-brand-950/30"
            }`}
          >
            {i < stage ? <Check size={13} /> : i === stage ? <Loader2 size={13} className="animate-spin" /> : <span className="w-[13px]" />}
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-brand-950/50">
        ياخذ غالبًا ١٥–٢٠ ثانية. تقدرون تتنقلون لأي قسم — البحث يكمل بالخلفية وبيطلع لكم إشعار لما يخلص.
      </p>
    </div>
  );
}

function ResultCard({
  result,
  index,
  addedById,
  projectTitle,
  addPaper,
}: {
  result: ResearchSearchResult;
  index: number;
  addedById: string;
  projectTitle?: string;
  addPaper: ReturnType<typeof useEvidencePapers>["addPaper"];
}) {
  const { showToast } = useToast();
  const [theme, setTheme] = useState<LiteratureTheme>(themeOptions[0].value);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [more, setMore] = useState(false);

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
      showToast({ title: "انضافت لمكتبتكم ✅", desc: "تلقونها بمكتبة الأدلة ومراجعة الأدبيات", icon: Check, tone: "brand" });
    }
  };

  const peer = result.sourceType === "peer-reviewed";

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-extrabold text-brand-950/50">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold leading-snug text-brand-950 hover:text-brand-600"
          >
            {result.title}
            <ExternalLink size={12} className="ms-1.5 inline text-brand-950/40" />
          </a>
          {(result.authors || result.year || result.journal) && (
            <p className="mt-1 text-xs text-brand-950/45">
              {[result.authors, result.year, result.journal].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        <span
          title={peer ? "منشورة بمجلة علمية محكّمة" : "مصدر مو مجلة محكّمة — تأكدوا منه قبل الاعتماد عليه"}
          className={`rounded-full px-2.5 py-1 ${peer ? "bg-brand-100 text-brand-700" : "bg-amber-accent-100 text-amber-accent-700"}`}
        >
          {peer ? "✓ دراسة محكّمة" : result.sourceType === "general" ? "مصدر عام — تأكدوا منه" : "مصدر غير مصنّف"}
        </span>
        {result.studyDesign && (
          <span className="rounded-full bg-sky-accent-50 px-2.5 py-1 text-sky-accent-600">{result.studyDesign}</span>
        )}
        {result.sampleSize && (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-brand-950/60">{result.sampleSize}</span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-brand-950/75">{result.summaryAr}</p>
      <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs leading-relaxed text-brand-950/65">
        <b className="font-bold text-brand-950/80">ليش تهمّكم؟ </b>
        {result.relevanceReason}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleAdd}
          disabled={adding || added}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-70"
        >
          {adding ? <Loader2 size={13} className="animate-spin" /> : added ? <Check size={13} /> : <Library size={13} />}
          {added ? "انضافت لمكتبتكم" : "أضيفوها لمكتبتكم"}
        </button>
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-brand-200 px-3.5 py-2 text-xs font-bold text-brand-950/70 hover:bg-surface-muted"
        >
          <ExternalLink size={13} />
          افتحوا الدراسة
        </a>
        <button
          onClick={() => setMore((v) => !v)}
          className="ms-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-950/50 hover:bg-surface-muted"
        >
          خيارات أكثر
          <ChevronDown size={13} className={`transition-transform ${more ? "rotate-180" : ""}`} />
        </button>
      </div>

      {more && (
        <div className="space-y-3 rounded-2xl border border-brand-100 p-3">
          {result.abstract && (
            <div>
              <PaperQA
                title={result.title}
                abstract={result.abstract}
                keyFinding={result.keyFinding}
                projectTitle={projectTitle}
              />
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-brand-950/45">
              وين تنحط بمراجعة الأدبيات؟ (تقدرون تغيّرونه بعدين)
            </span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as LiteratureTheme)}
              disabled={added}
              className="rounded-lg border border-brand-100 bg-paper px-2.5 py-1.5 text-xs outline-none focus:border-brand-300 disabled:opacity-50"
            >
              {themeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-brand-950/45">
            <a
              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${result.title}"`)}`}
              target="_blank"
              rel="noreferrer"
              title="تشوفون كم مرة اقتُبست هالدراسة"
              className="flex items-center gap-1.5 text-brand-600 hover:underline"
            >
              <GraduationCap size={13} />
              شوفوا عدد الاقتباسات بـ Google Scholar
            </a>
            {result.source && (
              <span>المصدر: {result.source === "pubmed" ? "PubMed" : result.source === "openalex" ? "OpenAlex" : "بحث ويب"}</span>
            )}
            {result.doi && (
              <span dir="ltr" className="font-mono">
                DOI {result.doi}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ResearchSearch() {
  const { currentUser, isLeader, team } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { project } = useResearchProject();
  const { addPaper } = useEvidencePapers();
  const st = useResearchAgentState();
  const aiOk = hasAiAccess(team);

  // عنوان البحث يتعبّى تلقائيًا مرة وحدة (لو الطالبة ما كتبت شي بعد)
  useEffect(() => {
    if (project?.title) {
      if (!st.topic) st.setTopic(project.title);
      if (!st.strategyTopic) st.setStrategyTopic(project.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.title]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usedThisMonth = st.searches.filter((s) => new Date(s.createdAt) >= monthStart).length;
  const left = Math.max(0, SEARCH_MONTHLY_LIMIT - usedThisMonth);

  const busyOn: Record<ResearchTab, boolean> = { papers: st.searching, tools: st.toolsBusy, strategy: st.strategyBusy };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">وكيل البحث العلمي</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-950/55">
          يدوّر لكم على الدراسات السابقة اللي تحتاجونها لمقترح بحثكم، ويلخّصها بالعربي — بدل ما تضيعون ساعات تدوّرون بأنفسكم.
          المصادر حقيقية (PubMed وOpenAlex)، وكل دراسة لها رابطها الأصلي.
        </p>
      </div>

      {!aiOk && <AiLockedCard feature="وكيل البحث العلمي" />}

      {aiOk && <HowItWorks />}

      {aiOk && (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {tabs.map(({ id, label, when, icon: Icon }) => {
            const active = st.tab === id;
            return (
              <button
                key={id}
                onClick={() => st.setTab(id)}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 text-start transition-colors ${
                  active
                    ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/40"
                    : "border-brand-100 bg-paper hover:bg-surface-muted"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    active ? "bg-brand-500 text-white" : "bg-surface-muted text-brand-950/50"
                  }`}
                >
                  {busyOn[id] ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-brand-950">{label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-brand-950/55">{when}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {aiOk && st.tab === "tools" && <ToolsFinder />}
      {aiOk && st.tab === "strategy" && <SearchStrategy />}

      {aiOk && st.tab === "papers" && (
        <Card tone="cream">
          <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-brand-950">
            <Search size={18} className="text-brand-500" />
            وش موضوع بحثكم؟
          </h3>
          <p className="mb-3 text-xs text-brand-950/50">
            اكتبوا العنوان أو الفكرة بجملة وحدة. كل ما كان أوضح (الفئة + الموضوع) كانت النتائج أدق.
          </p>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={st.topic}
              onChange={(e) => st.setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && st.startSearch()}
              placeholder="مثال: الاحتراق الوظيفي لدى ممرضات العناية المركزة"
              className="w-full rounded-lg border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
            />
            <button
              onClick={st.startSearch}
              disabled={st.searching || !st.topic.trim()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {st.searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {st.searching ? "جاري البحث..." : "ابحث"}
            </button>
          </div>

          {!st.topic.trim() && !st.searching && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-brand-950/40">جرّبوا مثلًا:</span>
              {exampleTopics.map((ex) => (
                <button
                  key={ex}
                  onClick={() => st.setTopic(ex)}
                  className="rounded-full border border-brand-100 bg-paper px-3 py-1 text-xs text-brand-700 hover:bg-surface-muted"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {st.searching && <SearchProgress />}

          {!st.searching && (
            <p className="mt-3 text-[11px] text-brand-950/45">
              استخدمتم {usedThisMonth} من {SEARCH_MONTHLY_LIMIT} عمليات بحث هالشهر (باقي {left}). فتح بحث قديم من القائمة بالأسفل ما يحسب عليكم.
            </p>
          )}

          {st.topic.trim() && (
            <a
              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(st.topic.trim())}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
            >
              <GraduationCap size={13} />
              تبون تدوّرون بنفس العنوان في Google Scholar؟ (يفتح بنافذة جديدة)
            </a>
          )}
          {st.searchError && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{st.searchError}</p>
          )}
          {st.limitMessage && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-accent-50 px-3 py-2.5 text-sm font-medium text-amber-accent-700">
              <Sparkles size={15} className="mt-0.5 shrink-0" />
              {st.limitMessage}
            </p>
          )}
        </Card>
      )}

      {st.tab === "papers" && st.activeResult && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-extrabold text-brand-950">
              {st.activeResult.results.length > 0
                ? `لقينا ${st.activeResult.results.length} دراسة قريبة من «${st.activeResult.queryText}»`
                : "ما لقينا نتائج"}
            </p>
            {st.activeResult.results.length > 0 && (
              <p className="text-xs text-brand-950/50">مرتّبة من الأقرب لموضوعكم للأبعد. ابدأوا من الأولى.</p>
            )}
          </div>

          {st.activeResult.noveltyNote && (
            <Card tone="teal" className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-bold text-brand-950">وش يميّز بحثكم عن اللي انكتب؟</p>
                <p className="mt-1 text-sm leading-relaxed text-brand-950/70">{st.activeResult.noveltyNote}</p>
                <p className="mt-1.5 text-[11px] text-brand-950/45">
                  هذا تقدير سريع مبني على الدراسات اللي ظهرت — يساعدكم تفكرون بالفجوة البحثية، ومو حكم نهائي. اعرضوه على المشرفة.
                </p>
              </div>
            </Card>
          )}

          {st.activeResult.results.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="ما لقينا نتائج كافية"
                desc="جرّبوا تعدّلون صياغة العنوان أو تخصّصونه أكثر (مثلًا: أضيفوا الفئة أو المكان)."
              />
            </Card>
          ) : (
            st.activeResult.results.map((r, i) => (
              <ResultCard
                key={`${r.url}-${i}`}
                result={r}
                index={i}
                addedById={currentUser?.id ?? ""}
                projectTitle={project?.title}
                addPaper={addPaper}
              />
            ))
          )}
        </div>
      )}

      <div className={aiOk && st.tab === "papers" ? "space-y-3" : "hidden"}>
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
            <BadgeCheck size={16} className="text-brand-500" />
            عمليات البحث السابقة
          </h3>
          <p className="text-xs text-brand-950/45">اضغطوا على أي بحث لعرض نتائجه مرة ثانية — مجانًا وبدون ما يحسب من حدكم.</p>
        </div>
        {st.searchesLoading ? (
          <p className="text-sm text-brand-950/45">جاري التحميل...</p>
        ) : st.searches.length === 0 ? (
          <Card>
            <EmptyState
              icon={Search}
              title={g(isFemale, "ما بحثتوا بعد", "ما بحثتوا بعد")}
              desc="أول بحث تسوّونه بيظهر هنا عشان ترجعون له بدون إعادة البحث."
            />
          </Card>
        ) : (
          st.searches.map((s) => (
            <Card key={s.id} interactive className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  st.showSearch(s);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
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
                      onClick: () => st.deleteSearch(s.id),
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
