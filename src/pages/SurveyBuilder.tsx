import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  Lightbulb,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import Card from "../components/ui/Card";
import Term from "../components/Term";
import SurveyRunner from "../components/survey/SurveyRunner";
import AiLockedCard from "../components/AiLockedCard";
import { callStudy } from "../hooks/useStudyTools";
import { hasAiAccess } from "../lib/plans";
import { useAuth } from "../context/AuthContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useSurveyResponses, useSurveys, type Survey } from "../hooks/useSurveys";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { sampleSizeProportion } from "../lib/stats";
import { alphaLabel, downloadText, likertAlpha, summarize, toCsv, toTsv } from "../lib/surveyResults";
import {
  blankQuestion,
  lessons,
  lintQuestion,
  lintSurvey,
  qTypeMeta,
  questionTemplates,
  type QType,
  type Question,
  type Tip,
} from "../lib/surveyCoach";

type Step = "goal" | "questions" | "consent" | "preview" | "publish" | "results";

const steps: { id: Step; label: string; icon: typeof Target }[] = [
  { id: "goal", label: "الهدف", icon: Target },
  { id: "questions", label: "الأسئلة", icon: ClipboardCheck },
  { id: "consent", label: "الموافقة", icon: Lock },
  { id: "preview", label: "جرّبوا", icon: Eye },
  { id: "publish", label: "انشروا", icon: Send },
  { id: "results", label: "النتائج", icon: Check },
];

function Coach({ title, children, tone = "info" }: { title: string; children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "warn" ? "border-amber-accent-400/40 bg-amber-accent-500/10" : "border-brand-200/60 bg-brand-500/[0.06]"}`}>
      <p className="flex items-center gap-2 text-sm font-extrabold text-brand-950">
        {tone === "warn" ? <AlertTriangle size={15} className="text-amber-accent-600" /> : <Lightbulb size={15} className="text-brand-500" />}
        {title}
      </p>
      <div className="mt-1.5 text-xs leading-relaxed text-brand-950/65">{children}</div>
    </div>
  );
}

function TipRow({ tip }: { tip: Tip }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${tip.level === "warn" ? "border-amber-accent-400/40 bg-amber-accent-500/10" : "border-brand-100 bg-surface-muted"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-start font-bold text-brand-950">
        {tip.level === "warn" ? <AlertTriangle size={13} className="shrink-0 text-amber-accent-600" /> : <Lightbulb size={13} className="shrink-0 text-brand-500" />}
        <span className="flex-1">{tip.title}</span>
        <span className="text-[10px] font-semibold text-brand-950/40">{open ? "إخفاء" : "ليش؟"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 leading-relaxed text-brand-950/70">
          <p>{tip.why}</p>
          {tip.bad && <p className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-500">✗ {tip.bad}</p>}
          {tip.good && <p className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-500">✓ {tip.good}</p>}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  q,
  i,
  total,
  locked,
  onChange,
  onMove,
  onDelete,
  onDuplicate,
}: {
  q: Question;
  i: number;
  total: number;
  locked: boolean;
  onChange: (q: Question) => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const tips = useMemo(() => lintQuestion(q), [q]);
  const input = "w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300 disabled:opacity-60";
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-xs font-extrabold text-brand-600">{i + 1}</span>
        <select
          disabled={locked}
          value={q.type}
          onChange={(e) => {
            const type = e.target.value as QType;
            onChange({ ...q, type, options: type === "single" || type === "multi" ? (q.options?.length ? q.options : ["", ""]) : undefined });
          }}
          className="rounded-lg border border-brand-100 bg-paper px-2 py-1.5 text-xs font-bold text-brand-950 outline-none"
        >
          {(Object.keys(qTypeMeta) as QType[]).map((t) => (
            <option key={t} value={t}>
              {qTypeMeta[t].label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-950/60">
          <input disabled={locked} type="checkbox" checked={q.required} onChange={(e) => onChange({ ...q, required: e.target.checked })} className="accent-brand-500" />
          مطلوب
        </label>
        <div className="ms-auto flex items-center gap-1">
          <button disabled={locked || i === 0} onClick={() => onMove(-1)} title="فوق" className="rounded-lg p-1.5 text-brand-950/50 hover:bg-surface-muted disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button disabled={locked || i === total - 1} onClick={() => onMove(1)} title="تحت" className="rounded-lg p-1.5 text-brand-950/50 hover:bg-surface-muted disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button disabled={locked} onClick={onDuplicate} title="نسخ" className="rounded-lg p-1.5 text-brand-950/50 hover:bg-surface-muted disabled:opacity-30">
            <Copy size={14} />
          </button>
          <button disabled={locked} onClick={onDelete} title="حذف" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 disabled:opacity-30">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-brand-950/45">{qTypeMeta[q.type].hint}</p>
      <textarea
        disabled={locked}
        value={q.text}
        onChange={(e) => onChange({ ...q, text: e.target.value })}
        rows={2}
        placeholder={q.type === "likert" ? "اكتبوا «عبارة» مثل: أشعر بالرضا عن التدريب الميداني." : "اكتبوا نص السؤال…"}
        className={input}
      />
      {(q.type === "single" || q.type === "multi") && (
        <div className="space-y-1.5">
          {(q.options ?? []).map((o, k) => (
            <div key={k} className="flex items-center gap-2">
              <input
                disabled={locked}
                value={o}
                onChange={(e) => onChange({ ...q, options: (q.options ?? []).map((x, j) => (j === k ? e.target.value : x)) })}
                placeholder={`خيار ${k + 1}`}
                className={input}
              />
              <button
                disabled={locked || (q.options ?? []).length <= 2}
                onClick={() => onChange({ ...q, options: (q.options ?? []).filter((_, j) => j !== k) })}
                className="rounded-lg p-1.5 text-brand-950/40 hover:text-rose-500 disabled:opacity-30"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button disabled={locked || (q.options ?? []).length >= 12} onClick={() => onChange({ ...q, options: [...(q.options ?? []), ""] })} className="text-xs font-bold text-brand-600 hover:underline disabled:opacity-40">
            + خيار
          </button>
        </div>
      )}
      {q.type === "likert" && <p className="rounded-lg bg-surface-muted px-3 py-2 text-[11px] text-brand-950/55">الخيارات ثابتة: أوافق بشدة · أوافق · محايد · لا أوافق · لا أوافق بشدة</p>}
      {tips.length > 0 && (
        <div className="space-y-1.5">
          {tips.map((t) => (
            <TipRow key={t.title} tip={t} />
          ))}
        </div>
      )}
    </Card>
  );
}

function defaultConsent(title: string, supervisor: string, university: string, email: string) {
  return `أنتم مدعوّون للمشاركة في دراسة بحثية بعنوان: «${title || "[عنوان الدراسة]"}»${university ? ` (${university})` : ""}.

الهدف: [اكتبوا هدف الدراسة بجملة بسيطة].

المشاركة اختيارية بالكامل، ويحق لكم التوقف عن الإجابة في أي وقت دون أي عواقب. الإجابات مجهولة ولا نطلب اسمكم، وتُستخدم لأغراض البحث العلمي فقط، وتُعرض النتائج بشكل مجمّع.

الوقت المتوقع: [عدد] دقائق.
${supervisor ? `المشرفة على الدراسة: ${supervisor}.\n` : ""}للاستفسار: ${email || "[بريد التواصل]"}

بالضغط على «أوافق» فأنتم تؤكدون أنكم قرأتم هذه المعلومات وتوافقون على المشاركة طوعًا.`;
}

export default function SurveyBuilder() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { canWrite, currentUser, team } = useAuth();
  const { project } = useResearchProject();
  const { surveys, loading, saving, update } = useSurveys();
  const { responses, reload, clear } = useSurveyResponses(id);
  const [step, setStep] = useState<Step>("goal");
  const [copied, setCopied] = useState(false);
  const [pop, setPop] = useState("");
  const [margin, setMargin] = useState("5");
  const [loss, setLoss] = useState("10");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiRes, setAiRes] = useState<{ overall: string; items: { id: string; issue: string; better: string; why: string }[]; missing: { question: string; why: string }[] } | null>(null);

  const s = surveys.find((x) => x.id === id);
  const results = useMemo(() => (s ? summarize(s.questions, responses) : []), [s, responses]);
  const alpha = useMemo(() => (s ? likertAlpha(s.questions, responses) : null), [s, responses]);

  if (loading && !s) return <p className="py-10 text-center text-sm text-brand-950/50">جاري التحميل…</p>;
  if (!s)
    return (
      <div className="py-16 text-center">
        <p className="font-bold text-brand-950">ما لقينا هذا الاستبيان</p>
        <Link to="/surveys" className="mt-3 inline-block text-sm font-bold text-brand-600 underline">
          رجوع لقائمة الاستبيانات
        </Link>
      </div>
    );

  const edit = canWrite;
  const locked = !edit || responses.length > 0;
  const setQ = (i: number, q: Question) => update(s.id, { questions: s.questions.map((x, k) => (k === i ? q : x)) });
  const move = (i: number, d: -1 | 1) => {
    const arr = [...s.questions];
    [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
    update(s.id, { questions: arr });
  };
  const add = (type: QType) => update(s.id, { questions: [...s.questions, blankQuestion(type)] });
  const surveyTips = lintSurvey({ title: s.title, goal: s.goal, questions: s.questions, consent_text: s.consentText });

  const link = `${window.location.origin}${window.location.pathname}#/s/${s.publicToken}`;
  const canOpen = s.title.trim() && s.questions.length > 0 && s.consentText.trim() && s.questions.every((q) => q.text.trim());
  const sample = sampleSizeProportion({ population: pop ? Number(pop) : null, margin: Number(margin) / 100 || 0.05, loss: Number(loss) / 100 || 0 });

  const aiOk = hasAiAccess(team) && isSupabaseConfigured;
  const reviewAi = async () => {
    setAiBusy(true);
    setAiMsg(null);
    setAiRes(null);
    const r = await callStudy<{ overall: string; items: { id: string; issue: string; better: string; why: string }[]; missing: { question: string; why: string }[] }>({
      action: "survey",
      goal: s.goal,
      questions: s.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, options: q.options })),
    });
    setAiBusy(false);
    if (r.message || !r.data) setAiMsg(r.message ?? "تعذّرت المراجعة.");
    else setAiRes({ overall: r.data.overall, items: r.data.items ?? [], missing: r.data.missing ?? [] });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // نسخ يدوي
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/surveys" className="rounded-xl border border-brand-100 p-2 text-brand-950/50 hover:bg-surface-muted" title="رجوع">
          <ChevronLeft size={16} className="rotate-180" />
        </Link>
        <input
          disabled={!edit}
          value={s.title}
          onChange={(e) => update(s.id, { title: e.target.value.slice(0, 160) })}
          placeholder="عنوان الاستبيان (مثال: رضا الطالبات عن التدريب الميداني)"
          className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 font-display text-xl font-extrabold text-brand-950 outline-none placeholder:text-brand-950/25 focus:border-brand-200"
        />
        <span className="text-xs font-semibold text-brand-950/40">{saving ? "يحفظ…" : "محفوظ ✓"}</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
            s.status === "open" ? "bg-emerald-100 text-emerald-700" : s.status === "closed" ? "bg-rose-100 text-rose-700" : "bg-surface-muted text-brand-950/60"
          }`}
        >
          {s.status === "open" ? "مفتوح" : s.status === "closed" ? "مغلق" : "مسوّدة"}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {steps.map((st, i) => (
          <button
            key={st.id}
            onClick={() => {
              setStep(st.id);
              if (st.id === "results") reload();
            }}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-bold transition-colors ${
              step === st.id ? "border-brand-500 bg-brand-500/10 text-brand-800" : "border-brand-100 bg-paper text-brand-950/60 hover:bg-surface-muted"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-extrabold">{i + 1}</span>
            {st.label}
          </button>
        ))}
      </div>

      {!edit && <Coach title="وضع القراءة" tone="warn">اشتراك فريقكم غير فعّال حاليًا — تقدرون تشوفون الاستبيان بس ما تقدرون تعدّلونه.</Coach>}

      {step === "goal" && (
        <div className="space-y-4">
          <Coach title={lessons.goal.title}>
            <p>{lessons.goal.body}</p>
            <p className="mt-2 rounded-lg bg-paper px-2.5 py-1.5 text-brand-950/60">مثال: {lessons.goal.example}</p>
          </Coach>
          <Card className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-brand-950">وش تبغون تعرفون؟ (سؤال بحثكم)</span>
              <textarea
                disabled={!edit}
                value={s.goal}
                onChange={(e) => update(s.id, { goal: e.target.value.slice(0, 1200) })}
                rows={3}
                placeholder={project?.title ? `مرتبط ببحثكم: ${project.title}` : "مثال: ما مستوى رضا طالبات التمريض عن التدريب الميداني؟"}
                className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-brand-950">مقدمة قصيرة للمشاركين (اختياري)</span>
              <textarea
                disabled={!edit}
                value={s.intro}
                onChange={(e) => update(s.id, { intro: e.target.value.slice(0, 2000) })}
                rows={2}
                placeholder="جملتين عن الدراسة وكم تاخذ من وقت."
                className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
              />
            </label>
          </Card>
          <Coach title={lessons.validated.title}>
            <p>{lessons.validated.body}</p>
            <Link to="/tools-library" className="mt-1.5 inline-block font-bold text-brand-600 underline">
              شوفوا مكتبة أدوات القياس ←
            </Link>
          </Coach>
          <button onClick={() => setStep("questions")} className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-600">
            التالي: الأسئلة
          </button>
        </div>
      )}

      {step === "questions" && (
        <div className="space-y-4">
          <Card tone="cream" className="space-y-2.5">
            <p className="flex items-center gap-2 text-sm font-extrabold text-brand-950">
              <Lightbulb size={15} className="text-brand-500" />٣ قواعد لسؤال ممتاز
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {lessons.rules.map((r) => (
                <div key={r.n} className="rounded-xl bg-paper px-3 py-2.5">
                  <p className="text-xs font-extrabold text-brand-600">
                    {r.n}. {r.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-950/60">{r.text}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-brand-950/45">
              نراجع صياغة كل سؤال تلقائيًا ونعطيكم ملاحظات. اضغطوا «ليش؟» تحت أي ملاحظة عشان تفهمون السبب — أنواع مثل <Term id="likert">ليكرت</Term> و<Term id="bias">التحيّز</Term> مشروحة بالضغط.
            </p>
          </Card>

          {responses.length > 0 && (
            <Coach title="الأسئلة مقفولة لأن فيه ردود" tone="warn">
              <p>تعديل الأسئلة بعد ما بدأت الردود يخرّب البيانات (كل رد جاء على نسخة مختلفة). لو الردود تجريبية احذفوها من تبويب «النتائج» وعدّلوا بعدها.</p>
            </Coach>
          )}

          {s.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              i={i}
              total={s.questions.length}
              locked={locked}
              onChange={(nq) => setQ(i, nq)}
              onMove={(d) => move(i, d)}
              onDelete={() => update(s.id, { questions: s.questions.filter((_, k) => k !== i) })}
              onDuplicate={() => {
                const arr = [...s.questions];
                arr.splice(i + 1, 0, { ...q, id: blankQuestion("text").id });
                update(s.id, { questions: arr });
              }}
            />
          ))}

          {!locked && (
            <Card className="space-y-3">
              <p className="text-sm font-extrabold text-brand-950">أضيفوا سؤال</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(qTypeMeta) as QType[]).map((t) => (
                  <button key={t} onClick={() => add(t)} className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-paper px-3 py-2 text-xs font-bold text-brand-800 hover:bg-surface-muted">
                    <Plus size={13} />
                    {qTypeMeta[t].label}
                  </button>
                ))}
              </div>
              <p className="pt-1 text-xs font-bold text-brand-950/50">أو ابدؤوا من قالب جاهز:</p>
              <div className="flex flex-wrap gap-2">
                {questionTemplates.map((t) => (
                  <button key={t.id} onClick={() => update(s.id, { questions: [...s.questions, ...t.make()] })} title={t.hint} className="rounded-xl bg-brand-500/10 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-500/20">
                    {t.label}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {isSupabaseConfigured && !hasAiAccess(team) && <AiLockedCard feature="مراجعة أسئلة الاستبيان بالذكاء الاصطناعي" />}
          {aiOk && s.questions.length > 0 && (
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-brand-950">
                    <Sparkles size={15} className="text-amber-accent-500" />
                    مراجعة الذكاء الاصطناعي
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-950/50">يقرأ أسئلتكم مع هدفكم، ويقترح صياغة أوضح ويشرح ليش — أنتم تقررون تاخذونها أو لا.</p>
                </div>
                <button onClick={reviewAi} disabled={aiBusy} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-600 disabled:opacity-60">
                  {aiBusy && <Loader2 size={13} className="animate-spin" />}
                  راجعوا أسئلتي
                </button>
              </div>
              {aiMsg && <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-brand-950/70">{aiMsg}</p>}
              {aiRes && (
                <div className="space-y-2.5">
                  {aiRes.overall && <p className="rounded-xl bg-brand-500/10 px-3 py-2 text-xs leading-relaxed text-brand-950/80">{aiRes.overall}</p>}
                  {aiRes.items.length === 0 && <p className="text-xs font-semibold text-emerald-600">ما لقينا مشاكل واضحة بالصياغة — أحسنتم 👏</p>}
                  {aiRes.items.map((it) => {
                    const idx = s.questions.findIndex((q) => q.id === it.id);
                    return (
                      <div key={it.id} className="rounded-xl border border-brand-100 p-3 text-xs">
                        <p className="font-extrabold text-brand-950">
                          سؤال {idx + 1}: <span className="text-amber-accent-600">{it.issue}</span>
                        </p>
                        <p className="mt-1 leading-relaxed text-brand-950/65">{it.why}</p>
                        {it.better && (
                          <div className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-emerald-600">
                            <p className="leading-relaxed">✓ {it.better}</p>
                            {!locked && (
                              <button onClick={() => idx >= 0 && setQ(idx, { ...s.questions[idx], text: it.better })} className="mt-1.5 font-extrabold underline">
                                استبدلوا سؤالي بهذي الصياغة
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {aiRes.missing.length > 0 && (
                    <div className="rounded-xl border border-dashed border-brand-200 p-3 text-xs">
                      <p className="font-extrabold text-brand-950">أسئلة ممكن تكون ناقصة لهدفكم:</p>
                      <ul className="mt-1.5 space-y-1.5 text-brand-950/70">
                        {aiRes.missing.map((m, k) => (
                          <li key={k}>
                            • {m.question} <span className="text-brand-950/45">— {m.why}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {surveyTips.length > 0 && (
            <Card className="space-y-2">
              <p className="text-sm font-extrabold text-brand-950">ملاحظات على الاستبيان ككل</p>
              {surveyTips.map((t) => (
                <TipRow key={t.title} tip={t} />
              ))}
            </Card>
          )}
          <button onClick={() => setStep("consent")} className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-600">
            التالي: الموافقة
          </button>
        </div>
      )}

      {step === "consent" && (
        <div className="space-y-4">
          <Coach title={lessons.consent.title}>
            <p>{lessons.consent.body}</p>
            <ul className="mt-2 list-disc space-y-0.5 pe-5">
              {lessons.consent.checklist.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-2">
              الصيغة النهائية لازم تراجعها مشرفتكم و<Term id="irb">لجنة الأخلاقيات</Term> بجهتكم.
            </p>
          </Coach>
          <Card className="space-y-3">
            {!s.consentText.trim() && edit && (
              <button
                onClick={() => update(s.id, { consentText: defaultConsent(s.title, project?.supervisorName ?? "", "", currentUser?.email ?? "") })}
                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-600"
              >
                ابدؤوا من صيغة جاهزة تنعبّى ببيانات بحثكم
              </button>
            )}
            <textarea
              disabled={!edit}
              value={s.consentText}
              onChange={(e) => update(s.id, { consentText: e.target.value.slice(0, 6000) })}
              rows={14}
              placeholder="نص الموافقة اللي يشوفه المشارك قبل ما يبدأ…"
              className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-300"
            />
            <p className="text-[11px] text-brand-950/45">عبّوا كل ما بين [أقواس] قبل النشر.</p>
          </Card>
          <button onClick={() => setStep("preview")} className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-600">
            التالي: جرّبوا
          </button>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <Coach title={lessons.pilot.title}>
            <p>{lessons.pilot.body}</p>
          </Coach>
          <Card className="space-y-2">
            <p className="text-sm font-extrabold text-brand-950">قائمة قبل النشر</p>
            {["جرّبتوا الاستبيان بنفسكم من الجوال", "أرسلتوه لـ ٥–١٠ أشخاص يشبهون العينة وعدّلتوا حسب ملاحظاتهم", "راجعته المشرفة", "وافقت لجنة الأخلاقيات (لو مطلوب بجهتكم)"].map((c) => (
              <label key={c} className="flex items-center gap-2.5 text-sm text-brand-950/75">
                <input type="checkbox" className="h-4 w-4 accent-brand-500" />
                {c}
              </label>
            ))}
          </Card>
          <div className="overflow-hidden rounded-3xl bg-[#050b12] p-4 sm:p-6">
            <p className="mb-4 text-center text-[11px] font-bold text-amber-300/80">معاينة — هكذا يشوفه المشارك (ما ينحفظ أي رد)</p>
            <SurveyRunner key={s.questions.length + s.consentText} title={s.title} intro={s.intro} consent={s.consentText} questions={s.questions} preview onSubmit={async () => null} />
          </div>
        </div>
      )}

      {step === "publish" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="text-sm font-extrabold text-brand-950">حالة الاستبيان</p>
            <div className="flex flex-wrap items-center gap-2">
              {s.status !== "open" ? (
                <button
                  disabled={!edit || !canOpen}
                  onClick={() => update(s.id, { status: "open" })}
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  افتحوه للمشاركين
                </button>
              ) : (
                <button disabled={!edit} onClick={() => update(s.id, { status: "closed" })} className="rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-40">
                  أغلقوا الاستبيان
                </button>
              )}
              <label className="flex items-center gap-2 text-xs font-semibold text-brand-950/65">
                <input disabled={!edit} type="checkbox" checked={s.isPilot} onChange={(e) => update(s.id, { isPilot: e.target.checked })} className="accent-brand-500" />
                نسخة تجريبية (<Term id="pilot">استطلاعية</Term>)
              </label>
            </div>
            {!canOpen && <p className="text-xs font-semibold text-amber-accent-700">قبل الفتح: اكتبوا العنوان، وأضيفوا سؤالًا واحدًا على الأقل (كلها بنص)، وجهّزوا نص الموافقة.</p>}
            <div className="rounded-xl bg-surface-muted p-3">
              <p className="mb-1.5 text-[11px] font-bold text-brand-950/50">رابط المشاركة (بدون حساب)</p>
              <p dir="ltr" className="truncate text-start text-xs text-brand-950/70">
                {isSupabaseConfigured ? link : "الروابط الحقيقية تشتغل بحساب على Wesync (مو العرض التجريبي)"}
              </p>
              {isSupabaseConfigured && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={copyLink} className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-paper px-3 py-1.5 text-xs font-bold text-brand-800">
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "تم النسخ" : "نسخ الرابط"}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`تفضلوا بالمشاركة بهذا الاستبيان (مجهول):\n${link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <MessageCircle size={13} />
                    واتساب
                  </a>
                </div>
              )}
              {s.status !== "open" && <p className="mt-2 text-[11px] text-brand-950/45">الرابط ما يشتغل للمشاركين إلا لما تفتحون الاستبيان.</p>}
            </div>
          </Card>

          <Coach title={lessons.sample.title}>
            <p>{lessons.sample.body}</p>
          </Coach>
          <Card className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["حجم المجتمع (اتركوه فاضي لو كبير/مجهول)", pop, setPop, "مثال: 300"],
                ["هامش الخطأ %", margin, setMargin, "5"],
                ["نسبة الاستبيانات الناقصة المتوقعة %", loss, setLoss, "10"],
              ].map(([label, v, set, ph]) => (
                <label key={String(label)} className="block text-[11px] font-bold text-brand-950/55">
                  {label as string}
                  <input inputMode="numeric" value={v as string} onChange={(e) => (set as (x: string) => void)(e.target.value.replace(/[^\d.]/g, ""))} placeholder={ph as string} className="mt-1 w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300" />
                </label>
              ))}
            </div>
            <p className="text-sm font-bold text-brand-950">
              العدد المطلوب تقريبًا: <span className="text-brand-600">{sample.withAttrition}</span> رد
              <button disabled={!edit} onClick={() => update(s.id, { targetN: sample.withAttrition })} className="ms-3 rounded-lg bg-brand-500/10 px-2.5 py-1 text-xs font-extrabold text-brand-700 hover:bg-brand-500/20 disabled:opacity-40">
                خلّوه هدفنا
              </button>
            </p>
            <p className="text-[11px] text-brand-950/45">{sample.formula}. هذا رقم مبدئي — مشرفتكم لها الكلمة النهائية على حجم العينة.</p>
          </Card>
        </div>
      )}

      {step === "results" && (
        <div className="space-y-4">
          <Coach title={lessons.analysis.title}>
            <p>{lessons.analysis.body}</p>
          </Coach>
          {!isSupabaseConfigured ? (
            <Card>
              <p className="text-sm text-brand-950/60">النتائج الحقيقية تظهر بحساب على Wesync (مو العرض التجريبي).</p>
            </Card>
          ) : (
            <>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-brand-950">
                    الردود: <span className="text-brand-600">{responses.length}</span>
                    {s.targetN ? <span className="text-brand-950/45"> / {s.targetN}</span> : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={reload} className="rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-surface-muted">
                      تحديث
                    </button>
                    <button
                      disabled={responses.length === 0}
                      onClick={() => downloadText(`${s.title || "survey"}.csv`, toCsv(s.questions, responses))}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                    >
                      <Download size={13} />
                      تنزيل CSV (إكسل)
                    </button>
                    <button
                      disabled={responses.length === 0}
                      onClick={async () => {
                        await navigator.clipboard.writeText(toTsv(s.questions, responses));
                        nav("/stats");
                      }}
                      className="rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-surface-muted disabled:opacity-40"
                    >
                      انسخوها لاستوديو الإحصاء
                    </button>
                  </div>
                </div>
                {s.targetN ? (
                  <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (responses.length / s.targetN) * 100)}%` }} />
                  </div>
                ) : null}
                {responses.length > 0 && edit && (
                  <button
                    onClick={() => window.confirm("تحذفون كل الردود؟ (مفيد لو كانت تجريبية) — ما ينرجع.") && clear()}
                    className="text-[11px] font-bold text-rose-600 underline"
                  >
                    احذفوا كل الردود (بعد التجربة مثلًا)
                  </button>
                )}
              </Card>

              {alpha && (
                <Card>
                  <p className="text-sm font-extrabold text-brand-950">
                    <Term id="alpha">ألفا كرونباخ</Term> لعبارات ليكرت ({alpha.items} عبارة، {alpha.n} رد مكتمل)
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-brand-600" dir="ltr">
                    α = {alpha.alpha.toFixed(2)}
                  </p>
                  <p className="text-xs font-semibold text-brand-950/60">{alphaLabel(alpha.alpha)}</p>
                  <p className="mt-1 text-[11px] text-brand-950/40">تفترض أن كل عبارات ليكرت تقيس مفهومًا واحدًا. لو عندكم أكثر من مقياس، احسبوا لكل واحد لحاله بالاستوديو.</p>
                </Card>
              )}

              {responses.length === 0 && <p className="py-6 text-center text-sm text-brand-950/50">لسا ما وصلت ردود.</p>}
              {results.map((r, i) => (
                <Card key={r.q.id} className="space-y-2">
                  <p className="text-sm font-bold text-brand-950">
                    {i + 1}. {r.q.text || "—"} <span className="text-[11px] font-medium text-brand-950/40">({r.n} إجابة)</span>
                  </p>
                  {(r.kind === "freq" || r.kind === "likert") &&
                    r.rows.map((row) => (
                      <div key={row.label} className="flex items-center gap-2 text-xs">
                        <span className="w-32 shrink-0 truncate text-brand-950/70">{row.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${row.percent}%` }} />
                        </div>
                        <span dir="ltr" className="w-20 shrink-0 text-end font-semibold text-brand-950/60">
                          {row.count} ({row.percent}%)
                        </span>
                      </div>
                    ))}
                  {(r.kind === "likert" || r.kind === "number") && r.stats && (
                    <p dir="ltr" className="text-start text-xs font-semibold text-brand-950/60">
                      M = {r.stats.mean.toFixed(2)} · SD = {r.stats.sd.toFixed(2)} · n = {r.stats.n}
                    </p>
                  )}
                  {r.kind === "text" && (
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-brand-950/70">
                      {r.latest.map((t, k) => (
                        <li key={k} className="rounded-lg bg-surface-muted px-2.5 py-1.5">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export type { Survey };
