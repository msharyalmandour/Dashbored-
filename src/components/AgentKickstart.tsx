import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, CheckCircle2, Loader2, Wand2 } from "lucide-react";
import clsx from "clsx";
import AiLockedCard from "./AiLockedCard";
import SourceList from "./ui/SourceList";
import { Panel, ghostBtn, primaryBtn, rowSurface } from "./ui/page";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useProposal } from "../hooks/useProposal";
import { useResearchProject } from "../hooks/useResearchProject";
import { useTasksData } from "../hooks/useTasksData";
import { runProjectAgent, type AgentResult } from "../hooks/useProjectAgent";
import { addDaysISO, toISODate } from "../lib/date";
import { hasAiAccess } from "../lib/plans";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const STORE_KEY = "wesync.kickstart.last";
type Section = "papers" | "gap" | "questions" | "tasks";

function load(): AgentResult | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as AgentResult) : null;
  } catch {
    return null;
  }
}

/** «جهّزوا لنا البداية»: الوكيل يدوّر بدراسات حقيقية عن عنوانكم ويطلّع لكم دراسات + مسودة فجوة + أسئلة + مهام،
    كل قسم بطاقة موافقة (احفظوه / تجاهلوه). ما ينحفظ شي قبل ضغطتكم، ولا يكتب البحث بدالكم — هذي نقطة انطلاق للنقاش مع المشرف/ة. */
export default function AgentKickstart() {
  const { team, currentUser, isLeader, canWrite } = useAuth();
  const { showToast } = useToast();
  const { project } = useResearchProject();
  const { papers: savedPapers, addPaper } = useEvidencePapers();
  const { gap, questions, updateGap, setResearchQuestions } = useProposal();
  const { addTask } = useTasksData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState(load);
  const [done, setDone] = useState<Partial<Record<Section, boolean>>>({});
  const [applying, setApplying] = useState<Section | null>(null);
  const [skipPaper, setSkipPaper] = useState<Record<number, boolean>>({});
  const [skipQuestion, setSkipQuestion] = useState<Record<number, boolean>>({});
  const [skipTask, setSkipTask] = useState<Record<number, boolean>>({});

  if (!isSupabaseConfigured) return null;
  if (!hasAiAccess(team)) return <AiLockedCard feature="تجهيز البداية بالوكيل" />;

  const title = project?.title?.trim() ?? "";
  const existingQs = questions.map((q) => q.text);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const r = await runProjectAgent("kickstart", title, existingQs);
    setBusy(false);
    if (r.message || !r.data) {
      setMessage(r.message ?? "تعذّر التجهيز — حاولوا مرة ثانية.");
      return;
    }
    setResult(r.data);
    setDone({});
    setSkipPaper({});
    setSkipQuestion({});
    setSkipTask({});
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(r.data));
    } catch {
      // بدون تخزين محلي: تختفي النتيجة عند تحديث الصفحة
    }
  };

  const mark = (s: Section) => setDone((d) => ({ ...d, [s]: true }));
  const fail = (what: string) => showToast({ title: `ما انحفظ ${what}`, desc: "حاولوا مرة ثانية.", icon: Check, tone: "rose" });

  const savePapers = async () => {
    if (!result) return;
    setApplying("papers");
    const existingTitles = new Set(savedPapers.map((p) => p.title.trim().toLowerCase()));
    let saved = 0;
    for (let i = 0; i < result.papers.length; i++) {
      const p = result.papers[i];
      if (skipPaper[i] || existingTitles.has(p.title.trim().toLowerCase())) continue;
      const { error } = await addPaper({
        title: p.title,
        authors: p.authors || "غير معروف",
        year: p.year ?? new Date().getFullYear(),
        theme: "Nursing Knowledge",
        studyDesign: [p.studyDesign, p.sampleSize].filter(Boolean).join(" · "),
        keyFinding: p.keyFinding || p.summaryAr,
        relevance: p.relevanceReason,
        section: "literature-review",
        addedById: currentUser?.id ?? "",
        link: p.url,
      });
      if (error) {
        setApplying(null);
        return fail("الدراسات");
      }
      saved++;
    }
    setApplying(null);
    mark("papers");
    showToast({ title: saved > 0 ? `انحفظت ${saved} دراسة بمكتبتكم` : "الدراسات موجودة عندكم من قبل", desc: "تلقونها بمكتبة الأدلة ومراجعة الأدبيات.", icon: Check, tone: "brand" });
  };

  const saveGap = async () => {
    if (!result?.gap) return;
    setApplying("gap");
    const g = result.gap;
    const hasOwn = gap.whatWeKnow.length > 0 || gap.whatWeDontKnow.length > 0 || gap.gapStatement.trim().length > 0;
    // لو عندهم فجوة مكتوبة ما نمسحها — نضيف الجديد بعدها
    const { error } = await updateGap({
      whatWeKnow: [...gap.whatWeKnow, ...g.whatWeKnow.map((x) => x.text)],
      whatWeDontKnow: [...gap.whatWeDontKnow, ...g.whatWeDontKnow.map((x) => x.text)],
      gapStatement: hasOwn && gap.gapStatement.trim() ? gap.gapStatement : g.gapStatement,
    });
    setApplying(null);
    if (error) return fail("الفجوة");
    mark("gap");
    showToast({ title: "انضافت مسودة الفجوة", desc: hasOwn ? "أضفناها بعد اللي كتبتوه — ما مسحنا شي." : "عدّلوها وناقشوها مع المشرف/ة.", icon: Check, tone: "brand" });
  };

  const saveQuestions = async () => {
    if (!result) return;
    setApplying("questions");
    const picked = result.questions.filter((_, i) => !skipQuestion[i]).map((q) => q.question);
    const have = new Set(existingQs.map((q) => q.trim()));
    const { error } = await setResearchQuestions([...existingQs, ...picked.filter((q) => !have.has(q.trim()))]);
    setApplying(null);
    if (error) return fail("الأسئلة");
    mark("questions");
    showToast({ title: "انضافت الأسئلة", desc: "تلقونها بصفحة المقترح تحت «أسئلة البحث».", icon: Check, tone: "brand" });
  };

  const saveTasks = async () => {
    if (!result?.tasks || !currentUser) return;
    setApplying("tasks");
    const due = addDaysISO(toISODate(new Date()), 7);
    for (let i = 0; i < result.tasks.length; i++) {
      if (skipTask[i]) continue;
      const t = result.tasks[i];
      const { error } = await addTask({ title: t.title, description: t.description, assigneeId: currentUser.id, dueDate: due, priority: "medium" });
      if (error) {
        setApplying(null);
        return fail("المهام");
      }
    }
    setApplying(null);
    mark("tasks");
    showToast({ title: "انضافت المهام", desc: "مسندة لك وموعدها بعد أسبوع — وزّعوها من صفحة مهامي.", icon: Check, tone: "brand" });
  };

  const Approve = ({ section, onClick, label, disabled }: { section: Section; onClick: () => void; label: string; disabled?: boolean }) =>
    done[section] ? (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7fd6a0]">
        <CheckCircle2 size={16} /> تم
      </span>
    ) : (
      <button onClick={onClick} disabled={!canWrite || disabled || applying !== null} className={primaryBtn}>
        {applying === section ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        {label}
      </button>
    );

  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <input type="checkbox" checked={on} onChange={onChange} disabled={!canWrite} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand-500)]" aria-label="ضمّنوه" />
  );

  return (
    <Panel title="جهّزوا لنا البداية" hint="الوكيل يشتغل، وأنتم توافقون">
      <p className="text-sm leading-relaxed text-brand-950/65">
        اضغطوا زر واحد وتخلّون الوكيل يدوّر بدراسات منشورة عن عنوانكم، ويرجّع لكم: <b className="text-brand-950">دراسات</b> تحفظونها بمكتبتكم،
        و<b className="text-brand-950">مسودة فجوة بحثية</b>، و<b className="text-brand-950">أسئلة بحث</b> مبنية على الدراسات، و<b className="text-brand-950">مهام</b> للخطوة الجاية.
        ما ينحفظ شي قبل ما توافقون، وكلها نقطة انطلاق تناقشونها مع المشرف/ة — مو بديل عن شغلكم.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={run} disabled={busy || !title || !canWrite} className={primaryBtn}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          {busy ? "الوكيل يدوّر بالدراسات… (حوالي دقيقة)" : result ? "جهّزوا من جديد" : "جهّزوا لنا البداية"}
        </button>
        {!title && <span className="text-sm text-brand-950/50">اكتبوا عنوان البحث أول (من الرئيسية أو المقترح).</span>}
        {title && <span className="text-xs text-brand-950/45" dir="auto">العنوان: {title}</span>}
      </div>
      {message && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-500">{message}</p>}

      {result && (
        <div className="mt-6 space-y-6">
          {result.noveltyNote && <p className="rounded-2xl bg-black/25 px-4 py-3 text-sm text-brand-950/70">💡 {result.noveltyNote}</p>}

          {/* ١. الدراسات */}
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-brand-950">١. دراسات قريبة من موضوعكم ({result.papers.length})</h3>
              <Approve section="papers" onClick={savePapers} label="احفظوا المختارة بمكتبتكم" disabled={result.papers.every((_, i) => skipPaper[i])} />
            </div>
            <ul className="space-y-2">
              {result.papers.map((p, i) => (
                <li key={i} className={clsx(rowSurface, "flex gap-3", skipPaper[i] && "opacity-50")}>
                  <Toggle on={!skipPaper[i]} onChange={() => setSkipPaper((s) => ({ ...s, [i]: !s[i] }))} />
                  <div className="min-w-0 flex-1">
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-950 hover:text-amber-accent-400" dir="ltr">
                      {p.title}
                    </a>
                    <p className="text-xs text-brand-950/45" dir="ltr">{[p.authors, p.year, p.journal].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-sm text-brand-950/70">{p.summaryAr}</p>
                    {p.keyFinding && <p className="mt-0.5 text-xs text-brand-950/55">أهم نتيجة: {p.keyFinding}</p>}
                    {p.limitation && <p className="mt-0.5 text-xs text-amber-accent-400/80">ما تركته مفتوح: {p.limitation}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ٢. الفجوة */}
          {result.gap && (result.gap.whatWeKnow.length > 0 || result.gap.whatWeDontKnow.length > 0 || result.gap.gapStatement) && (
            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-brand-950">٢. مسودة الفجوة البحثية</h3>
                <Approve section="gap" onClick={saveGap} label="أضيفوها لقسم الفجوة" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className={rowSurface}>
                  <p className="mb-1.5 text-sm font-bold text-brand-950">اللي نعرفه</p>
                  <ul className="space-y-2 text-sm text-brand-950/75">
                    {result.gap.whatWeKnow.map((g, i) => (
                      <li key={i}>
                        {g.text}
                        <SourceList papers={result.papers} sources={g.sources} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={rowSurface}>
                  <p className="mb-1.5 text-sm font-bold text-brand-950">اللي ما نعرفه</p>
                  <ul className="space-y-2 text-sm text-brand-950/75">
                    {result.gap.whatWeDontKnow.map((g, i) => (
                      <li key={i}>
                        {g.text}
                        <SourceList papers={result.papers} sources={g.sources} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {result.gap.gapStatement && <p className="mt-2 rounded-2xl bg-black/25 px-4 py-3 text-sm text-brand-950/80">{result.gap.gapStatement}</p>}
              <p className="mt-1.5 text-[11px] text-brand-950/40">مسودة مبنية على ملخصات الدراسات فقط — اقرأوا الدراسات كاملة وناقشوها مع المشرف/ة قبل ما تعتمدونها.</p>
            </section>
          )}

          {/* ٣. الأسئلة */}
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-brand-950">٣. أسئلة بحث مبنية على الدراسات ({result.questions.length})</h3>
              <Approve section="questions" onClick={saveQuestions} label="أضيفوا المختارة لأسئلة البحث" disabled={result.questions.every((_, i) => skipQuestion[i])} />
            </div>
            <ul className="space-y-2">
              {result.questions.map((q, i) => (
                <li key={i} className={clsx(rowSurface, "flex gap-3", skipQuestion[i] && "opacity-50")}>
                  <Toggle on={!skipQuestion[i]} onChange={() => setSkipQuestion((s) => ({ ...s, [i]: !s[i] }))} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-relaxed text-brand-950">{q.question}</p>
                    {q.why && <p className="mt-0.5 text-sm text-brand-950/60">{q.why}</p>}
                    <p className="mt-0.5 text-xs text-brand-950/45">{[q.type, q.design, q.variables && `المتغيرات: ${q.variables}`].filter(Boolean).join(" · ")}</p>
                    <SourceList papers={result.papers} sources={q.sources} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ٤. المهام */}
          {result.tasks && result.tasks.length > 0 && (
            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-brand-950">٤. خطواتكم الجاية ({result.tasks.length})</h3>
                {isLeader ? (
                  <Approve section="tasks" onClick={saveTasks} label="حوّلوها لمهام" disabled={result.tasks.every((_, i) => skipTask[i])} />
                ) : (
                  <span className="text-xs text-brand-950/50">إنشاء المهام لقائدة/قائد الفريق.</span>
                )}
              </div>
              <ul className="space-y-2">
                {result.tasks.map((t, i) => (
                  <li key={i} className={clsx(rowSurface, "flex gap-3", skipTask[i] && "opacity-50")}>
                    {isLeader && <Toggle on={!skipTask[i]} onChange={() => setSkipTask((s) => ({ ...s, [i]: !s[i] }))} />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-950">{t.title}</p>
                      {t.description && <p className="text-xs text-brand-950/55">{t.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t border-brand-100/20 pt-4 text-sm">
            <Link to="/evidence" className={ghostBtn}>مكتبة الأدلة</Link>
            <Link to="/proposal" className={ghostBtn}>المقترح البحثي</Link>
            <Link to="/tasks" className={ghostBtn}>مهامي</Link>
          </div>
        </div>
      )}
    </Panel>
  );
}
