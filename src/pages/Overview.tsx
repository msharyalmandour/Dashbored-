import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, ChevronDown, Compass, Flag, PartyPopper, Search } from "lucide-react";
import clsx from "clsx";
import { AlertCard } from "../components/ui/cards";
import Avatar from "../components/ui/Avatar";
import Dialog from "../components/ui/Dialog";
import FocusSession from "../components/FocusSession";
import NotificationsBell from "../components/NotificationsBell";
import HomeToasts from "../components/home/HomeToasts";
import TeamTogether from "../components/home/TeamTogether";
import NextMeetingCard from "../components/home/NextMeetingCard";
import { V3Glow, TYPE_LABEL, num } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTour } from "../context/TourContext";
import { recentActivity, teamMembers as mockTeamMembers } from "../data/mockData";
import type { Task } from "../data/types";
import { daysUntil, formatDateFull, formatDateLong, formatDateShort, toISODate } from "../lib/date";
import { useResearchStages } from "../hooks/useResearchStages";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useProposal } from "../hooks/useProposal";
import { useMethodology } from "../hooks/useMethodology";
import { useTasksData } from "../hooks/useTasksData";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import { useFiles } from "../hooks/useFiles";
import { useSurveys, useSurveyResponseCounts } from "../hooks/useSurveys";
import { summarizeCollection } from "../lib/dataCollection";
import { computeNextSteps } from "../lib/nextSteps";
import { isStageReady } from "../lib/stageAdvance";
import { getCurrentStage } from "../lib/progress";
import { splitReminders } from "../lib/taskReminders";
import { isLate, paceStatus, streakDays, timeLeft, todayList, weeklyImprovement } from "../lib/homeCalm";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { isEn, tr } from "../lib/i18n";

// بالعرض التجريبي البيانات مثبّتة على أغسطس ٢٠٢٦، فنثبّت «اليوم» عليه عشان الحسابات تطلع منطقية
const now = isSupabaseConfigured ? new Date() : new Date(2026, 7, 22, 10);
const todayIso = toISODate(now);

const GUIDE_BANNER_KEY = "nursync.guideBannerDismissed";
const LAST_SEEN_STAGE_KEY = "nursync.lastSeenStage";

const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

const PRIORITY_MINUTES: Record<string, number> = { high: 60, medium: 30, low: 15 };

const plural = (n: number, one: string, two: string, few: string, many: string) =>
  n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? tr(few, num(n)) : tr(many, num(n));

export default function Overview() {
  const { currentUser, mode, isLeader, canWrite } = useAuth();
  const { startTour, finished: tourFinished } = useTour();
  const { showToast } = useToast();
  const { stages } = useResearchStages();
  const { papers } = useEvidencePapers();
  const { sections, gap, questions } = useProposal();
  const { methodology } = useMethodology();
  const { tasks: allTasks } = useTasksData();
  const { roster } = useTeamRoster();
  const { project, updateProject } = useResearchProject();
  const { files } = useFiles();
  const { surveys } = useSurveys();
  const surveyCounts = useSurveyResponseCounts(surveys);
  const collection = summarizeCollection(surveys, surveyCounts, methodology.sampling.sampleSize);
  const currentStage = getCurrentStage(stages);

  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_BANNER_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [editDeadline, setEditDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  // احتفال انتقال المرحلة (مثل قبل)
  useEffect(() => {
    if (!currentStage) return;
    try {
      const last = localStorage.getItem(LAST_SEEN_STAGE_KEY);
      if (last && last !== currentStage.titleAr) {
        showToast({ title: tr("🎉 أنجزتم مرحلة بحثية كاملة!"), desc: tr("وصلتوا لمرحلة {0}", currentStage.titleAr), icon: PartyPopper, tone: "amber" });
      }
      localStorage.setItem(LAST_SEEN_STAGE_KEY, currentStage.titleAr);
    } catch {
      // بدون تخزين: بدون احتفال
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage?.titleAr]);

  // التذكيرات («تذكير: …») مو مهام لحالها — نفس منطق صفحة المهام
  const tasks = useMemo(() => splitReminders(allTasks).visible, [allTasks]);
  const memberById = (id: string) => roster.find((m) => m.id === id);
  const firstName = (name?: string) => (name ?? "").split(" ")[0];

  const deadline = project?.targetSubmissionDate ?? null;
  const daysLeft = deadline ? daysUntil(deadline, now) : null;
  const left = deadline ? timeLeft(deadline, now) : null;
  const pace = paceStatus(tasks, todayIso, daysLeft ?? 0);
  const today3 = todayList(tasks, todayIso);
  const streak = streakDays(tasks.map((t) => t.completedAt), todayIso);
  const improvement = weeklyImprovement(tasks, todayIso);

  // ── الخطوة الجاية: أهم مهمة (عليك أول)، وإلا خطوة الرحلة المقترحة ──
  const openSorted = tasks.filter((t) => t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextTask =
    today3.find((t) => t.assigneeId === currentUser?.id) ?? today3[0] ?? openSorted.find((t) => t.assigneeId === currentUser?.id) ?? openSorted[0];
  const journeyStep = computeNextSteps({
    stageReady:
      !!currentStage &&
      isStageReady(
        currentStage,
        { dataCollection: { collected: collection.collected, target: collection.target }, proposalSections: sections, researchGap: gap, researchQuestions: questions, methodology, evidencePapers: papers },
        project?.title ?? "",
      ),
    todayIso,
    currentUserId: currentUser?.id ?? "",
    tasks,
    stages,
    sections,
    hasDeadline: !!deadline,
    evidenceCount: papers.length,
    hasTitle: !!project?.title?.trim(),
  })[0];
  const sectionOf = (t: Task) => sections.find((s) => s.key === t.sectionKey);
  const taskLink = (t: Task) => (t.sectionKey && sectionOf(t) ? `/proposal?section=${t.sectionKey}` : `/tasks?task=${t.id}`);
  const taskSub = (t: Task) => {
    const sec = sectionOf(t);
    if (sec) return tr("المقترح · القسم {0}", num(sec.order));
    return t.description?.trim() || "";
  };

  // ── المقترح: القسم X من ٧ ──
  const orderedSections = [...sections].sort((a, b) => a.order - b.order);
  const doneSections = orderedSections.filter((s) => s.status === "done").length;
  const currentSection = orderedSections.find((s) => s.status !== "done");
  const remainingSections = orderedSections.length - doneSections;

  // ── خط المراحل: آخر مرحلة خلصت + الحالية + اللي بعدها، والتسليم بالأخير ──
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const curIdx = currentStage ? sortedStages.findIndex((s) => s.id === currentStage.id) : sortedStages.length;
  const windowStages = sortedStages.slice(Math.max(0, curIdx - 1), Math.max(0, curIdx - 1) + 4);

  // ── تحديثات الفريق (آخر ٧ أيام): مهام خلصت وملفات انرفعت من باقي الفريق ──
  const weekAgo = toISODate(new Date(now.getTime() - 7 * 86400000));
  type UpdateItem = { id: string; text: string; initials: string; color: string };
  const updates: UpdateItem[] = isSupabaseConfigured
    ? [
        ...tasks
          .filter((t) => t.status === "done" && t.completedAt && t.completedAt.slice(0, 10) >= weekAgo && t.assigneeId !== currentUser?.id)
          .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
          .map((t) => {
            const m = memberById(t.assigneeId);
            return { id: `t-${t.id}`, at: t.completedAt ?? "", text: tr("{0}: خلصت «{1}»", firstName(m?.name) || tr("عضو"), t.title), initials: m?.initials ?? "؟", color: m?.color ?? "brand" };
          }),
        ...files
          .filter((f) => f.createdAt && f.createdAt.slice(0, 10) >= weekAgo && f.uploadedById && f.uploadedById !== currentUser?.id)
          .map((f) => {
            const m = memberById(f.uploadedById);
            return { id: `f-${f.id}`, at: f.createdAt, text: tr("{0}: ملف جديد «{1}»", firstName(m?.name) || tr("عضو"), f.name), initials: m?.initials ?? "؟", color: m?.color ?? "brand" };
          }),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map(({ id, text, initials, color }) => ({ id, text, initials, color }))
    : recentActivity.map((a) => {
        const m = mockTeamMembers.find((x) => x.id === a.memberId)!;
        return { id: a.id, text: `${firstName(m.name)} ${a.action} «${a.target}»`, initials: m.initials, color: m.color };
      });

  const typeLabel = project?.researchType ? (isEn ? TYPE_LABEL[project.researchType][1] : TYPE_LABEL[project.researchType][0]) : "";
  const supervisor = project?.supervisorName?.trim();
  const englishTitle = project?.description && /[A-Za-z]/.test(project.description) ? project.description : "";

  const saveDeadline = async () => {
    if (!deadlineDraft) return;
    const { error } = await updateProject({ targetSubmissionDate: deadlineDraft });
    if (error) {
      setDeadlineError(error);
      return;
    }
    setDeadlineError(null);
    setEditDeadline(false);
  };
  const openDeadlineEditor = () => {
    setDeadlineDraft(deadline ?? toISODate(new Date(now.getTime() + 30 * 86400000)));
    setDeadlineError(null);
    setEditDeadline(true);
  };

  const dueChip = (t: Task) =>
    isLate(t, todayIso) ? (
      <span className="v3-st late">{lateText(t.dueDate)}</span>
    ) : (
      <span className="v3-st todo !text-[var(--ws-c-text)]">{tr("اليوم")}</span>
    );

  return (
    <div className="v3 relative">
      <V3Glow />
      <HomeToasts />

      {showGuide && (
        <div className="relative mb-4">
          <AlertCard
            tone="warning"
            icon={Compass}
            onDismiss={() => {
              try {
                localStorage.setItem(GUIDE_BANNER_KEY, "1");
              } catch {
                // ما يهم
              }
              setShowGuide(false);
            }}
            action={
              !tourFinished && (
                <button onClick={startTour} className="v3-bd shrink-0 !min-h-[40px] !text-sm">
                  {tr("ابدأ الجولة")}
                </button>
              )
            }
          >
            {tr("أول مرة تستخدمون Wesync؟ خذوا جولة سريعة على أهم الصفحات، أو افتحوا ")}
            <Link to="/guide" className="underline underline-offset-2">
              {tr("دليل الطالب")}
            </Link>
            .
          </AlertCard>
        </div>
      )}

      {/* ── ١) الترحيب + ⌘K + الجرس ── */}
      <header className="v3-rise relative mb-5 flex flex-wrap items-center gap-4" style={rise(0)}>
        <div className="min-w-0 flex-[1_1_280px]">
          <h1 className="v3-k m-0 text-[24px] leading-snug sm:text-[26px]">{tr("يعطيك العافية يا {0}", firstName(currentUser?.name))}</h1>
          <p className="v3-mut m-0 text-[15px]">
            {formatDateFull(todayIso)}
            {streak >= 2 && <> · {tr("{0} أيام ورا بعض تشتغلون 👏", num(streak))}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("nursync:open-command-palette"))}
          className="v3-g hidden min-h-[46px] w-[300px] items-center gap-2.5 !rounded-full px-[18px] text-start text-sm md:flex"
          aria-label={tr("ابحث أو اكتب أمر…")}
        >
          <Search size={16} className="text-[var(--ws-c-muted)]" aria-hidden />
          <span className="v3-mut flex-1">{tr("ابحث أو اكتب أمر…")}</span>
          <kbd className="rounded-full border border-white/10 bg-white/[0.07] px-2 py-0.5 text-xs text-[var(--ws-c-muted)]">⌘K</kbd>
        </button>
        <div className="hidden md:block">
          <NotificationsBell />
        </div>
      </header>

      {/* ── ٢) موضوع بحثنا ── */}
      <section className="v3-g v3-hover v3-rise relative mb-3 flex flex-wrap items-center gap-[18px] !rounded-[24px] px-5 py-[18px] sm:px-6" style={rise(1)} aria-labelledby="topic-title">
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-white/[0.07]" aria-hidden>
          <BookOpen size={21} />
        </span>
        <div className="min-w-0 flex-[1_1_260px]">
          <div className="v3-mut text-[13px] font-bold">{tr("موضوع بحثنا")}</div>
          {project?.title?.trim() ? (
            <>
              <h2 id="topic-title" className="v3-k m-0 text-[20px] leading-[1.45] sm:text-[22px]" dir="auto">
                {project.title}
              </h2>
              {englishTitle && (
                <div className="v3-en" dir="ltr" style={{ textAlign: isEn ? "left" : "right" }}>
                  {englishTitle}
                </div>
              )}
            </>
          ) : (
            <h2 id="topic-title" className="v3-k m-0 text-[20px]">
              <Link to="/proposal" className="underline decoration-white/20 underline-offset-4">
                {tr("اكتبوا موضوع بحثكم ←")}
              </Link>
            </h2>
          )}
        </div>
        {(typeLabel || supervisor) && (
          <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end">
            {typeLabel && <span className="v3-st todo !text-[var(--ws-c-text)]">{typeLabel}</span>}
            {supervisor && <span className="v3-st todo !text-[var(--ws-c-text)]">{tr("المشرف/ة {0}", supervisor)}</span>}
          </div>
        )}
      </section>

      {/* ── ٣) تحديثات الفريق (مطوية) ── */}
      <div className="relative mb-5 px-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {updates.length > 0 ? (
            <button type="button" className="v3-link !min-h-[44px] !text-[var(--ws-c-muted)]" aria-expanded={updatesOpen} onClick={() => setUpdatesOpen((v) => !v)}>
              {tr("+ {0} من الفريق", plural(updates.length, tr("تحديث"), tr("تحديثين"), "{0} تحديثات", "{0} تحديث"))}
              <ChevronDown size={16} className={clsx("ms-1 transition-transform", updatesOpen && "rotate-180")} aria-hidden />
            </button>
          ) : (
            <span className="v3-mut">{tr("ما فيه تحديثات جديدة من الفريق هالأسبوع")}</span>
          )}
          {!updatesOpen && updates.length > 0 && (
            <span className="v3-mut ms-auto hidden truncate sm:block" dir="auto">
              {updates
                .slice(0, 2)
                .map((u) => u.text)
                .join(" · ")}
            </span>
          )}
        </div>
        {updatesOpen && (
          <ul className="v3-g2 m-0 mt-1 list-none !rounded-2xl p-2">
            {updates.slice(0, 8).map((u) => (
              <li key={u.id} className="flex items-center gap-2.5 px-2 py-2 text-sm">
                <Avatar initials={u.initials} color={u.color} size="sm" />
                <span className="min-w-0 flex-1" dir="auto">
                  {u.text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── ٤) بطاقة الموعد (البطل) ── */}
      <section className="v3-g v3-rise relative mb-5 flex flex-col gap-[22px] !rounded-[30px] px-5 py-6 sm:px-[30px] sm:py-7" style={rise(2)} aria-labelledby="deadline-title">
        {deadline && left ? (
          <>
            <div className="flex flex-wrap items-center gap-x-[30px] gap-y-4">
              <div className="flex items-baseline gap-2.5" aria-hidden>
                <span className="v3-k text-[80px] leading-[.9] text-[#F2EBE3] sm:text-[96px]">{num(Math.max(0, daysLeft ?? 0))}</span>
                <span className="v3-k text-[24px] sm:text-[26px]">{daysLeft === 1 ? tr("يوم") : daysLeft === 2 ? tr("يومين") : (daysLeft ?? 0) >= 3 && (daysLeft ?? 0) <= 10 ? tr("أيام") : tr("يوم")}</span>
              </div>
              <div className="min-w-[230px] flex-1">
                <div className="v3-mut text-sm font-bold" id="deadline-title">
                  {(daysLeft ?? 0) < 0 ? tr("فات موعد التسليم") : tr("باقي على التسليم")}
                </div>
                <div className="v3-k my-0.5 text-[22px] sm:text-[24px]">
                  {formatDateFull(deadline)}
                  {(daysLeft ?? 0) >= 0 && left.hours > 0 && <span className="v3-mut text-[15px] font-medium"> · {tr("و{0}", plural(left.hours, tr("ساعة"), tr("ساعتين"), "{0} ساعات", "{0} ساعة"))}</span>}
                </div>
                <div className="text-[15px]">
                  {tr("تسليم البحث للمشرف/ة{0}", supervisor ? ` ${supervisor}` : "")}
                  {canWrite && (
                    <>
                      {" · "}
                      <button type="button" className="v3-link !min-h-[32px] align-baseline" style={{ color: "var(--ws-c-accent-2)", textDecoration: "none" }} onClick={openDeadlineEditor}>
                        {tr("عدّل")}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* صندوق الحالة */}
              {pace.onTrack ? (
                <div className="w-full rounded-[20px] border border-[rgba(127,224,166,.25)] bg-[rgba(127,224,166,.07)] px-[18px] py-4 lg:w-[300px] lg:flex-none" role="status">
                  <div className="text-sm font-bold text-[var(--ws-c-done)]">{tr("ماشين صح")}</div>
                  <div className="mt-1 text-sm leading-[1.7]">
                    {pace.open === 0
                      ? tr("ما عليكم مهام مفتوحة. أضيفوا مهام الأسابيع الجاية عشان يبان الطريق.")
                      : tr("خلّصتوا {0} هالأسبوع، والمطلوب {1} بالأسبوع عشان توصلون في الوقت.", plural(pace.doneThisWeek, tr("مهمة"), tr("مهمتين"), "{0} مهام", "{0} مهمة"), plural(pace.perWeek, tr("مهمة"), tr("مهمتين"), "{0} مهام", "{0} مهمة"))}
                  </div>
                </div>
              ) : (
                <div className="w-full rounded-[20px] border border-[rgba(255,199,119,.22)] bg-[rgba(255,199,119,.07)] px-[18px] py-4 lg:w-[300px] lg:flex-none" role="status">
                  <div className="text-sm font-bold text-[var(--ws-c-warn)]">{tr("متأخرين شوي، والحل بسيط")}</div>
                  <div className="mt-1 text-sm leading-[1.7]">
                    {tr("لو خلّصتوا {0} بالأسبوع توصلون في الوقت.", plural(pace.perWeek, tr("مهمة"), tr("مهمتين"), "{0} مهام", "{0} مهمة"))}{" "}
                    {pace.thisWeek.length > 0 && <>{tr("هالأسبوع: {0}.", pace.thisWeek.map((t) => t.title).join(" + "))}</>}
                  </div>
                </div>
              )}
            </div>

            {/* خط المراحل بمواعيدها */}
            {windowStages.length > 0 && (
              <ol className="v3-scroll-x relative m-0 flex list-none p-0 pt-1.5" aria-label={tr("مراحل البحث")}>
                {[...windowStages.map((s) => ({ key: s.id, label: isEn ? s.titleEn : s.titleAr, date: s.targetDate, state: s.status === "done" ? "done" : s.id === currentStage?.id ? "now" : "next" })), { key: "deliver", label: tr("التسليم"), date: deadline, state: "deliver" }].map(
                  (s, i, arr) => (
                    <li key={s.key} className="relative flex min-w-[92px] flex-1 flex-col items-center gap-1.5 text-center" aria-current={s.state === "now" ? "step" : undefined}>
                      {i < arr.length - 1 && (
                        <span aria-hidden className="absolute top-[13px] h-0.5" style={{ insetInlineStart: "50%", width: "100%", background: s.state === "done" ? "var(--ws-c-accent-2)" : "rgba(255,255,255,.1)" }} />
                      )}
                      <span className="relative z-[1]">
                        {s.state === "done" ? (
                          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[var(--ws-c-done)] text-[#0b2015]">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        ) : s.state === "now" ? (
                          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#F2EBE3] shadow-[0_0_0_5px_rgba(255,140,40,.18)]">
                            <i className="h-[9px] w-[9px] rounded-full bg-[var(--ws-c-accent)]" />
                          </span>
                        ) : s.state === "deliver" ? (
                          <span className="grid h-[26px] w-[26px] place-items-center rounded-[9px] bg-[rgba(255,140,40,.2)] text-[var(--ws-c-accent-2)]">
                            <Flag size={14} />
                          </span>
                        ) : (
                          <span className="block h-[26px] w-[26px] rounded-full border-[1.5px] border-white/20 bg-[#151010]" />
                        )}
                      </span>
                      <span className={clsx("text-sm", s.state === "now" ? "font-bold" : s.state === "next" ? "text-[var(--ws-c-muted)]" : "")}>{s.label}</span>
                      <span className="v3-mut text-xs">{s.date ? formatDateShort(s.date) : "—"}</span>
                    </li>
                  ),
                )}
              </ol>
            )}

            {orderedSections.length > 0 && (
              <p className="v3-mut m-0 text-center text-sm">
                {currentSection ? (
                  <>
                    {tr("المقترح:")} <b className="text-[var(--ws-c-text)]">{tr("القسم {0} من {1}", num(currentSection.order), num(orderedSections.length))}</b> ·{" "}
                    {remainingSections === 1 ? tr("باقي لكم قسم واحد وتخلصون المقترح") : tr("باقي لكم {0} وتخلصون المقترح", plural(remainingSections, tr("قسم"), tr("قسمين"), "{0} أقسام", "{0} قسم"))}
                  </>
                ) : (
                  <b className="text-[var(--ws-c-done)]">{tr("المقترح خلص ✓")}</b>
                )}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <span className="grid h-[64px] w-[64px] place-items-center rounded-[20px] bg-[rgba(255,140,40,.14)] text-[var(--ws-c-accent-2)]" aria-hidden>
              <Flag size={28} />
            </span>
            <div className="min-w-[220px] flex-1">
              <h2 id="deadline-title" className="v3-k m-0 text-[24px]">
                {tr("حدّدوا موعد التسليم")}
              </h2>
              <p className="v3-mut m-0 mt-1 text-[15px]">{tr("أول ما تحددونه، نحسب لكم كم يوم باقي، وكم مهمة بالأسبوع تحتاجون عشان توصلون في الوقت.")}</p>
            </div>
            {canWrite && (
              <button type="button" className="v3-bd" onClick={openDeadlineEditor}>
                {tr("اختاروا التاريخ")}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── ٥) وش علينا اليوم؟ + الخطوة الجاية ── */}
      <div className="relative mb-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
        <section className="v3-g v3-hover v3-rise !rounded-[28px] px-5 pb-2.5 pt-5 sm:px-6" style={rise(3)} aria-labelledby="today-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="today-title" className="v3-k m-0 text-[20px]">
              {tr("وش علينا اليوم؟")}
            </h2>
            <Link to="/tasks" className="v3-link !text-[var(--ws-c-muted)]">
              {tr("مهامي كلها ←")}
            </Link>
          </div>
          {today3.length === 0 ? (
            <p className="v3-mut m-0 border-t border-white/[0.07] py-5 text-[15px]">{tr("ولا شي متأخر ولا شي موعده اليوم. يوم هادي ☕")}</p>
          ) : (
            <ul className="m-0 mt-2 list-none p-0">
              {today3.map((t) => {
                const m = memberById(t.assigneeId);
                const late = isLate(t, todayIso);
                return (
                  <li key={t.id} className="border-t border-white/[0.07]">
                    <Link to={`/tasks?task=${t.id}`} className="flex min-h-[56px] items-center gap-3.5 px-1 py-3">
                      <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[1.8px]" style={{ borderColor: late ? "var(--ws-c-late)" : "rgba(255,255,255,.3)" }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold" dir="auto">
                          {t.title}
                        </span>
                        {taskSub(t) && <span className="v3-mut block truncate text-[13px]">{taskSub(t)}</span>}
                      </span>
                      {dueChip(t)}
                      {m && <Avatar initials={m.initials} color={m.color} size="sm" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="v3-g v3-hover v3-rise flex flex-col gap-3 !rounded-[28px] p-6"
          style={{ ...rise(4), borderColor: "rgba(255,140,40,.3)" }}
          aria-labelledby="next-title"
        >
          <div className="v3-mut text-sm font-bold">{tr("الخطوة الجاية")}</div>
          {nextTask ? (
            <>
              <h2 id="next-title" className="v3-k m-0 text-[22px] leading-[1.35] sm:text-[24px]" dir="auto">
                {nextTask.title}
              </h2>
              <p className="v3-mut m-0 text-[15px] leading-[1.7]">
                {tr("{0} تقريبًا.", (PRIORITY_MINUTES[nextTask.priority ?? "medium"] ?? 30) === 60 ? tr("ساعة") : tr("{0} دقيقة", num(PRIORITY_MINUTES[nextTask.priority ?? "medium"] ?? 30)))}
                {sectionOf(nextTask) && <> {tr("في قسم «{0}».", isEn ? sectionOf(nextTask)!.labelEn : sectionOf(nextTask)!.labelAr)}</>}
              </p>
              <Link to={taskLink(nextTask)} className="v3-bw mt-auto !min-h-[48px] !text-base">
                {sectionOf(nextTask) ? tr("افتح القسم ←") : tr("افتح المهمة ←")}
              </Link>
            </>
          ) : journeyStep ? (
            <>
              <h2 id="next-title" className="v3-k m-0 text-[22px] leading-[1.35] sm:text-[24px]">
                {journeyStep.title}
              </h2>
              <p className="v3-mut m-0 text-[15px] leading-[1.7]">{journeyStep.why}</p>
              <Link to={journeyStep.to} className="v3-bw mt-auto !min-h-[48px] !text-base">
                {journeyStep.cta} ←
              </Link>
            </>
          ) : (
            <>
              <h2 id="next-title" className="v3-k m-0 text-[22px]">
                {tr("ما فيه شي مستعجل")}
              </h2>
              <Link to="/proposal" className="v3-bw mt-auto !min-h-[48px] !text-base">
                {tr("افتح المقترح ←")}
              </Link>
            </>
          )}
          <button type="button" className="v3-link justify-center !text-[var(--ws-c-muted)]" onClick={() => setFocusOpen(true)}>
            {tr("أو ابدأ ٢٥ دقيقة تركيز")}
          </button>
        </section>
      </div>

      {/* ── الفريق مع بعض + الاجتماع الجاي والتقويم ── */}
      <div className="relative mb-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
        <TeamTogether tasks={tasks} today={todayIso} style={rise(5)} />
        <NextMeetingCard today={todayIso} now={now} style={rise(6)} />
      </div>

      {/* ── ٦) تحسّن الأسبوع (بس لو فيه تحسّن) ── */}
      {improvement && (
        <p className="v3-mut relative m-0 py-1 text-center text-sm">
          {tr("هالأسبوع خلّصتوا {0}، أحسن من اللي قبله بـ{1} 👏", plural(improvement.thisWeek, tr("مهمة"), tr("مهمتين"), "{0} مهام", "{0} مهمة"), plural(improvement.diff, tr("مهمة"), tr("مهمتين"), "{0} مهام", "{0} مهمة"))}
        </p>
      )}

      {mode !== "supabase" && (
        <p className="v3-mut relative mt-3 text-center text-xs">{tr("عرض تجريبي — التاريخ مثبّت على {0}", formatDateLong(todayIso))}</p>
      )}

      <Dialog open={focusOpen} onClose={() => setFocusOpen(false)} title={tr("٢٥ دقيقة تركيز")}>
        <FocusSession />
      </Dialog>

      <Dialog open={editDeadline} onClose={() => setEditDeadline(false)} title={tr("موعد التسليم")}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("تاريخ التسليم")}
            <input type="date" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)} className="v3-select w-full [color-scheme:dark]" />
          </label>
          {deadlineError && (
            <p className="m-0 text-sm text-[var(--ws-c-late)]" role="alert">
              {deadlineError}
            </p>
          )}
          {!isLeader && <p className="v3-mut m-0 text-xs">{tr("الموعد مشترك لكل الفريق.")}</p>}
          <button type="button" className="v3-bw" onClick={saveDeadline} disabled={!deadlineDraft}>
            {tr("احفظ الموعد")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function lateText(dueDate: string) {
  const n = -daysUntil(dueDate, now);
  if (n <= 1) return tr("متأخرة يوم");
  if (n === 2) return tr("متأخرة يومين");
  return n <= 10 ? tr("متأخرة {0} أيام", num(n)) : tr("متأخرة {0} يوم", num(n));
}
