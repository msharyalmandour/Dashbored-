import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUp, Check, CheckCircle2, ClipboardCheck, Loader2, Undo2, Wrench } from "lucide-react";
import clsx from "clsx";
import AiLockedCard from "./AiLockedCard";
import AgentOrb from "./ui/AgentOrb";
import StreamedText from "./ui/StreamedText";
import ThinkingLine from "./ui/ThinkingLine";
import { ghostBtn, primaryBtn } from "./ui/page";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useProposal } from "../hooks/useProposal";
import { useTasksData } from "../hooks/useTasksData";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { askProjectAgent, reviewProposal, type AgentAction, type AskTurn, type ProposalReview } from "../hooks/useProjectAgent";
import { addDaysISO, formatDateLong, toISODate } from "../lib/date";
import { hasAiAccess } from "../lib/plans";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { tr, trx } from "../lib/i18n";

interface Turn extends AskTurn {
  actions?: AgentAction[];
  /** تقرير مراجعة المقترح (يظهر ببطاقات، بدون أي تنفيذ تلقائي) */
  review?: ProposalReview;
  /** وقت وصول الرد — عشان الردود الجديدة بس تظهر كلمة كلمة */
  at?: number;
}

/** حالة كل إجراء: تم (مع طريقة التراجع لو فيه) أو فشل */
interface ActionState {
  status: "done" | "failed" | "dismissed";
  undo?: () => Promise<{ error?: string }>;
  undone?: boolean;
}

/** اقتراحات سريعة: الاسم المختصر بالزر، والنص الكامل هو اللي يوصل الوكيل */
const SUGGESTIONS = [
  { label: tr("وين وصلنا؟"), ask: tr("وين وصلنا؟ وش أسوي اليوم؟") },
  { label: tr("وش المتأخر؟"), ask: tr("وش اللي متأخر عندنا؟") },
];
const LEADER_SUGGESTION = { label: tr("وزّع مهام الأسبوع"), ask: tr("وزّع مهام الأسبوع على الأعضاء") };
const MEMBER_SUGGESTION = { label: tr("جهّز اجتماع المشرف/ة"), ask: tr("وش ناقص قبل اجتماعنا مع المشرف/ة؟") };
/** مو سؤال للوكيل — يشغّل مراجعة المقترح الكاملة (تقرير جاهزية) */
const REVIEW_CHIP = { label: tr("راجع المقترح قبل التسليم"), ask: "__review__" };
const verdictAr = { ready: tr("جاهز للتسليم"), almost: tr("قريب — ناقصه شوية"), not_ready: tr("يحتاج شغل قبل التسليم") } as const;
const verdictColor = { ready: "text-[#7fd6a0]", almost: "text-[#FFB444]", not_ready: "text-[#ff8a8a]" } as const;

// المحادثة تبقى لو انقفلت اللوحة أو تنقّلتوا بين الصفحات (لين يتحدّث المتصفح)
let cachedTurns: Turn[] = [];
let cachedStates: Record<string, ActionState> = {};

/** الوكيل: يعرف تقدّمكم ومهامكم ومقترحكم ويجاوب من بياناتكم. أي تعديل يقترحه («احفظ السؤال بالمقترح»، «وزّع المهام»)
    يطلع ببطاقة، وما ينفّذ شي إلا لما تضغطون «وافق» (أو «لا» لتتجاهلونه)، وبعدها يظهر زر تراجع. إنشاء المهام للقائد فقط.
    compact = داخل اللوحة الجانبية (بدون الكرة الكبيرة)، وsuggestions = اقتراحات القسم الحالي. */
export default function ProjectAgentChat({ compact = false, suggestions }: { compact?: boolean; suggestions?: string[] }) {
  const { team, currentUser, isLeader, canWrite } = useAuth();
  const { showToast } = useToast();
  const { aim, gap, questions, updateAimStatement, updateGap, setResearchQuestions } = useProposal();
  const { tasks, addTask, updateStatus } = useTasksData();
  const { addEvent } = useCalendarEvents();
  const { roster } = useTeamRoster();
  const [turns, setTurnsState] = useState<Turn[]>(cachedTurns);
  const [states, setStatesState] = useState<Record<string, ActionState>>(cachedStates);
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // أحدث نسخة من الهدف والأسئلة — عشان كذا إجراء ورا بعض بنفس الرد ما يشتغل على قيمة قديمة
  const latest = useRef({ aim: aim.statement, gap: gap.gapStatement, questions: questions.map((q) => q.text) });
  useEffect(() => {
    latest.current = { aim: aim.statement, gap: gap.gapStatement, questions: questions.map((q) => q.text) };
  }, [aim.statement, gap.gapStatement, questions]);

  const setTurns = (fn: (t: Turn[]) => Turn[]) =>
    setTurnsState((prev) => {
      cachedTurns = fn(prev);
      return cachedTurns;
    });
  const setStates = (fn: (s: Record<string, ActionState>) => Record<string, ActionState>) =>
    setStatesState((prev) => {
      cachedStates = fn(prev);
      return cachedStates;
    });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, busy]);

  // بالنسخة التجريبية (mock) نعرض الواجهة معطّلة بدل ما نخفيها
  const mock = !isSupabaseConfigured;
  if (!mock && !hasAiAccess(team)) return <AiLockedCard feature={tr("الوكيل")} />;

  const allowed = (a: AgentAction) =>
    canWrite && (a.type === "add_task" ? isLeader : a.type === "update_task" ? a.allowed !== false : true);

  /** ينفّذ الإجراء بصلاحيات المستخدم (RLS) ويرجّع طريقة التراجع لو ممكن */
  const run = async (a: AgentAction, assigneeId?: string): Promise<ActionState> => {
    if (a.type === "set_aim") {
      const before = latest.current.aim;
      const { error } = await updateAimStatement(a.text);
      if (error) return { status: "failed" };
      latest.current.aim = a.text;
      return { status: "done", undo: () => updateAimStatement(before) };
    }
    if (a.type === "add_questions") {
      const before = latest.current.questions;
      const have = new Set(before.map((x) => x.trim()));
      const next = [...before, ...a.texts.filter((x) => !have.has(x.trim()))];
      const { error } = await setResearchQuestions(next);
      if (error) return { status: "failed" };
      latest.current.questions = next;
      return { status: "done", undo: () => setResearchQuestions(before) };
    }
    if (a.type === "set_questions") {
      const before = latest.current.questions;
      const { error } = await setResearchQuestions(a.texts);
      if (error) return { status: "failed" };
      latest.current.questions = a.texts;
      return { status: "done", undo: () => setResearchQuestions(before) };
    }
    if (a.type === "set_gap") {
      const before = latest.current.gap;
      const { error } = await updateGap({ gapStatement: a.text });
      if (error) return { status: "failed" };
      latest.current.gap = a.text;
      return { status: "done", undo: () => updateGap({ gapStatement: before }) };
    }
    if (a.type === "update_task") {
      const before = tasks.find((t) => t.id === a.taskId)?.status;
      const { error } = await updateStatus(a.taskId, a.status);
      if (error) return { status: "failed" };
      return { status: "done", undo: before ? () => updateStatus(a.taskId, before) : undefined };
    }
    if (a.type === "add_event") {
      const { error } = await addEvent({ title: a.title, date: a.date, time: a.time, type: a.eventType, location: a.location });
      return { status: error ? "failed" : "done" };
    }
    if (a.type === "add_task" && currentUser) {
      const { error } = await addTask({
        title: a.title,
        description: a.description,
        assigneeId: assigneeId ?? a.assigneeId ?? currentUser.id,
        dueDate: addDaysISO(toISODate(new Date()), a.days),
        priority: a.priority ?? "medium",
      });
      return { status: error ? "failed" : "done" };
    }
    return { status: "failed" };
  };

  const runReview = async () => {
    setTurns((t) => [...t, { role: "user", text: tr("راجع مقترحنا قبل التسليم") }]);
    setBusy(true);
    const r = await reviewProposal();
    setBusy(false);
    setTurns((t) => [
      ...t,
      r.data
        ? { role: "agent", text: r.data.summary || tr("هذي مراجعة مقترحكم:"), review: r.data, at: Date.now() }
        : { role: "agent", text: r.message ?? tr("تعذّرت المراجعة."), at: Date.now() },
    ]);
  };

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy || mock) return;
    if (q === REVIEW_CHIP.ask) return runReview();
    setText("");
    const history = turns.map(({ role, text: t }) => ({ role, text: t }));
    setTurns((t) => [...t, { role: "user", text: q }]);
    setBusy(true);
    const r = await askProjectAgent(q, history);
    const actions = r.data?.actions ?? [];
    setTurns((t) => [...t, { role: "agent", text: r.data?.answer ?? r.message ?? tr("تعذّر الرد."), actions, at: Date.now() }]);
    // دايماً بموافقة: ما نفّذ شي لين تضغطون «وافق» (نتجاهل a.auto من الخادم)
    setBusy(false);
  };

  const apply = async (key: string, a: AgentAction) => {
    if (applying) return;
    if (a.type === "set_aim" && latest.current.aim.trim() && !window.confirm(tr("هدفكم الحالي:\n«{0}»\n\nيتبدّل بالهدف المقترح. نكمل؟", latest.current.aim))) return;
    setApplying(key);
    const s = await run(a, a.type === "add_task" ? (assignees[key] ?? a.assigneeId) : undefined);
    setApplying(null);
    setStates((prev) => ({ ...prev, [key]: s }));
    if (s.status === "failed") showToast({ title: tr("ما انحفظ"), desc: tr("حاولوا مرة ثانية."), icon: Check, tone: "rose" });
    else showToast({ title: tr("تم"), desc: doneText(a), icon: Check, tone: "brand" });
  };

  const undo = async (key: string) => {
    const s = states[key];
    if (!s?.undo || applying) return;
    setApplying(key);
    const { error } = await s.undo();
    setApplying(null);
    if (error) {
      showToast({ title: tr("ما قدرنا نتراجع"), desc: tr("حاولوا مرة ثانية."), icon: Check, tone: "rose" });
      return;
    }
    setStates((prev) => ({ ...prev, [key]: { ...s, undone: true } }));
  };

  const memberName = (id: string | undefined) => roster.find((m) => m.id === id)?.name.split(" ")[0];
  const doneText = (a: AgentAction): string =>
    ({
      set_aim: tr("الهدف انحفظ بصفحة المقترح."),
      add_questions: tr("الأسئلة انضافت لأسئلة البحث بالمقترح."),
      set_questions: tr("أسئلة البحث تحدّثت بالمقترح."),
      set_gap: tr("الفجوة البحثية انحفظت بالمقترح."),
      update_task: tr("حالة المهمة تحدّثت."),
      add_event: tr("الموعد انضاف للتقويم."),
      add_task: tr("المهمة انضافت."),
      open: "",
    })[a.type];
  const label = (a: AgentAction): string =>
    ({
      set_aim: tr("اعتمدوه كهدف للدراسة"),
      add_questions: tr("أضيفوها لأسئلة البحث"),
      set_questions: tr("اعتمدوا القائمة الجديدة"),
      set_gap: tr("احفظوها كفجوة بحثية"),
      update_task: tr("حدّثوا الحالة"),
      add_event: tr("أضيفوه للتقويم"),
      add_task: tr("أضف المهمة"),
      open: "",
    })[a.type];
  const statusAr = { todo: tr("لم تبدأ"), "in-progress": tr("قيد التنفيذ"), done: tr("منجزة") } as const;
  const eventAr = { meeting: tr("اجتماع"), review: tr("مراجعة"), fieldwork: tr("عمل ميداني"), deadline: tr("موعد نهائي") } as const;

  const started = turns.length > 0;
  const chips: { label: string; ask: string }[] = suggestions
    ? suggestions.map((s) => ({ label: s, ask: s }))
    : [...SUGGESTIONS, isLeader ? LEADER_SUGGESTION : MEMBER_SUGGESTION, REVIEW_CHIP];

  const messages = started && (
    <ul className={clsx("w-full space-y-3 overflow-y-auto pe-1 text-start", compact ? "min-h-0 flex-1" : "max-h-[26rem]")}>
      {turns.map((t, i) => (
        <li key={i} className={clsx("flex", compact ? "flex-col" : t.role === "user" ? "justify-start" : "justify-end")}>
          <div
            className={clsx(
              "max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-relaxed",
              t.role === "user"
                ? compact
                  ? "ms-auto bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00]"
                  : "bg-[#FF6B00]/20"
                : "border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.88)]",
            )}
          >
            <p className="whitespace-pre-wrap">{t.role === "agent" ? <StreamedText text={t.text} at={t.at} /> : t.text}</p>
            {t.review && (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-3 rounded-2xl border border-[rgba(255,107,0,.3)] p-3">
                  <span className="text-3xl font-extrabold tabular-nums">{t.review.score}</span>
                  <div>
                    <p className={clsx("text-sm font-bold", verdictColor[t.review.verdict])}>{verdictAr[t.review.verdict]}</p>
                    <p className="text-xs text-[#B8ADA2]">{trx("{0} لازم يتعدّل · {1} يستاهل تحسين", t.review.checks.filter((c) => c.status === "fix").length, t.review.checks.filter((c) => c.status === "warn").length)}</p>
                  </div>
                </div>
                {[...t.review.checks]
                  .sort((a, b) => ({ fix: 0, warn: 1, ok: 2 })[a.status] - ({ fix: 0, warn: 1, ok: 2 })[b.status])
                  .map((c, k) => (
                    <div key={k} className="rounded-2xl border border-white/[0.12] p-3">
                      <p className="flex items-center gap-1.5 font-semibold">
                        {c.status === "ok" ? <CheckCircle2 size={14} className="text-[#7fd6a0]" /> : c.status === "fix" ? <AlertTriangle size={14} className="text-[#ff8a8a]" /> : <ClipboardCheck size={14} className="text-[#FFB444]" />}
                        {c.area}
                      </p>
                      <p className="mt-1 text-[13px] text-[#E6DBD1]">{c.finding}</p>
                      {c.status !== "ok" && c.fix && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[#B8ADA2]">
                          <Wrench size={12} className="mt-0.5 shrink-0" /> {c.fix}
                        </p>
                      )}
                    </div>
                  ))}
                <p className="text-[11px] text-[#B8ADA2]/80">{tr("مراجعة آلية من بيانات مقترحكم الحالية — تنفعكم قبل ما تعرضونه على المشرف/ة، ورأيها هو المعتمد.")}</p>
              </div>
            )}
            {t.actions && t.actions.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {t.actions.map((a, j) => {
                  const key = `${i}-${j}`;
                  if (a.type === "open")
                    return (
                      <Link key={key} to={a.to} className={ghostBtn}>
                        {a.label}
                      </Link>
                    );
                  const s = states[key];
                  const chosen = a.type === "add_task" ? (assignees[key] ?? a.assigneeId) : undefined;
                  return (
                    <div key={key} className="rounded-2xl border border-[rgba(255,107,0,.3)] p-3">
                      {a.type === "set_aim" && <p className="font-semibold">{a.text}</p>}
                      {a.type === "set_gap" && <p className="font-semibold">{a.text}</p>}
                      {a.type === "set_questions" && (
                        <>
                          <p className="mb-1 text-xs text-[#B8ADA2]">{tr("القائمة الجديدة لأسئلة البحث:")}</p>
                          <ol className="list-decimal space-y-1 pe-5 font-semibold">
                            {a.texts.map((x, k) => (
                              <li key={k}>{x}</li>
                            ))}
                          </ol>
                        </>
                      )}
                      {a.type === "update_task" && (
                        <p>
                          <b>{a.title}</b>
                          <span className="block text-xs text-[#B8ADA2]">{trx("الحالة ← {0}", statusAr[a.status])}</span>
                        </p>
                      )}
                      {a.type === "add_event" && (
                        <p>
                          <b>{a.title}</b>
                          <span className="block text-xs text-[#B8ADA2]">
                            {eventAr[a.eventType]} — {formatDateLong(a.date)}
                            {a.eventType !== "deadline" && tr(" الساعة {0}", a.time)}
                            {a.location && ` — ${a.location}`}
                          </span>
                        </p>
                      )}
                      {a.type === "add_questions" && (
                        <ul className="list-disc space-y-1 pe-5 font-semibold">
                          {a.texts.map((x, k) => (
                            <li key={k}>{x}</li>
                          ))}
                        </ul>
                      )}
                      {a.type === "add_task" && (
                        <div>
                          <b>{a.title}</b>
                          {a.description && <span className="block text-xs text-[#B8ADA2]">{a.description}</span>}
                          <span className="block text-xs text-[#B8ADA2]/80">{trx("موعدها بعد {0} أيام{1}", a.days, s?.status === "done" && tr(" — مسندة لـ {0}", memberName(chosen) ?? a.assigneeName ?? tr("؟")))}</span>
                          {!s && isLeader && roster.length > 0 && (
                            <label className="mt-2 flex items-center gap-2 text-xs text-[#B8ADA2]">{tr("لمين؟")}<select
                                value={chosen ?? ""}
                                onChange={(e) => setAssignees((p) => ({ ...p, [key]: e.target.value }))}
                                className="rounded-full border border-[rgba(255,200,130,.4)] bg-white/[0.06] px-3 py-1 text-xs text-[#F4F0EC] outline-none"
                              >
                                {roster.map((m) => (
                                  <option key={m.id} value={m.id} className="text-black">
                                    {m.id === currentUser?.id ? tr("{0} (أنت)", m.name) : m.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        {s?.status === "done" ? (
                          <>
                            <span className={clsx("inline-flex items-center gap-1.5 text-sm font-semibold", s.undone ? "text-[#B8ADA2]" : "text-[#7fd6a0]")}>
                              <CheckCircle2 size={15} /> {s.undone ? tr("تراجعنا عنه") : tr("تم")}
                            </span>
                            {s.undo && !s.undone && (
                              <button onClick={() => undo(key)} disabled={applying !== null} className="inline-flex items-center gap-1 text-xs font-semibold text-[#B8ADA2] hover:text-[#F4F0EC]">{trx("{0} تراجع", applying === key ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />)}</button>
                            )}
                          </>
                        ) : s?.status === "dismissed" ? (
                          <span className="text-xs text-[#B8ADA2]">{tr("تجاهلناه.")}</span>
                        ) : allowed(a) ? (
                          <>
                            <button onClick={() => apply(key, a)} disabled={applying !== null || busy} title={label(a)} className={primaryBtn}>
                              {applying === key ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              {s?.status === "failed" ? tr("حاولوا مرة ثانية") : tr("وافق")}
                            </button>
                            <button onClick={() => setStates((prev) => ({ ...prev, [key]: { status: "dismissed" } }))} disabled={applying !== null} className={ghostBtn}>{tr("لا")}</button>
                          </>
                        ) : (
                          <span className="text-xs text-[#B8ADA2]">{a.type === "add_task" ? tr("إنشاء المهام للقائد — اطلبوها منه.") : a.type === "update_task" ? tr("هذي مهمة عضو ثاني — صاحبها أو القائد يحدّثها.") : tr("ما عندكم صلاحية تعديل حاليًا.")}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {t.actions.some((a) => a.type === "set_aim" || a.type === "add_questions" || a.type === "set_questions" || a.type === "set_gap") && (
                  <p className="text-[11px] text-[#B8ADA2]/80">{tr("ناقشوها مع المشرف/ة قبل التسليم، وتقدرون تعدّلونها من صفحة المقترح.")}</p>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
      {busy && (
        <li className={clsx("flex", !compact && "justify-end")}>
          <div className="inline-flex items-center gap-2 rounded-3xl border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.88)] px-4 py-3 text-sm text-[#B8ADA2]">
            <ThinkingLine />
          </div>
        </li>
      )}
      <div ref={endRef} />
    </ul>
  );

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className={clsx(
        "flex w-full items-center gap-3 rounded-full border border-[rgba(255,200,130,.4)] bg-white/[0.06] py-2 ps-5 pe-2",
        compact ? "mt-2" : "mt-2 py-2.5 ps-6 pe-2.5 shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-[22px]",
      )}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={800}
        disabled={mock}
        placeholder={
          mock
            ? tr("الوكيل يشتغل بالنسخة الحقيقية")
            : isLeader
              ? tr("مثال: أعطِ نورة مهمة جمع الدراسات لين الخميس")
              : tr("مثال: احفظ سؤال البحث في المقترح: …")
        }
        aria-label={tr("رسالتكم للوكيل")}
        className="min-w-0 flex-1 bg-transparent text-base text-[#F4F0EC] outline-none placeholder:text-[#8F8378] disabled:opacity-60 md:text-[15px]"
      />
      <button
        type="submit"
        disabled={busy || mock || !text.trim()}
        aria-label={tr("إرسال")}
        className={clsx(
          "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00] shadow-[0_0_30px_rgba(255,140,40,.5)] transition hover:brightness-110 disabled:opacity-50",
          compact ? "h-10 w-10" : "h-12 w-12 md:h-14 md:w-14",
        )}
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={compact ? 18 : 22} strokeWidth={2.6} />}
      </button>
    </form>
  );

  const chipRow = !started && (
    <div className={clsx("flex flex-wrap gap-2.5", compact ? "justify-start" : "justify-center")}>
      {chips.map((q) => (
        <button
          key={q.label}
          type="button"
          disabled={mock}
          onClick={() => send(q.ask)}
          className="rounded-full border border-white/[0.14] px-[18px] py-2 text-start text-[15px] text-[#E6DBD1] transition hover:border-[#FF8A24]/60 hover:bg-[#FF6B00]/10 disabled:opacity-50"
        >
          {q.label}
        </button>
      ))}
    </div>
  );

  // داخل اللوحة الجانبية: بدون الكرة الكبيرة
  if (compact)
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-5 text-[#F4F0EC]">
        {!started && (
          <p className="text-sm leading-relaxed text-[#B8ADA2]">{trx("اسألوه عن وضعكم، أو أعطوه أمر: «احفظ سؤال البحث في المقترح»، «حط هدف الدراسة»، {0} يقترح وأنتم توافقون: ما ينفّذ شي بدون ضغطة «وافق».", isLeader ? tr("«أعطِ سارة مهمة مراجعة الأداة»، «وزّع المهام على الأعضاء».") : tr("ويقترح عليكم مهام يعتمدها القائد."))}</p>
        )}
        {chipRow}
        {messages}
        <div className="mt-auto">{form}</div>
      </div>
    );

  return (
    <section
      aria-label={tr("الوكيل")}
      className="relative isolate overflow-hidden rounded-[40px] border border-[rgba(255,107,0,.3)] bg-[radial-gradient(ellipse_at_50%_0%,#2E0E04_0,#140804_50%,#0A0605_100%)] px-5 py-12 text-[#F4F0EC] sm:px-8 md:min-h-[720px] md:py-16"
    >
      <div aria-hidden className="pointer-events-none absolute left-1/2 -top-[200px] -z-10 h-[560px] w-[700px] -translate-x-1/2 rounded-full bg-[#E8400A] opacity-45 blur-[110px]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 -top-[80px] -z-10 h-[300px] w-[380px] -translate-x-1/2 rounded-full bg-[#FFB444] opacity-45 blur-[100px]" />

      <div className="mx-auto flex max-w-[720px] flex-col items-center gap-5 text-center">
        <AgentOrb size={started ? 56 : 112} state={busy ? "thinking" : "idle"} className="transition-all duration-500" />
        <h1 className={clsx("font-kufi font-extrabold leading-tight", started ? "text-2xl" : "mt-3 text-4xl md:text-5xl")}>{tr("وش نسوي اليوم؟")}</h1>
        {!started && <p className="text-base font-light text-[#B8ADA2] md:text-lg">{tr("الوكيل يعرف بحثكم ومهامكم. اطلبوا، وهو يجهّز.")}</p>}
        {messages}
        {form}
        {chipRow}
      </div>
    </section>
  );
}
