import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Check, CheckCircle2, Loader2 } from "lucide-react";
import clsx from "clsx";
import AiLockedCard from "./AiLockedCard";
import { ghostBtn, primaryBtn } from "./ui/page";
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

/** ٣ اقتراحات سريعة: الاسم المختصر بالزر، والنص الكامل هو اللي يوصل الوكيل */
const SUGGESTIONS = [
  { label: "وين وصلنا؟", ask: "وين وصلنا؟ وش أسوي اليوم؟" },
  { label: "وش المتأخر؟", ask: "وش اللي متأخر عندنا؟" },
  { label: "جهّز اجتماع المشرف/ة", ask: "وش ناقص قبل اجتماعنا مع المشرف/ة؟" },
];

const orbStyle = {
  background: "radial-gradient(circle at 50% 60%,#FFF0C2 0,#FFC85A 22%,#FF7A10 55%,#C2400A 82%,#5A1A04 100%)",
  boxShadow: "0 0 0 14px rgba(255,140,40,.07),0 0 100px rgba(255,140,40,.6)",
};

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

  const mock = !isSupabaseConfigured;
  if (!mock && !hasAiAccess(team)) return <AiLockedCard feature="الوكيل" />;

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy || mock) return;
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

  const started = turns.length > 0;

  return (
    <section
      aria-label="الوكيل"
      className="relative isolate overflow-hidden rounded-[40px] border border-[rgba(255,107,0,.3)] bg-[radial-gradient(ellipse_at_50%_0%,#2E0E04_0,#140804_50%,#0A0605_100%)] px-5 py-12 text-[#F4F0EC] sm:px-8 md:min-h-[720px] md:py-16"
    >
      <div aria-hidden className="pointer-events-none absolute left-1/2 -top-[200px] -z-10 h-[560px] w-[700px] -translate-x-1/2 rounded-full bg-[#E8400A] opacity-45 blur-[110px]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 -top-[80px] -z-10 h-[300px] w-[380px] -translate-x-1/2 rounded-full bg-[#FFB444] opacity-45 blur-[100px]" />

      <div className="mx-auto flex max-w-[720px] flex-col items-center gap-5 text-center">
        <div
          aria-hidden
          className={clsx("ld-breath rounded-full transition-all duration-500", started ? "h-14 w-14" : "h-24 w-24 md:h-[120px] md:w-[120px]")}
          style={started ? { ...orbStyle, boxShadow: "0 0 0 8px rgba(255,140,40,.07),0 0 50px rgba(255,140,40,.5)" } : orbStyle}
        />
        <h1 className={clsx("font-kufi font-extrabold leading-tight", started ? "text-2xl" : "mt-3 text-4xl md:text-5xl")}>وش نسوي اليوم؟</h1>
        {!started && <p className="text-base font-light text-[#B8ADA2] md:text-lg">الوكيل يعرف بحثكم ومهامكم. اطلبوا، وهو يجهّز.</p>}

        {started && (
          <ul className="max-h-[26rem] w-full space-y-3 overflow-y-auto pe-1 text-start">
            {turns.map((t, i) => (
              <li key={i} className={clsx("flex", t.role === "user" ? "justify-start" : "justify-end")}>
                <div className={clsx("max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-relaxed", t.role === "user" ? "bg-[#FF6B00]/20" : "border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.88)]")}>
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
                          <div key={key} className="rounded-2xl border border-[rgba(255,107,0,.3)] p-3">
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
                                {a.description && <span className="block text-xs text-[#B8ADA2]">{a.description}</span>}
                                <span className="block text-xs text-[#B8ADA2]/80">موعدها بعد {a.days} أيام، مسندة لك</span>
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
                                <span className="text-xs text-[#B8ADA2]">{a.type === "add_task" ? "إنشاء المهام لقائدة/قائد الفريق." : "ما عندكم صلاحية تعديل حاليًا."}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {t.actions.some((a) => a.type === "set_aim" || a.type === "add_questions") && (
                        <p className="text-[11px] text-[#B8ADA2]/80">مسودات من كلامكم — عدّلوها وناقشوها مع المشرف/ة قبل ما تعتمدونها.</p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {busy && (
              <li className="flex justify-end">
                <div className="inline-flex items-center gap-2 rounded-3xl border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.88)] px-4 py-3 text-sm text-[#B8ADA2]">
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
          className="mt-2 flex w-full items-center gap-3 rounded-full border border-[rgba(255,200,130,.4)] bg-white/[0.06] py-2.5 ps-6 pe-2.5 shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-[22px]"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={800}
            disabled={mock}
            placeholder={mock ? "الوكيل يشتغل بالنسخة الحقيقية" : "اكتبوا طلبكم… أو قولوا: نبغا ندرس رضا المرضى عن …"}
            aria-label="رسالتكم للوكيل"
            className="min-w-0 flex-1 bg-transparent text-base text-[#F4F0EC] outline-none placeholder:text-[#8F8378] disabled:opacity-60 md:text-[17px]"
          />
          <button
            type="submit"
            disabled={busy || mock || !text.trim()}
            aria-label="إرسال"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00] shadow-[0_0_30px_rgba(255,140,40,.5)] transition hover:brightness-110 disabled:opacity-50 md:h-14 md:w-14"
          >
            {busy ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={22} strokeWidth={2.6} />}
          </button>
        </form>

        {!started && (
          <div className="flex flex-wrap justify-center gap-2.5">
            {SUGGESTIONS.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={mock}
                onClick={() => send(q.ask)}
                className="rounded-full border border-white/[0.14] px-[18px] py-2 text-[15px] text-[#E6DBD1] transition hover:border-[#FF8A24]/60 hover:bg-[#FF6B00]/10 disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
