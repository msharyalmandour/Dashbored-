import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  Wand2,
  Trash2,
  X,
} from "lucide-react";
import { FilterPill, ResearchHeader, SourceBadge, SourceLogo, glassCard, gradientPill, sourceKey } from "../components/ui/researchUi";
import AiLockedCard from "../components/AiLockedCard";
import PaperQA from "../components/research/PaperQA";
import ToolsFinder from "../components/research/ToolsFinder";
import SearchStrategy from "../components/research/SearchStrategy";
import { hasAiAccess } from "../lib/plans";
import EmptyState from "../components/ui/EmptyState";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AgentKickstart from "../components/AgentKickstart";
import ProjectAgentChat from "../components/ProjectAgentChat";
import { useResearchAgentState, type ResearchTab } from "../context/ResearchAgentContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import type { LiteratureTheme, ResearchSearchResult } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";
import { formatTimestampLong } from "../lib/date";

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
    <div className={`${glassCard} relative p-5`}>
      <button
        onClick={close}
        title="إخفاء الشرح"
        aria-label="إخفاء الشرح"
        className="absolute end-3 top-3 rounded-full p-1.5 text-[#B8ADA2] hover:text-[#F4F0EC]"
      >
        <X size={15} />
      </button>
      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold">
        <Lightbulb size={16} className="text-[#FFB444]" />
        أول مرة؟ كذا تستخدمونه بثلاث خطوات
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map(([n, title, desc]) => (
          <div key={n} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#FF8A24] text-xs font-extrabold text-[#FFB444]">
              {n}
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#B8ADA2]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div className="mt-4 rounded-2xl bg-white/[0.05] p-4 text-start" role="status" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] transition-all duration-1000"
          style={{ width: `${Math.min(92, 12 + sec * 4.5)}%` }}
        />
      </div>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 text-xs font-semibold ${
              i < stage ? "text-[#FFB444]" : i === stage ? "text-[#F4F0EC]" : "text-[#F4F0EC]/30"
            }`}
          >
            {i < stage ? <Check size={13} /> : i === stage ? <Loader2 size={13} className="animate-spin" /> : <span className="w-[13px]" />}
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-[#B8ADA2]">
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
  const sourceLabel = result.source === "pubmed" ? "PubMed" : result.source === "openalex" ? "OpenAlex" : "بحث ويب";

  return (
    <div className="space-y-3 rounded-2xl bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge>
            <span className="flex items-center gap-1.5">
              {sourceKey(result.source) && <SourceLogo name={sourceKey(result.source)!} size={16} />}
              {sourceLabel}
            </span>
          </SourceBadge>
          <span
            title={peer ? "منشورة بمجلة علمية محكّمة" : "مصدر مو مجلة محكّمة — تأكدوا منه قبل الاعتماد عليه"}
            className={`text-[11px] font-semibold ${peer ? "text-[#7fd6a0]" : "text-[#FFB444]"}`}
          >
            {peer ? "✓ دراسة محكّمة" : result.sourceType === "general" ? "مصدر عام — تأكدوا منه" : "مصدر غير مصنّف"}
          </span>
          {result.studyDesign && <span className="rounded-full border border-white/[0.14] px-2.5 py-0.5 text-[11px] text-[#B8ADA2]">{result.studyDesign}</span>}
          {result.sampleSize && <span className="rounded-full border border-white/[0.14] px-2.5 py-0.5 text-[11px] text-[#B8ADA2]">{result.sampleSize}</span>}
        </div>
        <span className="text-sm text-[#B8ADA2]">{result.year ?? ""}</span>
      </div>

      <a href={result.url} target="_blank" rel="noreferrer" dir="auto" className="block text-[17px] font-bold leading-snug hover:text-[#FFB444]">
        <span className="me-2 text-sm font-semibold text-[#B8ADA2]">{index + 1}.</span>
        {result.title}
      </a>
      {(result.authors || result.journal) && (
        <p className="text-xs text-[#B8ADA2]/80" dir="auto">
          {[result.authors, result.journal].filter(Boolean).join(" · ")}
        </p>
      )}

      <p className="text-[15px] leading-relaxed text-[#B8ADA2]">{result.summaryAr}</p>
      <p className="rounded-2xl bg-white/[0.05] px-4 py-2.5 text-xs leading-relaxed text-[#B8ADA2]">
        <b className="font-bold text-[#F4F0EC]">ليش تهمّكم؟ </b>
        {result.relevanceReason}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <button
          onClick={handleAdd}
          disabled={adding || added}
          className="flex items-center gap-1.5 font-bold text-[#FFB444] hover:text-[#FFC85A] disabled:opacity-70"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : added ? <Check size={14} /> : <Library size={14} />}
          {added ? "انضافت للمكتبة" : "+ أضف للمكتبة"}
        </button>
        <a href={result.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#B8ADA2] hover:text-[#F4F0EC]">
          <ExternalLink size={13} />
          الدراسة الأصلية
        </a>
        <button
          onClick={() => setMore((v) => !v)}
          className="ms-auto flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-[#B8ADA2] hover:text-[#F4F0EC]"
        >
          خيارات أكثر
          <ChevronDown size={13} className={`transition-transform ${more ? "rotate-180" : ""}`} />
        </button>
      </div>

      {more && (
        <div className="space-y-3 rounded-2xl border border-white/10 p-4">
          {result.abstract && (
            <div>
              <PaperQA title={result.title} abstract={result.abstract} keyFinding={result.keyFinding} projectTitle={projectTitle} />
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-[#B8ADA2]">وين تنحط بمراجعة الأدبيات؟ (تقدرون تغيّرونه بعدين)</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as LiteratureTheme)}
              disabled={added}
              className="rounded-full border border-[rgba(255,200,130,.4)] bg-white/[0.06] px-3 py-1.5 text-xs text-[#F4F0EC] outline-none focus:border-[#FF8A24] disabled:opacity-50"
            >
              {themeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#B8ADA2]">
            <a
              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${result.title}"`)}`}
              target="_blank"
              rel="noreferrer"
              title="تشوفون كم مرة اقتُبست هالدراسة"
              className="flex items-center gap-1.5 text-[#FFB444] hover:underline"
            >
              <GraduationCap size={13} />
              شوفوا عدد الاقتباسات بـ Google Scholar
            </a>
            {result.doi && (
              <span dir="ltr" className="font-mono">
                DOI {result.doi}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
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

  const resultsRef = useRef<HTMLDivElement>(null);
  const [params] = useSearchParams();
  const view: "agent" | "studies" = params.get("tab") === "studies" ? "studies" : "agent";

  // أول ما تطلع نتائج جديدة، ننزل لها — الطالب ما يضطر يدوّر عنها تحت
  useEffect(() => {
    if (view === "studies" && st.activeResult) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.activeResult]);

  if (view === "agent") {
    return (
      <div className="space-y-5">
        {!aiOk && <AiLockedCard feature="وكيل البحث العلمي" />}
        {aiOk && <ProjectAgentChat />}
        {aiOk && (
          <details className="group rounded-3xl border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.88)] px-5 py-4 backdrop-blur-xl open:pb-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[#F4F0EC]">
              <span>
                جهّزوا لنا البداية
                <span className="ms-2 text-xs font-normal text-[#B8ADA2]">دراسات + فجوة + أسئلة + مهام، وأنتم توافقون على اللي يعجبكم</span>
              </span>
              <ChevronDown size={16} className="shrink-0 text-[#B8ADA2] transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <AgentKickstart />
            </div>
          </details>
        )}
      </div>
    );
  }

  const activeTab = tabs.find((t) => t.id === st.tab) ?? tabs[0];
  const fieldPill =
    "min-w-0 flex-1 bg-transparent text-base text-[#F4F0EC] outline-none placeholder:text-[#8F8378] md:text-[17px]";

  return (
    <div className="space-y-6">
      {!aiOk && <AiLockedCard feature="وكيل البحث العلمي" />}

      {aiOk && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <FilterPill key={t.id} active={st.tab === t.id} onClick={() => st.setTab(t.id)}>
              {busyOn[t.id] ? `${t.label} …` : t.label}
            </FilterPill>
          ))}
        </div>
      )}

      {aiOk && <HowItWorks />}

      {aiOk && st.tab === "papers" && (
        <section className="relative isolate overflow-hidden rounded-[32px] border border-[rgba(255,107,0,.3)] bg-[radial-gradient(ellipse_at_50%_0%,#2E0E04_0,#140804_55%,#0A0605_100%)] px-5 py-10 text-center text-[#F4F0EC] sm:px-8 md:py-12">
          <div aria-hidden className="pointer-events-none absolute left-1/2 -top-[160px] -z-10 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-[#E8400A] opacity-40 blur-[100px]" />
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-4">
            <h1 className="font-kufi text-3xl font-extrabold leading-tight md:text-5xl">عن وش تدوّرون؟</h1>
            <p className="text-base font-light text-[#B8ADA2] md:text-lg">نبحث في <bdi>PubMed</bdi> و<bdi>OpenAlex</bdi> مع بعض، ونلخّص لكم كل دراسة بالعربي.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                st.startSearch();
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-full border border-[rgba(255,200,130,.4)] bg-white/[0.06] py-2 ps-2 pe-6 shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-[22px]"
            >
              <input
                value={st.topic}
                onChange={(e) => st.setTopic(e.target.value)}
                placeholder="مثال: الاحتراق الوظيفي لدى ممرضات العناية المركزة"
                aria-label="موضوع البحث"
                dir="auto"
                className={fieldPill}
              />
              <button type="submit" disabled={st.searching || !st.topic.trim()} className={`${gradientPill} !px-7 !py-3 shrink-0`}>
                {st.searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {st.searching ? "جاري البحث..." : "ابحث"}
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#B8ADA2]">
              <span>المصادر:</span>
              {([["pubmed", "PubMed"], ["openalex", "OpenAlex"]] as const).map(([k, label]) => (
                <span key={k} className="flex items-center gap-2 rounded-full border border-[#FF8A24]/50 py-1 ps-3.5 pe-1.5 text-[#F4F0EC]">
                  <Check size={13} className="text-[#FFB444]" />
                  {label}
                  <SourceLogo name={k} />
                </span>
              ))}
              <a
                href={`https://scholar.google.com/scholar?q=${encodeURIComponent(st.topic.trim())}`}
                target="_blank"
                rel="noreferrer"
                title="يفتح Google Scholar بنفس العنوان بنافذة جديدة — مو داخل بحث Wesync"
                className="flex items-center gap-2 rounded-full border border-dashed border-white/25 py-1 ps-3.5 pe-1.5 text-[#E6DBD1] transition hover:border-[#FF8A24]/60"
              >
                <ExternalLink size={12} />
                Google Scholar
                <SourceLogo name="scholar" />
              </a>
            </div>
            <p className="-mt-1 text-[11px] text-[#B8ADA2]/80">النتائج تجي من <bdi>PubMed</bdi> و<bdi>OpenAlex</bdi>، و<bdi>Google Scholar</bdi> يفتح ببحث خارجي بنفس عنوانكم.</p>

            {!st.topic.trim() && !st.searching && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-[#B8ADA2]/70">جرّبوا مثلًا:</span>
                {exampleTopics.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => st.setTopic(ex)}
                    className="rounded-full border border-white/[0.14] px-3.5 py-1 text-xs text-[#E6DBD1] transition hover:border-[#FF8A24]/60 hover:bg-[#FF6B00]/10"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {st.searching && <div className="w-full"><SearchProgress /></div>}

            {!st.searching && (
              <p className="text-[11px] text-[#B8ADA2]/80">
                استخدمتم {usedThisMonth} من {SEARCH_MONTHLY_LIMIT} عمليات بحث هالشهر (باقي {left}). فتح بحث قديم من القائمة بالأسفل ما يحسب عليكم.
              </p>
            )}

            {st.searchError && <p className="rounded-2xl bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300">{st.searchError}</p>}
            {st.limitMessage && (
              <p className="flex items-start gap-2 rounded-2xl bg-[#FF6B00]/10 px-4 py-2.5 text-start text-sm font-medium text-[#FFB444]">
                <Wand2 size={15} className="mt-0.5 shrink-0" />
                {st.limitMessage}
              </p>
            )}
          </div>
        </section>
      )}

      {aiOk && st.tab !== "papers" && (
        <ResearchHeader title={activeTab.label} subtitle={activeTab.when} />
      )}

      {aiOk && st.tab === "tools" && <ToolsFinder />}
      {aiOk && st.tab === "strategy" && <SearchStrategy />}

      {st.tab === "papers" && st.activeResult && (
        <div ref={resultsRef} className={`${glassCard} scroll-mt-24 space-y-4 p-6`}>
          <div>
            <h2 className="font-kufi text-2xl font-extrabold">النتائج</h2>
            <p className="mt-1 text-sm text-[#B8ADA2]">
              {st.activeResult.results.length > 0
                ? `لقينا ${st.activeResult.results.length} دراسة قريبة من «${st.activeResult.queryText}» — مرتّبة من الأقرب لموضوعكم للأبعد.`
                : "ما لقينا نتائج"}
            </p>
          </div>

          {st.activeResult.noveltyNote && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#FF8A24]/30 bg-[#FF6B00]/[0.06] p-4">
              <Wand2 size={18} className="mt-0.5 shrink-0 text-[#FFB444]" />
              <div>
                <p className="text-sm font-bold">وش يميّز بحثكم عن اللي انكتب؟</p>
                <p className="mt-1 text-sm leading-relaxed text-[#B8ADA2]">{st.activeResult.noveltyNote}</p>
                <p className="mt-1.5 text-[11px] text-[#B8ADA2]/70">
                  هذا تقدير سريع مبني على الدراسات اللي ظهرت — يساعدكم تفكرون بالفجوة البحثية، ومو حكم نهائي. اعرضوه على المشرفة.
                </p>
              </div>
            </div>
          )}

          {st.activeResult.results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="ما لقينا نتائج كافية"
              desc="جرّبوا تعدّلون صياغة العنوان أو تخصّصونه أكثر (مثلًا: أضيفوا الفئة أو المكان)."
            />
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
          <h3 className="flex items-center gap-2 font-kufi text-lg font-bold">
            <BadgeCheck size={16} className="text-[#FFB444]" />
            عمليات البحث السابقة
          </h3>
          <p className="text-xs text-[#B8ADA2]">اضغطوا على أي بحث لعرض نتائجه مرة ثانية — مجانًا وبدون ما يحسب من حدكم.</p>
        </div>
        {st.searchesLoading ? (
          <p className="text-sm text-[#B8ADA2]">جاري التحميل...</p>
        ) : st.searches.length === 0 ? (
          <div className={`${glassCard} p-2`}>
            <EmptyState
              icon={Search}
              title={g(isFemale, "ما بحثتوا بعد", "ما بحثتوا بعد")}
              desc="أول بحث تسوّونه بيظهر هنا عشان ترجعون له بدون إعادة البحث."
            />
          </div>
        ) : (
          st.searches.map((s) => (
            <div key={s.id} className={`${glassCard} flex items-center justify-between gap-3 px-5 py-3.5 transition hover:border-[#FF8A24]/60`}>
              <button
                onClick={() => {
                  st.showSearch(s);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="min-w-0 flex-1 text-start"
              >
                <p className="truncate text-sm font-bold" dir="auto">{s.queryText}</p>
                <p className="text-xs text-[#B8ADA2]">
                  {[formatTimestampLong(s.createdAt), `${s.results.length} نتيجة`].filter(Boolean).join(" · ")}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
