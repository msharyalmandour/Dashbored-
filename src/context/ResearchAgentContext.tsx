import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Loader2, Search } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { useResearchSearch } from "../hooks/useResearchSearch";
import { useResearchAgent } from "../hooks/useResearchAgent";
import type { ResearchSearchQuery, ResearchSearchResult, SearchStrategy, ToolFinding } from "../data/types";

export type ResearchTab = "papers" | "tools" | "strategy";

interface ActiveResult {
  results: ResearchSearchResult[];
  noveltyNote: string | null;
  queryText: string;
}

interface ResearchAgentValue {
  tab: ResearchTab;
  setTab: (t: ResearchTab) => void;

  // دراسات قريبة
  topic: string;
  setTopic: (v: string) => void;
  searching: boolean;
  activeResult: ActiveResult | null;
  showSearch: (s: ResearchSearchQuery) => void;
  searchError: string | null;
  limitMessage: string | null;
  startSearch: () => Promise<void>;
  searches: ResearchSearchQuery[];
  searchesLoading: boolean;
  deleteSearch: (id: string) => Promise<{ error?: string }>;

  // أدوات القياس
  toolsForm: { construct: string; population: string };
  setToolsForm: (f: { construct: string; population: string }) => void;
  toolsBusy: boolean;
  toolsResult: { tools: ToolFinding[]; caveat: string } | null;
  toolsMessage: string | null;
  startTools: () => Promise<void>;

  // استراتيجية البحث
  strategyTopic: string;
  setStrategyTopic: (v: string) => void;
  strategyBusy: boolean;
  strategy: SearchStrategy | null;
  strategyMessage: string | null;
  startStrategy: () => Promise<void>;
}

const Ctx = createContext<ResearchAgentValue | undefined>(undefined);

/** حالة وكيل البحث تعيش هنا (فوق الصفحات) — عشان التحميل والنتائج ما تختفي
    لما الطالبة تتنقل لقسم ثاني وترجع. الطلب نفسه يكمل بالخلفية، ومؤشر عائم
    يقول "جاري البحث" وبعدها "النتائج جاهزة" بأي صفحة. */
export function ResearchAgentProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const onResearchPage = location.pathname === "/research-search";
  const onPageRef = useRef(onResearchPage);
  useEffect(() => {
    onPageRef.current = onResearchPage;
  }, [onResearchPage]);

  const { searches, loading: searchesLoading, searching, runSearch, deleteSearch } = useResearchSearch();
  const agent = useResearchAgent();

  const [tab, setTab] = useState<ResearchTab>("papers");
  const [topic, setTopic] = useState("");
  const [activeResult, setActiveResult] = useState<ActiveResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const [toolsForm, setToolsForm] = useState({ construct: "", population: "" });
  const [toolsBusy, setToolsBusy] = useState(false);
  const [toolsResult, setToolsResult] = useState<{ tools: ToolFinding[]; caveat: string } | null>(null);
  const [toolsMessage, setToolsMessage] = useState<string | null>(null);

  const [strategyTopic, setStrategyTopic] = useState("");
  const [strategyBusy, setStrategyBusy] = useState(false);
  const [strategy, setStrategy] = useState<SearchStrategy | null>(null);
  const [strategyMessage, setStrategyMessage] = useState<string | null>(null);

  // نتائج جاهزة لسا ما شافتها الطالبة (لأنها كانت بصفحة ثانية)
  const [unseen, setUnseen] = useState<ResearchTab | null>(null);
  useEffect(() => {
    if (onResearchPage) setUnseen(null);
  }, [onResearchPage]);

  const finished = useCallback(
    (which: ResearchTab, title: string, desc: string) => {
      if (onPageRef.current) return;
      setUnseen(which);
      showToast({ title, desc, icon: Check, tone: "brand" });
    },
    [showToast],
  );

  const startSearch = useCallback(async () => {
    const q = topic.trim();
    if (!q || !currentUser || searching) return;
    setSearchError(null);
    setLimitMessage(null);
    setActiveResult(null);
    setTab("papers");
    const { row, error, limitMessage: limit } = await runSearch(q, currentUser.id);
    if (limit) {
      setLimitMessage(limit);
      return;
    }
    if (error || !row) {
      setSearchError("تعذّر إتمام البحث — حاولوا مرة ثانية.");
      return;
    }
    setActiveResult({ results: row.results, noveltyNote: row.noveltyNote, queryText: row.queryText });
    finished("papers", "نتائج البحث جاهزة ✅", `${row.results.length} دراسة قريبة من بحثكم — افتحوا وكيل البحث`);
  }, [topic, currentUser, searching, runSearch, finished]);

  const showSearch = useCallback((s: ResearchSearchQuery) => {
    setSearchError(null);
    setLimitMessage(null);
    setActiveResult({ results: s.results, noveltyNote: s.noveltyNote, queryText: s.queryText });
  }, []);

  const startTools = useCallback(async () => {
    const construct = toolsForm.construct.trim();
    if (!construct || toolsBusy) return;
    setToolsMessage(null);
    setToolsResult(null);
    setToolsBusy(true);
    const r = await agent.findTools(construct, toolsForm.population.trim());
    setToolsBusy(false);
    if (r.message) {
      setToolsMessage(r.message);
      return;
    }
    setToolsResult({ tools: r.tools, caveat: r.caveat });
    finished("tools", "أدوات القياس جاهزة ✅", `${r.tools.length} أداة مقترحة`);
  }, [toolsForm, toolsBusy, agent, finished]);

  const startStrategy = useCallback(async () => {
    const t = strategyTopic.trim();
    if (!t || strategyBusy) return;
    setStrategyMessage(null);
    setStrategy(null);
    setStrategyBusy(true);
    const r = await agent.buildStrategy(t);
    setStrategyBusy(false);
    if (r.message || !r.strategy) {
      setStrategyMessage(r.message ?? "تعذّر بناء الاستراتيجية — حاولوا مرة ثانية.");
      return;
    }
    setStrategy(r.strategy);
    finished("strategy", "خطة البحث جاهزة ✅", "كلمات مفتاحية وجمل بحث جاهزة للنسخ");
  }, [strategyTopic, strategyBusy, agent, finished]);

  const running: ResearchTab | null = searching ? "papers" : toolsBusy ? "tools" : strategyBusy ? "strategy" : null;
  const pillTarget = running ?? unseen;

  const value = useMemo<ResearchAgentValue>(
    () => ({
      tab, setTab,
      topic, setTopic, searching, activeResult, showSearch, searchError, limitMessage, startSearch,
      searches, searchesLoading, deleteSearch,
      toolsForm, setToolsForm, toolsBusy, toolsResult, toolsMessage, startTools,
      strategyTopic, setStrategyTopic, strategyBusy, strategy, strategyMessage, startStrategy,
    }),
    [
      tab, topic, searching, activeResult, showSearch, searchError, limitMessage, startSearch,
      searches, searchesLoading, deleteSearch,
      toolsForm, toolsBusy, toolsResult, toolsMessage, startTools,
      strategyTopic, strategyBusy, strategy, strategyMessage, startStrategy,
    ],
  );

  const pillLabel: Record<ResearchTab, string> = {
    papers: "دراسات قريبة",
    tools: "أدوات القياس",
    strategy: "خطة البحث",
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* مؤشر عائم: يبان بأي صفحة غير صفحة الوكيل طول ما فيه بحث شغّال أو نتيجة ما انشافت */}
      {!onResearchPage && pillTarget && (
        <Link
          to="/research-search"
          onClick={() => setTab(pillTarget)}
          className="fixed bottom-6 end-6 z-40 flex max-w-[calc(100vw-7rem)] items-center gap-2.5 rounded-full border border-brand-200/60 bg-paper/85 py-2.5 pe-5 ps-3 text-sm font-bold text-brand-950 shadow-xl backdrop-blur-xl transition-transform hover:scale-[1.02] print:hidden"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
              running ? "bg-brand-500" : "bg-emerald-500"
            }`}
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          </span>
          <span className="min-w-0">
            <span className="block truncate">
              {running ? `جاري البحث: ${pillLabel[pillTarget]}` : `جاهزة: ${pillLabel[pillTarget]} — اضغطوا للعرض`}
            </span>
            {running && <span className="block truncate text-[11px] font-medium text-brand-950/50">تقدرون تكملون شغلكم، نخبركم لما نخلّص</span>}
          </span>
          {!running && <Search size={14} className="shrink-0 text-brand-950/40" />}
        </Link>
      )}
    </Ctx.Provider>
  );
}

export function useResearchAgentState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useResearchAgentState must be used within ResearchAgentProvider");
  return ctx;
}
