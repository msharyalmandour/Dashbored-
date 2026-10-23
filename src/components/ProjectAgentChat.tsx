import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Check, CheckCircle2, Loader2 } from "lucide-react";
import clsx from "clsx";
import AiLockedCard from "./AiLockedCard";
import { Panel, ghostBtn, primaryBtn } from "./ui/page";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useProposal } from "../hooks/useProposal";
import { useTasksData } from "../hooks/useTasksData";
import { askProjectAgent, type AgentAction, type AskTurn } from "../hooks/useProjectAgent";
import { addDaysISO, toISODate } from "../lib/date";
import { hasAiAccess } from "../lib/plans";
import { isSupabaseConfigured } from "../lib/supabaseClient";

interface Turn extends AskTurn {
  actions?: AgentAction[];
}

const QUICK = ["وين وصلنا؟ وش أسوي اليوم؟", "نبغا ندرس … (اكتبوا فكرتكم) — اكتب لنا الهدف والأسئلة", "وش اللي متأخر عندنا؟", "وش ناقص قبل اجتماعنا مع المشرف/ة؟"];

/** «اسألوا الوكيل»: يعرف تقدّمكم ومهامكم ومقترحكم، يجاوب من بياناتكم، ولما تقولون له وش تبون تدرسون يقترح الهدف والأسئلة والمهام —
    كلها بطاقات موافقة: ما يحفظ شي قبل ضغطتكم. */
export default function ProjectAgentChat() {
  const { team, currentUser, isLeader, canWrite } = useAuth();
  const { showToast } = useToast();
  const { aim, questions, updateAimStatement, setResearchQuestions } = useProposal();
  const { addTask } = useTasksData();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  if (!isSupabaseConfigured) return null;
  if (!hasAiAccess(team)) return <AiLockedCard feature="الوكيل" />;

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    setText("");
    const history = turns.map(({ role, text: t }) => ({ role, text: t }));
    setTurns((t) => [...t, { role: "user", text: q }]);
    setBusy(true);
    const r = await askProjectAgent(q, history);
    setBusy(false);
    setTurns((t) => [...t, { role: "agent", text: r.data?.answer ?? r.message ?? "تعذّر الرد.", actions: r.data?.actions }]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const apply = async (key: string, a: AgentAction) => {
    if (applying) return;
    setApplying(key);
    let error: string | undefined;
    if (a.type === "set_aim") {
      if (aim.statement.trim() && !window.confirm(`هدفكم الحالي:\n«${aim.statement}»\n\nيتبدّل بالهدف المقترح. نكمل؟`)) {
        setApplying(null);
        return;
      }
      error = (await updateAimStatement(a.text)).error;
    } else if (a.type === "add_questions") {
      const have = new Set(questions.map((x) => x.text.trim()));
      error = (await setResearchQuestions([...questions.map((x) => x.text), ...a.texts.filter((x) => !have.has(x.trim()))])).error;
    } else if (a.type === "add_task" && currentUser) {
      error = (await addTask({ title: a.title, description: a.description, assigneeId: currentUser.id, dueDate: addDaysISO(toISODate(new Date()), a.days), priority: "medium" })).error;
    }
    setApplying(null);
    if (error) {
      showToast({ title: "ما انحفظ", desc: "حاولوا مرة ثانية.", icon: Check, tone: "rose" });
      return;
    }
    setDone((d) => ({ ...d, [key]: true }));
    showToast({ title: "تم", desc: a.type === "set_aim" ? "الهدف انحفظ بصفحة المقترح." : a.type === "add_questions" ? "الأسئلة انضافت بصفحة المقترح." : "المهمة انضافت لمهامكم.", icon: Check, tone: "brand" });
  };

  const label = (a: AgentAction) =>
    a.type === "set_aim" ? "اعتمدوه كهدف للدراسة" : a.type === "add_questions" ? "أضيفوها لأسئلة البحث" : a.type === "add_task" ? "أضيفوها لمهامكم" : "";

  return (
    <Panel title="اسألوا الوكيل عن مشروعكم" hint="يعرف مهامكم ومقترحكم وتقدمكم">
      {turns.length === 0 && (
        <div className="mb-4">
          <p className="text-sm leading-relaxed text-brand-950/65">
            اسألوه عن وضعكم، أو قولوا له وش تبون تدرسون ويقترح لكم الهدف والأسئلة ويجهّز لكم الخطوة الجاية. كل اقتراح يجي ببطاقة تضغطون عليها أو تتجاهلونها.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => (q.includes("…") ? setText(q.replace("…", "").replace("(اكتبوا فكرتكم)", "").trim() + " ") : send(q))}
                className="rounded-full border border-brand-500/30 px-3.5 py-1.5 text-xs font-semibold text-brand-950/70 hover:border-brand-500/60 hover:text-brand-950"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {turns.length > 0 && (
        <ul className="mb-4 max-h-[28rem] space-y-3 overflow-y-auto pe-1">
          {turns.map((t, i) => (
            <li key={i} className={clsx("flex", t.role === "user" ? "justify-start" : "justify-end")}>
              <div className={clsx("max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed", t.role === "user" ? "bg-brand-500/20 text-brand-950" : "bg-black/30 text-brand-950/90")}>
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
                      const canDo = canWrite && (a.type !== "add_task" || isLeader);
                      return (
                        <div key={key} className="rounded-xl border border-brand-500/30 p-3">
                          {a.type === "set_aim" && <p className="font-semibold">{a.text}</p>}
                          {a.type === "add_questions" && (
                            <ul className="list-disc space-y-1 pe-5 font-semibold">
                              {a.texts.map((x, k) => (
                                <li key={k}>{x}</li>
                              ))}
                            </ul>
                          )}
                          {a.type === "add_task" && (
                            <p>
                              <b>{a.title}</b>
                              {a.description && <span className="block text-xs text-brand-950/60">{a.description}</span>}
                              <span className="block text-xs text-brand-950/45">موعدها بعد {a.days} أيام، مسندة لك</span>
                            </p>
                          )}
                          <div className="mt-2.5">
                            {done[key] ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7fd6a0]">
                                <CheckCircle2 size={15} /> تم
                              </span>
                            ) : canDo ? (
                              <button onClick={() => apply(key, a)} disabled={applying !== null} className={primaryBtn}>
                                {applying === key ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {label(a)}
                              </button>
                            ) : (
                              <span className="text-xs text-brand-950/50">{a.type === "add_task" ? "إنشاء المهام لقائدة/قائد الفريق." : "ما عندكم صلاحية تعديل حاليًا."}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {t.actions.some((a) => a.type === "set_aim" || a.type === "add_questions") && (
                      <p className="text-[11px] text-brand-950/40">مسودات من كلامكم — عدّلوها وناقشوها مع المشرف/ة قبل ما تعتمدونها.</p>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li className="flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-black/30 px-4 py-3 text-sm text-brand-950/60">
                <Loader2 size={14} className="animate-spin" /> الوكيل يراجع مشروعكم…
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
          placeholder="اسألوا: وين وصلنا؟ — أو: نبغا ندرس رضا المرضى عن …"
          aria-label="رسالتكم للوكيل"
          className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-brand-100 bg-paper px-4 py-3 text-sm outline-none focus:border-brand-300"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="إرسال" className={clsx(primaryBtn, "!h-12 !w-12 !p-0")}>
          <ArrowUp size={18} />
        </button>
      </form>
    </Panel>
  );
}
