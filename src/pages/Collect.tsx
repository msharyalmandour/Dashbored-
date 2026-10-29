import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ChevronLeft, ClipboardList, FileSignature, FolderOpen, Library, Mic, ShieldCheck, Users } from "lucide-react";
import AgentWave from "../components/ui/AgentWave";
import clsx from "clsx";
import { V3Glow, num } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useSurveys, useSurveyResponseCounts, useSurveyResponses, type Survey, type SurveyResponse } from "../hooks/useSurveys";
import { useMethodology } from "../hooks/useMethodology";
import { useEthicalApproval } from "../hooks/useEthicalApproval";
import { useChecklist } from "../hooks/useChecklist";
import { summarizeCollection } from "../lib/dataCollection";
import { computeStations, cumulativeByDay, isQualitative, unitLabel, type StationKey, type StationState } from "../lib/collectStations";
import { getDriveStatus, peekDriveStatus, type DriveStatus } from "../lib/driveTeam";
import { openAgent } from "../lib/agentBus";
import { relativeDayLabel } from "../lib/date";
import { useInterviews } from "../hooks/useInterviews";
import InterviewLog from "../components/collect/InterviewLog";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { isEn, tr } from "../lib/i18n";

const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

const STATE_LABEL: Record<StationState, string> = { done: tr("خلص"), now: tr("الحين"), next: tr("الجاي") };
const STATE_CLASS: Record<StationState, string> = { done: "done", now: "doing", next: "todo" };

const STATION_META: Record<StationKey, { ar: string; en: string; icon: typeof ClipboardList; to: string }> = {
  instrument: { ar: tr("أداة القياس"), en: "Instrument", icon: ClipboardList, to: "/surveys" },
  consent: { ar: tr("الموافقات"), en: "Consent", icon: ShieldCheck, to: "/ethical-approval" },
  field: { ar: tr("الميدان"), en: "Fieldwork", icon: Users, to: "/fieldwork" },
  analysis: { ar: tr("التحليل"), en: "Analysis", icon: BarChart3, to: "/stats" },
};

const ETHICS_LABEL: Record<string, string> = {
  pending: tr("الموافقة الأخلاقية بانتظار الرد"),
  granted: tr("الموافقة الأخلاقية تمّت"),
  amendments: tr("اللجنة طالبة تعديلات"),
  rejected: tr("الطلب انرفض — راجعوه"),
};

/** بيانات العرض التجريبي (بدون Supabase) — عشان الصفحة تنشاف كاملة. ما تنحفظ بأي مكان. */
const DEMO_SURVEY: Survey = {
  id: "demo-collect",
  title: tr("استبيان غموض الدور لدى المتدربين"),
  goal: "",
  intro: "",
  consentText: "",
  questions: Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, type: "likert" as const, text: "", required: true })),
  status: "open",
  isPilot: false,
  targetN: 24,
  publicToken: "demo",
  createdAt: "2026-10-10T08:00:00Z",
  updatedAt: "2026-10-10T08:00:00Z",
};
const DEMO_RESPONSES: SurveyResponse[] = [18, 15, 15, 12, 9, 6, 4, 2, 1].map((daysAgo, i) => ({
  id: `demo-r${i}`,
  answers: Object.fromEntries(Array.from({ length: i === 8 ? 9 : 12 }, (_, q) => [`q${q}`, 4])),
  createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
}));

export default function Collect() {
  const { currentUser, canWrite } = useAuth();
  const { interviews, addInterview, updateInterview, removeInterview } = useInterviews();
  const { project } = useResearchProject();
  const { surveys: realSurveys, loading } = useSurveys();
  const realCounts = useSurveyResponseCounts(realSurveys);
  const { methodology } = useMethodology();
  const { ethicalApproval } = useEthicalApproval();
  const { done: checklist } = useChecklist("before-data", project?.id ?? null, currentUser?.id ?? null);
  const [showAll, setShowAll] = useState(false);

  const demo = !isSupabaseConfigured && realSurveys.length === 0;
  const surveys = useMemo(() => (demo ? [DEMO_SURVEY] : realSurveys), [demo, realSurveys]);
  const counts = useMemo(() => (demo ? { [DEMO_SURVEY.id]: DEMO_RESPONSES.length } : realCounts), [demo, realCounts]);
  const researchType = project?.researchType || "quantitative";
  const qual = isQualitative(researchType);

  // الاستبيان الرئيسي = أكثر استبيان (مو تجريبي) فيه ردود، وإلا أحدث واحد
  const main = useMemo(() => {
    const list = surveys.filter((s) => !s.isPilot);
    return [...list].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))[0];
  }, [surveys, counts]);
  const { responses: realResponses } = useSurveyResponses(demo ? undefined : main?.id);
  const responses = demo ? DEMO_RESPONSES : realResponses;

  const summary = summarizeCollection(surveys, counts, methodology.sampling.sampleSize);
  // الكيفي: المقابلات اللي انعملت (مو المجدولة) من سجل المقابلات
  const doneInterviews = interviews.filter((i) => i.status !== "planned");
  const collected = qual ? doneInterviews.length : summary.collected;
  const target = qual ? summary.target ?? null : summary.target;

  const stations = computeStations({
    researchType,
    hasInstrument: !!main && main.questions.length > 0,
    toolChecked: !!checklist.tool,
    ethicsGranted: ethicalApproval.outcome === "granted",
    consentChecked: !!checklist.consent,
    collected,
    target,
  });
  const current = stations.find((s) => s.state === "now")!;

  // مجلد البيانات = مجلد درايف الفريق (لو مربوط)
  const [drive, setDrive] = useState<DriveStatus | null>(() => peekDriveStatus(currentUser?.id));
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    getDriveStatus().then((s) => alive && !s.unreachable && setDrive(s));
    return () => {
      alive = false;
    };
  }, []);
  const folderLink = drive?.connected ? drive.folderLink : null;

  const lastResponse = responses[responses.length - 1];

  // سطر كل محطة
  const lines: Record<StationKey, [string, string]> = {
    instrument: main
      ? [
          tr("{0} · {1} سؤال", main.title || tr("استبيان بدون عنوان"), num(main.questions.length)),
          main.status === "open" ? tr("مفتوح للردود") : main.status === "closed" ? tr("مقفول") : tr("مسودة"),
        ]
      : qual
        ? [methodology.dataCollectionMethods[0] || tr("دليل المقابلة"), checklist.tool ? tr("النسخة النهائية جاهزة") : tr("جهّزوا الأسئلة واعتمدوها")]
        : [tr("ما فيه استبيان بعد"), tr("ابنوه من منشئ الاستبيان")],
    consent: [
      ETHICS_LABEL[ethicalApproval.outcome] ?? ETHICS_LABEL.pending,
      checklist.consent ? tr("نموذج الموافقة جاهز") : tr("نموذج الموافقة في حقيبة الاستبيان"),
    ],
    field: qual
      ? [
          target ? tr("{0} من {1} {2}", collected === 0 ? "0" : num(collected), num(target), unitLabel(researchType, target)) : collected === 0 ? tr("ما انعملت مقابلة للحين") : tr("{0} {1}", num(collected), unitLabel(researchType, collected)),
          doneInterviews.length ? tr("آخر مقابلة {0}", doneInterviews[doneInterviews.length - 1].date ? relativeDayLabel(doneInterviews[doneInterviews.length - 1].date!) : "—") : tr("الهدف حتى التشبّع"),
        ]
      : [
          target ? tr("{0} من {1} {2}", num(collected), num(target), unitLabel(researchType, target)) : tr("{0} {1}", num(collected), unitLabel(researchType, collected)),
          lastResponse ? tr("آخر رد {0}", relativeDayLabel(lastResponse.createdAt.slice(0, 10))) : tr("ما وصل رد للحين"),
        ],
    analysis: qual ? [tr("تحليل موضوعي"), tr("يبدأ بعد التشبّع")] : [tr("وصفي واستدلالي"), tr("يبدأ لما تكتمل العينة")],
  };

  // النقاط: نقطة لكل مشارك لين ٦٠، وبعدها كل نقطة تمثّل مجموعة
  const dotTotal = target ? Math.min(target, 60) : 0;
  const perDot = target && target > 60 ? Math.ceil(target / 60) : 1;
  const filledDots = Math.min(dotTotal, Math.floor(collected / perDot));

  const answeredOf = (r: SurveyResponse) => Object.values(r.answers).filter((v) => (Array.isArray(v) ? v.length > 0 : v !== "" && v !== null && v !== undefined)).length;
  const qCount = main?.questions.length ?? 0;
  const recent = responses
    .map((r, i) => ({ r, n: i + 1 }))
    .reverse()
    .slice(0, showAll ? 50 : 3);

  const chart = cumulativeByDay(responses.map((r) => r.createdAt));
  // التشبّع: عدد المواضيع الجديدة بكل مقابلة (بالترتيب) — لما ينزل لصفر أو قريب منه مرتين ورا بعض، قربتوا
  const themeBars = doneInterviews.filter((i) => i.newThemes !== null).map((i) => ({ id: i.id, code: i.code, n: i.newThemes ?? 0 }));
  const themeMax = Math.max(1, ...themeBars.map((b) => b.n));
  const lastTwo = themeBars.slice(-2);
  const saturationHint =
    lastTwo.length === 2 && lastTwo.every((b) => b.n <= 1)
      ? tr("آخر مقابلتين ما طلع فيهم شي جديد تقريبًا — غالبًا وصلتوا للتشبّع، راجعوها مع المشرف/ة.")
      : tr("كل عمود = مواضيع جديدة بمقابلة. لما تقل وتثبت قريب من الصفر، يعني قربتوا من التشبّع.");
  const chartMax = Math.max(target ?? 0, chart[chart.length - 1]?.total ?? 0, 1);

  const pct = target ? Math.min(100, Math.round((collected / target) * 100)) : 0;
  const stationName = (k: StationKey) => STATION_META[k].ar;

  const tools = [
    { to: "/surveys", icon: ClipboardList, title: tr("منشئ الاستبيان"), en: "Survey builder", desc: tr("للدراسات الكمية · رابط + QR") },
    { to: "/tools-library", icon: Library, title: tr("مكتبة أدوات القياس"), en: "Instruments library", desc: tr("أدوات مقننة مع مصادرها") },
    { to: "/study-kit", icon: FileSignature, title: tr("رابط الموافقة"), en: "Consent", desc: tr("نموذج الموافقة جاهز، والاستبيان يعرضه قبل الأسئلة") },
    { to: "/stats", icon: BarChart3, title: tr("استوديو الإحصاء"), en: "Stats studio", desc: tr("للكمّي: وصفي واستدلالي") },
  ];

  return (
    <div className="v3 relative">
      <V3Glow />

      {/* ── الترويسة ── */}
      <header className="v3-rise relative mb-5 flex flex-wrap items-end gap-3" style={rise(0)}>
        <div className="min-w-0 flex-[1_1_300px]">
          <div className="v3-eye">{tr("رحلة البحث · {0}", num(3))}</div>
          <h1 className="v3-k m-0 text-[30px] leading-snug sm:text-[38px]">{tr("أجمع وأحلّل")}</h1>
          {!isEn && <div className="v3-en -mt-1">Collect & Analyze</div>}
          <p className="v3-mut m-0 mt-1 text-[15px] sm:text-base">
            {tr("من الأداة للنتيجة في ٤ محطات. أنتم الحين في {0}.", stationName(current.key))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {folderLink ? (
            <a className="v3-bd" href={folderLink} target="_blank" rel="noreferrer">
              <FolderOpen size={17} aria-hidden />
              {tr("مجلد البيانات")}
            </a>
          ) : (
            <Link className="v3-bd" to="/files" title={tr("اربطوا درايف الفريق عشان يطلع مجلد البيانات")}>
              <FolderOpen size={17} aria-hidden />
              {tr("مجلد البيانات")}
            </Link>
          )}
          {qual ? (
            <Link className="v3-bw" to="/files">
              <Mic size={17} aria-hidden />
              {tr("ارفعوا تسجيل مقابلة")}
            </Link>
          ) : (
            <Link className="v3-bw" to={main ? `/surveys/${main.id}` : "/surveys"}>
              <ClipboardList size={17} aria-hidden />
              {main ? tr("افتحوا الاستبيان") : tr("ابنوا الاستبيان")}
            </Link>
          )}
        </div>
      </header>

      {demo && (
        <p className="v3-mut relative -mt-2 mb-4 text-xs">{tr("هذي بيانات تجريبية للعرض — بحسابكم تطلع ردودكم الحقيقية.")}</p>
      )}

      {/* ── المحطات الأربع ── */}
      <ol className="relative m-0 mb-5 grid list-none grid-cols-2 gap-2.5 p-0 lg:flex lg:items-stretch" aria-label={tr("محطات الجمع والتحليل")}>
        {stations.map((s, i) => {
          const meta = STATION_META[s.key];
          const Icon = meta.icon;
          const now = s.state === "now";
          return (
            <li key={s.key} className="flex min-w-0 items-stretch gap-2.5 lg:flex-1">
              <Link
                to={meta.to}
                aria-current={now ? "step" : undefined}
                className={clsx("v3-g v3-hover v3-rise flex min-w-0 flex-1 flex-col gap-2.5 !rounded-[26px] p-4 sm:p-[18px]", now && "v3-sheen v3-glow")}
                style={{
                  ...rise(i + 1),
                  ...(now
                    ? {
                        borderColor: "rgba(255,180,68,.55)",
                        background: "linear-gradient(170deg,rgba(255,130,30,.24),rgba(255,255,255,.03)), rgba(14,10,8,.72)",
                      }
                    : {}),
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="v3-k v3-mut text-sm">{num(i + 1).padStart(2, isEn ? "0" : "٠")}</span>
                  <span className={clsx("v3-st", STATE_CLASS[s.state])}>{STATE_LABEL[s.state]}</span>
                </div>
                <span
                  className="grid h-11 w-11 place-items-center rounded-[15px] sm:h-[46px] sm:w-[46px]"
                  style={now ? { background: "linear-gradient(90deg,#FF6A00,#FF9A3C)", color: "#1A0802" } : { background: "rgba(255,255,255,.07)", color: "var(--ws-c-text)" }}
                >
                  <Icon size={21} aria-hidden />
                </span>
                <div>
                  <div className="v3-k text-[17px] sm:text-[19px]">{meta.ar}</div>
                  {!isEn && <div className="v3-en">{meta.en}</div>}
                </div>
                <div className="line-clamp-2 text-sm font-bold sm:text-[15px]" dir="auto">
                  {lines[s.key][0]}
                </div>
                <div className="v3-mut -mt-1.5 text-[13px]">{lines[s.key][1]}</div>
              </Link>
              {i < stations.length - 1 && (
                <ChevronLeft
                  size={20}
                  aria-hidden
                  className="hidden shrink-0 self-center lg:block ltr:rotate-180"
                  style={{ color: s.state === "done" ? "var(--ws-c-muted)" : "rgba(255,255,255,.25)" }}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* ── المحطة الحالية + الجنب ── */}
      <div className="relative mb-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-[18px]">
        <section className="v3-g v3-rise min-w-0 p-5 sm:px-6 sm:py-[22px]" style={rise(5)} aria-labelledby="cur-title">
          <div className="mb-3.5 flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="v3-eye">{tr("المحطة الحالية")}</div>
              <h2 id="cur-title" className="v3-k m-0 text-[20px] sm:text-[22px]">
                {tr("الميدان · {0}", qual ? tr("المقابلات") : tr("الردود"))}
              </h2>
            </div>
            <div className="text-end">
              <div className="v3-k text-[40px] leading-none" dir="ltr">
                {collected === 0 ? "0" : num(collected)}
                {target !== null && <span className="text-lg opacity-60">/{num(target)}</span>}
              </div>
              <div className="v3-mut mt-1 text-xs">
                {qual ? tr("مقابلة · الهدف حتى التشبّع") : target ? tr("رد · {0}٪ من العينة", num(pct)) : tr("رد · حددوا حجم العينة بالمنهجية")}
              </div>
            </div>
          </div>

          {dotTotal > 0 && (
            <div className="mb-4">
              <div className="v3-dots flex flex-wrap gap-2" role="img" aria-label={tr("{0} من {1}", num(collected), num(target ?? 0))}>
                {Array.from({ length: dotTotal }, (_, i) => {
                  const filled = i < filledDots;
                  const next = i === filledDots;
                  return (
                    <span
                      key={i}
                      className={clsx("grid h-[30px] w-[30px] place-items-center rounded-full text-xs font-bold", next && "v3-next-dot")}
                      style={{
                        ...({ ["--v3-d" as string]: i } as CSSProperties),
                        ...(filled
                          ? { background: "linear-gradient(135deg,#FF7A10,#FFC85A)", color: "#1A0802" }
                          : { border: `1.5px dashed ${next ? "rgba(255,180,68,.7)" : "rgba(255,255,255,.2)"}`, color: next ? "#FFB444" : "var(--ws-c-muted)" }),
                      }}
                    >
                      {perDot === 1 ? num(i + 1) : ""}
                    </span>
                  );
                })}
              </div>
              {perDot > 1 && <p className="v3-mut m-0 mt-2 text-xs">{tr("كل دائرة = {0} مشاركين", num(perDot))}</p>}
            </div>
          )}

          {qual ? (
            <InterviewLog interviews={interviews} canWrite={canWrite} onAdd={addInterview} onUpdate={updateInterview} onRemove={removeInterview} />
          ) : responses.length === 0 ? (
            <div className="v3-g2 px-4 py-3.5 text-sm">
              <p className="m-0 font-bold">{loading ? tr("نجيب الردود…") : tr("ما وصل رد للحين")}</p>
              {!loading && <p className="v3-mut m-0 mt-1 text-[13px]">{tr("افتحوا الاستبيان وشاركوا رابطه، وأول ما يجي رد يطلع هنا.")}</p>}
            </div>
          ) : (
            <>
              <div className="v3-mut hidden grid-cols-[60px_minmax(0,1fr)_100px_110px_110px] gap-3 px-1.5 pb-1.5 text-xs sm:grid" aria-hidden>
                <span>{tr("المشارك")}</span>
                <span>{tr("الاستبيان")}</span>
                <span>{tr("التاريخ")}</span>
                <span>{tr("الإجابات")}</span>
                <span>{tr("الحالة")}</span>
              </div>
              <ul className="m-0 list-none p-0" aria-label={tr("آخر الردود")}>
                {recent.map(({ r, n }) => {
                  const answered = answeredOf(r);
                  const complete = qCount === 0 || answered >= qCount;
                  return (
                    <li
                      key={r.id}
                      className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-white/[0.07] px-1.5 py-[11px] text-sm sm:grid-cols-[60px_minmax(0,1fr)_100px_110px_110px]"
                    >
                      <span className="v3-k text-[15px]">R{num(n)}</span>
                      <span className="truncate" dir="auto">
                        {main?.title || tr("استبيان بدون عنوان")}
                      </span>
                      <span className="v3-mut text-[13px] sm:text-sm">{relativeDayLabel(r.createdAt.slice(0, 10))}</span>
                      <span className="v3-mut col-start-2 text-[13px] sm:col-start-auto sm:text-sm">{qCount ? tr("{0}/{1} سؤال", num(Math.min(answered, qCount)), num(qCount)) : "—"}</span>
                      <span className={clsx("v3-st w-fit text-xs", complete ? "done" : "doing")}>{complete ? tr("مكتمل") : tr("ناقص")}</span>
                    </li>
                  );
                })}
              </ul>
              {responses.length > 3 && (
                <button type="button" className="v3-link mt-1" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? tr("اعرض آخر ٣ بس") : tr("كل الردود ({0}) ←", num(responses.length))}
                </button>
              )}
            </>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          {/* المحلل */}
          <section className="v3-g v3-hover v3-rise flex flex-col gap-2.5 p-[18px]" style={{ ...rise(6), borderColor: "rgba(255,180,68,.3)" }} aria-labelledby="analyst-title">
            <div className="flex items-center gap-2.5">
              <span className="v3-orb h-[30px] w-[30px]" aria-hidden />
              <div>
                <h2 id="analyst-title" className="v3-k m-0 text-[15px]">
                  {tr("المحلل")}
                </h2>
                {!isEn && <div className="v3-en">Analyst</div>}
              </div>
            </div>
            <p className="v3-mut m-0 text-[13px] leading-relaxed">
              {qual
                ? tr("لما تلصقون تفريغ مقابلة، أطلع لكم المواضيع الأولية وأقارنها بالمقابلات اللي قبل.")
                : collected > 0
                  ? tr("عندكم {0} {1}. أقدر أطلع لكم الوصفي الحين (المتوسطات والنسب) وأقول لكم وش الاختبار المناسب بعد ما تكتمل العينة.", num(collected), unitLabel(researchType, collected))
                  : tr("أول ما توصل ردود، أطلع لكم الوصفي وأقترح الاختبار المناسب لكل سؤال.")}
            </p>
            <button
              type="button"
              className="v3-bd !min-h-[44px] !text-sm"
              onClick={() =>
                openAgent(
                  qual
                    ? tr("بلصق لك تفريغ مقابلة، طلّع المواضيع الأولية فيها")
                    : tr("حلّل لي ردود الاستبيان «{0}»: الوصفي ووش الاختبار المناسب", main?.title || tr("الرئيسي")),
                )
              }
            >
              <AgentWave size={15} />
              {qual ? tr("طلّع المواضيع") : tr("حلّل معي")}
            </button>
          </section>

          {/* التشبّع (كيفي) أو اكتمال العينة (كمي) */}
          <section className="v3-g v3-hover v3-rise flex flex-col gap-2.5 p-[18px]" style={rise(7)} aria-labelledby="chart-title">
            <div>
              <h2 id="chart-title" className="v3-k m-0 text-[15px]">
                {qual ? tr("التشبّع") : tr("اكتمال العينة")}
              </h2>
              {!isEn && <div className="v3-en">{qual ? "Saturation" : "Sample completion"}</div>}
            </div>
            {qual && themeBars.length > 0 ? (
              <>
                <div className="v3-bars-y flex h-[70px] items-end gap-1.5" role="img" aria-label={tr("مواضيع جديدة بكل مقابلة")}>
                  {themeBars.map((b, i) => (
                    <div
                      key={b.id}
                      title={`${b.code}: ${num(b.n)}`}
                      className="flex-1 rounded-[6px_6px_3px_3px]"
                      style={{
                        ...({ ["--v3-i" as string]: i } as CSSProperties),
                        height: `${Math.max(6, (b.n / themeMax) * 100)}%`,
                        background: i === themeBars.length - 1 ? "linear-gradient(180deg,#FFF0C2,#FF6B00)" : "rgba(255,180,68,.4)",
                      }}
                    />
                  ))}
                </div>
                <p className="v3-mut m-0 text-xs leading-relaxed">
                  {saturationHint}
                </p>
              </>
            ) : qual || chart.length === 0 ? (
              <>
                <div className="flex h-[70px] items-end gap-1.5" aria-hidden>
                  {[100, 70, 55, 40, 30, 18, 12].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md border border-dashed border-white/15" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <p className="v3-mut m-0 text-xs leading-relaxed">
                  {qual
                    ? tr("يطلع هنا عدد المواضيع الجديدة في كل مقابلة — لما تقل، يعني قربتوا من التشبّع.")
                    : tr("يطلع هنا تراكم الردود يوم بيوم مقابل حجم العينة.")}
                </p>
              </>
            ) : (
              <>
                <div className="v3-bars-y flex h-[70px] items-end gap-1.5" role="img" aria-label={tr("{0} من {1}", num(collected), num(target ?? collected))}>
                  {chart.map((c, i) => (
                    <div
                      key={c.day}
                      title={`${relativeDayLabel(c.day)}: ${num(c.total)}`}
                      className="flex-1 rounded-[6px_6px_3px_3px]"
                      style={{
                        ...({ ["--v3-i" as string]: i } as CSSProperties),
                        height: `${Math.max(6, (c.total / chartMax) * 100)}%`,
                        background: i === chart.length - 1 ? "linear-gradient(180deg,#FFF0C2,#FF6B00)" : "rgba(255,180,68,.4)",
                      }}
                    />
                  ))}
                </div>
                <p className="v3-mut m-0 text-xs leading-relaxed">
                  {target
                    ? collected >= target
                      ? tr("اكتملت العينة ✓ — تقدرون تبدؤون التحليل.")
                      : tr("ردود تراكمية يوم بيوم — باقي {0} على حجم العينة.", num(target - collected))
                    : tr("ردود تراكمية يوم بيوم.")}
                </p>
              </>
            )}
          </section>
        </aside>
      </div>

      {/* ── الأدوات ── */}
      <section className="relative" aria-labelledby="tools-title">
        <h2 id="tools-title" className="v3-k m-0 mb-2.5 text-lg">
          {tr("أدوات الجمع والتحليل")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3.5">
          {tools.map((t, i) => (
            <Link key={t.to} to={t.to} className="v3-g v3-hover v3-rise flex min-h-[44px] flex-col gap-2 !rounded-[22px] p-4" style={rise(8 + i)}>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-white/[0.07] text-[var(--ws-c-text)]">
                <t.icon size={19} aria-hidden />
              </span>
              <div>
                <div className="text-[15px] font-bold">{t.title}</div>
                {!isEn && <div className="v3-en">{t.en}</div>}
              </div>
              <div className="v3-mut text-[13px] leading-relaxed">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
