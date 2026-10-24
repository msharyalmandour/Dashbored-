import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Check, CheckCircle2, Loader2, Undo2 } from "lucide-react";
import clsx from "clsx";
import AiLockedCard from "./AiLockedCard";
import { Panel, ghostBtn, primaryBtn } from "./ui/page";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useProposal } from "../hooks/useProposal";
import { useTasksData } from "../hooks/useTasksData";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { askProjectAgent, type AgentAction, type AskTurn } from "../hooks/useProjectAgent";
import { addDaysISO, formatDateLong, toISODate } from "../lib/date";
import { hasAiAccess } from "../lib/plans";
import { isSupabaseConfigured } from "../lib/supabaseClient";

interface Turn extends AskTurn {
  actions?: AgentAction[];
}

/** حالة كل إجراء: تم (مع طريقة التراجع لو فيه) أو فشل */
interface ActionState {
  status: "done" | "failed";
  undo?: () => Promise<{ error?: string }>;
  undone?: boolean;
}

const QUICK = ["وين وصلنا؟ وش أسوي اليوم؟", "احفظ سؤال البحث في المقترح: …", "وزّع مهام الأسبوع على الأعضاء", "حط اجتماع مع المشرف …", "وش اللي متأخر عندنا؟"];

// المحادثة تبقى لو انقفلت اللوحة أو تنقّلتوا بين الصفحات (لين يتحدّث المتصفح)
let cachedTurns: Turn[] = [];
let cachedStates: Record<string, ActionState> = {};

/** الوكيل: يعرف تقدّمكم ومهامكم ومقترحكم ويجاوب من بياناتكم. لما تأمرونه صراحة («احفظ السؤال بالمقترح»، «وزّع المهام»)
    ينفّذ مباشرة بصلاحياتكم مع زر تراجع، وغير كذا يقترح ببطاقة تضغطونها أو تتجاهلونها. إنشاء المهام للقائد فقط. */
export default function ProjectAgentChat({ compact = false }: { compact?: boolean }) {
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

  if (!isSupabaseConfigured) return null;
  if (!hasAiAccess(team)) return <AiLockedCard feature="الوكيل" />;

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

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    setText("");
    const history = turns.map(({ role, text: t }) => ({ role, text: t }));
    const turnIndex = turns.length + 1;
    setTurns((t) => [...t, { role: "user", text: q }]);
    setBusy(true);
    const r = await askProjectAgent(q, history);
    const actions = r.data?.actions ?? [];
    setTurns((t) => [...t, { role: "agent", text: r.data?.answer ?? r.message ?? "تعذّر الرد.", actions }]);

    // الأوامر الصريحة تتنفّذ مباشرة، بالترتيب
    let ran = 0;
    let failed = 0;
    for (const [j, a] of actions.entries()) {
      if (a.type === "open" || !a.auto || !allowed(a)) continue;
      const s = await run(a);
      setStates((prev) => ({ ...prev, [`${turnIndex}-${j}`]: s }));
      if (s.status === "done") ran++;
      else failed++;
    }
    setBusy(false);
    if (failed > 0) showToast({ title: "ما انحفظ كل شي", desc: "فيه إجراء ما تنفّذ — جرّبوا الزر تحت الرد.", icon: Check, tone: "rose" });
    else if (ran > 0) showToast({ title: "تم", desc: ran === 1 ? "الوكيل نفّذ طلبكم." : `الوكيل نفّذ ${ran} إجراءات.`, icon: Check, tone: "brand" });
  };

  const apply = async (key: string, a: AgentAction) => {
    if (applying) return;
    if (a.type === "set_aim" && latest.current.aim.trim() && !window.confirm(`هدفكم الحالي:\n«${latest.current.aim}»\n\nيتبدّل بالهدف المقترح. نكمل؟`)) return;
    setApplying(key);
    const s = await run(a, a.type === "add_task" ? (assignees[key] ?? a.assigneeId) : undefined);
    setApplying(null);
    setStates((prev) => ({ ...prev, [key]: s }));
    if (s.status === "failed") showToast({ title: "ما انحفظ", desc: "حاولوا مرة ثانية.", icon: Check, tone: "rose" });
    else showToast({ title: "تم", desc: doneText(a), icon: Check, tone: "brand" });
  };

  const undo = async (key: string) => {
    const s = states[key];
    if (!s?.undo || applying) return;
    setApplying(key);
    const { error } = await s.undo();
    setApplying(null);
    if (error) {
      showToast({ title: "ما قدرنا نتراجع", desc: "حاولوا مرة ثانية.", icon: Check, tone: "rose" });
      return;
    }
    setStates((prev) => ({ ...prev, [key]: { ...s, undone: true } }));
  };

  const memberName = (id: string | undefined) => roster.find((m) => m.id === id)?.name.split(" ")[0];
  const doneText = (a: AgentAction): string =>
    ({
      set_aim: "الهدف انحفظ بصفحة المقترح.",
      add_questions: "الأسئلة انضافت لأسئلة البحث بالمقترح.",
      set_questions: "أسئلة البحث تحدّثت بالمقترح.",
      set_gap: "الفجوة البحثية انحفظت بالمقترح.",
      update_task: "حالة المهمة تحدّثت.",
      add_event: "الموعد انضاف للتقويم.",
      add_task: "المهمة انضافت.",
      open: "",
    })[a.type];
  const label = (a: AgentAction): string =>
    ({
      set_aim: "اعتمدوه كهدف للدراسة",
      add_questions: "أضيفوها لأسئلة البحث",
      set_questions: "اعتمدوا القائمة الجديدة",
      set_gap: "احفظوها كفجوة بحثية",
      update_task: "حدّثوا الحالة",
      add_event: "أضيفوه للتقويم",
      add_task: "أضف المهمة",
      open: "",
    })[a.type];
  const statusAr = { todo: "لم تبدأ", "in-progress": "قيد التنفيذ", done: "منجزة" } as const;
  const eventAr = { meeting: "اجتماع", review: "مراجعة", fieldwork: "عمل ميداني", deadline: "موعد نهائي" } as const;

  const bubbleUser = compact ? "ms-auto bg-brand-500 text-white" : "bg-brand-500/20 text-brand-950";
  const bubbleAgent = compact ? "bg-surface-muted text-brand-950/85" : "bg-black/30 text-brand-950/90";
  const card = compact ? "rounded-xl border border-brand-100 bg-paper/60 p-3" : "rounded-xl border border-brand-500/30 p-3";

  const body = (
    <>
      {turns.length === 0 && (
        <div className="mb-4">
          <p className="text-sm leading-relaxed text-brand-950/65">
            اسألوه عن وضعكم، أو أعطوه أمر: «احفظ سؤال البحث في المقترح»، «حط هدف الدراسة»، {isLeader ? "«أعطِ سارة مهمة مراجعة الأداة»، «وزّع المهام على الأعضاء»." : "ويقترح عليكم مهام يعتمدها القائد."} ينفّذ مباشرة ومعه زر تراجع.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.filter((q) => isLeader || !q.startsWith("وزّع")).map((q) => (
              <button
                key={q}
                onClick={() => (q.includes("…") ? setText(q.replace("…", "").trim() + " ") : send(q))}
                className="rounded-full border border-brand-500/30 px-3.5 py-1.5 text-xs font-semibold text-brand-950/70 hover:border-brand-500/60 hover:text-brand-950"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {turns.length > 0 && (
        <ul className={clsx("mb-4 space-y-3 overflow-y-auto pe-1", compact ? "flex-1" : "max-h-[28rem]")}>
          {turns.map((t, i) => (
            <li key={i} className={clsx("flex", compact ? "flex-col" : t.role === "user" ? "justify-start" : "justify-end")}>
              <div className={clsx("max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed", t.role === "user" ? bubbleUser : bubbleAgent)}>
                <p className="whitespace-pre-wrap">{t.text}</p>
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
                        <div key={key} className={card}>
                          {a.type === "set_aim" && <p className="font-semibold">{a.text}</p>}
                          {(a.type === "set_gap") && <p className="font-semibold">{a.text}</p>}
                          {a.type === "set_questions" && (
                            <>
                              <p className="mb-1 text-xs text-brand-950/50">القائمة الجديدة لأسئلة البحث:</p>
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
                              <span className="block text-xs text-brand-950/55">الحالة ← {statusAr[a.status]}</span>
                            </p>
                          )}
                          {a.type === "add_event" && (
                            <p>
                              <b>{a.title}</b>
                              <span className="block text-xs text-brand-950/55">
                                {eventAr[a.eventType]} — {formatDateLong(a.date)}
                                {a.eventType !== "deadline" && ` الساعة ${a.time}`}
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
                              {a.description && <span className="block text-xs text-brand-950/60">{a.description}</span>}
                              <span className="block text-xs text-brand-950/45">
                                موعدها بعد {a.days} أيام
                                {s?.status === "done" && ` — مسندة لـ ${memberName(chosen) ?? a.assigneeName ?? "؟"}`}
                              </span>
                              {!s && isLeader && roster.length > 0 && (
                                <label className="mt-2 flex items-center gap-2 text-xs text-brand-950/60">
                                  لمين؟
                                  <select
                                    value={chosen ?? ""}
                                    onChange={(e) => setAssignees((p) => ({ ...p, [key]: e.target.value }))}
                                    className="rounded-lg border border-brand-100 bg-paper px-2 py-1 text-xs text-brand-950"
                                  >
                                    {roster.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.id === currentUser?.id ? `${m.name} (أنت)` : m.name}
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
                                <span className={clsx("inline-flex items-center gap-1.5 text-sm font-semibold", s.undone ? "text-brand-950/45" : "text-[#7fd6a0]")}>
                                  <CheckCircle2 size={15} /> {s.undone ? "تراجعنا عنه" : "تم"}
                                </span>
                                {s.undo && !s.undone && (
                                  <button onClick={() => undo(key)} disabled={applying !== null} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-950/55 hover:text-brand-950">
                                    {applying === key ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} تراجع
                                  </button>
                                )}
                              </>
                            ) : allowed(a) ? (
                              <button onClick={() => apply(key, a)} disabled={applying !== null || busy} className={primaryBtn}>
                                {applying === key ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {s?.status === "failed" ? "حاولوا مرة ثانية" : label(a)}
                              </button>
                            ) : (
                              <span className="text-xs text-brand-950/50">{a.type === "add_task" ? "إنشاء المهام للقائد — اطلبوها منه." : a.type === "update_task" ? "هذي مهمة عضو ثاني — صاحبها أو القائد يحدّثها." : "ما عندكم صلاحية تعديل حاليًا."}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {t.actions.some((a) => a.type === "set_aim" || a.type === "add_questions" || a.type === "set_questions" || a.type === "set_gap") && (
                      <p className="text-[11px] text-brand-950/40">ناقشوها مع المشرف/ة قبل التسليم، وتقدرون تعدّلونها من صفحة المقترح.</p>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li className={clsx("flex", !compact && "justify-end")}>
              <div className={clsx("inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-brand-950/60", bubbleAgent)}>
                <Loader2 size={14} className="animate-spin" /> الوكيل يشتغل على مشروعكم…
              </div>
            </li>
          )}
          <div ref={endRef} />
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          maxLength={800}
          placeholder={isLeader ? "مثال: أعطِ نورة مهمة جمع الدراسات لين الخميس" : "مثال: احفظ سؤال البحث في المقترح: …"}
          aria-label="رسالتكم للوكيل"
          className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-brand-100 bg-paper px-4 py-3 text-sm outline-none focus:border-brand-300"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="إرسال" className={clsx(primaryBtn, "!h-12 !w-12 !p-0")}>
          <ArrowUp size={18} />
        </button>
      </form>
    </>
  );

  if (compact) return <div className="flex min-h-0 flex-1 flex-col p-4">{body}</div>;
  return (
    <Panel title="اسألوا الوكيل عن مشروعكم" hint="يعرف مهامكم ومقترحكم وتقدمكم — وينفّذ أوامركم">
      {body}
    </Panel>
  );
}
