import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import Logo from "../components/Logo";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { tr, trx } from "../lib/i18n";

const majors = [tr("تمريض"), tr("طب"), tr("صيدلة"), tr("علوم صحية / مختبرات"), tr("هندسة"), tr("حاسب وتقنية"), tr("إدارة أعمال"), tr("تربية وعلم نفس"), tr("علوم"), tr("آداب وعلوم إنسانية"), tr("قانون"), tr("تخصص آخر")];
const stages = [tr("بكالوريوس"), tr("ماجستير"), tr("دكتوراه"), tr("غير ذلك")];
const experience = [tr("أعمل على بحث الآن"), tr("سبق وعملت على بحث"), tr("لم أعمل على بحث بعد")];
const teamSize = [tr("لحالي"), tr("٢–٣"), tr("٤–٥"), tr("أكثر من ٥")];
const coordination = [tr("مجموعة واتساب"), tr("قوقل درايف / وورد مشترك"), tr("إيميل"), tr("ورقيًا / اجتماعات فقط"), tr("تطبيق مهام (Trello / Notion...)"), tr("ما فيه ترتيب واضح")];
const pains = [
  tr("توزيع المهام ومتابعة مين خلّص"),
  tr("ضياع الملفات وتعدد النسخ"),
  tr("متابعة ملاحظات المشرف وتنفيذها"),
  tr("التواصل مع المشرف"),
  tr("الالتزام بالمواعيد"),
  tr("إيجاد دراسات سابقة مناسبة"),
  tr("الصياغة الأكاديمية والكتابة"),
  tr("اختيار التحليل الإحصائي وتفسيره"),
  tr("الموافقات وأدوات القياس وجمع البيانات"),
  tr("التجهيز للمناقشة"),
];
const hours = [tr("أقل من ساعة"), tr("١–٢ ساعة"), tr("٣–٥ ساعات"), tr("أكثر من ٥ ساعات")];
const features = [
  tr("لوحة موحّدة للمهام والتقدم"),
  tr("رابط ومحادثة للمشرف بدون حساب"),
  tr("مساعد ذكي يقترح الأولويات"),
  tr("بحث عن دراسات سابقة"),
  tr("مساعدة في الإحصاء وتفسير النتائج"),
  tr("تنبيهات ومواعيد على الجوال"),
  tr("قوالب الموافقات وقوائم التحقق"),
  tr("التدريب على أسئلة المناقشة"),
];
const prices = [tr("ما أدفع"), tr("أقل من ١٠ ريال"), tr("١٠–٢٠ ريال"), tr("٢٠–٤٠ ريال"), tr("أكثر من ٤٠ ريال")];

type Answers = {
  major: string;
  stage: string;
  experience: string;
  teamSize: string;
  coordination: string[];
  pains: string[];
  hours: string;
  features: string[];
  price: string;
  notes: string;
};

const empty: Answers = { major: "", stage: "", experience: "", teamSize: "", coordination: [], pains: [], hours: "", features: [], price: "", notes: "" };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
        active ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/15 bg-white/[0.04] text-white/65 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Q({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
      <h2 className="flex items-start gap-3 text-base font-extrabold text-white">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs text-amber-300">{n}</span>
        <span>{title}</span>
      </h2>
      {hint && <p className="mt-1 ps-10 text-xs text-white/40">{hint}</p>}
      <div className="mt-4 flex flex-wrap gap-2 ps-0 sm:ps-10">{children}</div>
    </section>
  );
}

/** استبيان عام قصير (بدون تسجيل دخول) — يفهمنا وش يعاني منه الطلبة ببحوثهم بكل التخصصات. */
export default function Survey() {
  const [a, setA] = useState<Answers>(empty);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((p) => ({ ...p, [k]: v }));
  const toggle = (k: "coordination" | "pains" | "features", v: string, max = 99) =>
    setA((p) => {
      const cur = p[k];
      if (cur.includes(v)) return { ...p, [k]: cur.filter((x) => x !== v) };
      if (cur.length >= max) return p;
      return { ...p, [k]: [...cur, v] };
    });

  const ready = a.major && a.stage && a.pains.length > 0;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    if (isSupabaseConfigured) {
      const { error: e } = await supabase!.rpc("submit_survey", {
        p_survey: "pain-points-v1",
        p_answers: a,
        p_email: email.trim() || null,
      });
      if (e) {
        setBusy(false);
        setError(e.message.includes("invalid email") ? tr("صيغة البريد غير صحيحة.") : tr("ما وصلت إجابتكم — حاولوا مرة ثانية بعد شوي."));
        return;
      }
    }
    setBusy(false);
    setDone(true);
  };

  const shell = "relative min-h-screen bg-[#050b12] text-white";
  const bg = <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#08211d] via-[#061318] to-[#03060a]" />;

  if (done) {
    return (
      <div className={`${shell} flex items-center justify-center px-6`}>
        {bg}
        <div className="relative max-w-md text-center">
          <CheckCircle2 size={48} className="mx-auto text-amber-300" />
          <h1 className="mt-5 font-display text-2xl font-extrabold">{tr("شكرًا لكم 🌱")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{tr("إجاباتكم توصل لنا مباشرة وتساعدنا نبني الشي اللي يحتاجه الطلبة فعلًا.")}</p>
          <Link to="/" className="mt-7 inline-block rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-7 py-3 text-sm font-extrabold text-neutral-950">{tr("تعرّفوا على Wesync")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {bg}
      <div className="relative mx-auto max-w-2xl px-5 py-10">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-display text-lg font-extrabold">Wesync</span>
          </Link>
          <span className="text-xs font-semibold text-white/35">{tr("دقيقتين تقريبًا")}</span>
        </header>

        <h1 className="font-display text-3xl font-extrabold leading-snug sm:text-4xl">{tr("وش يتعبكم بـ")}<span className="text-amber-300">{tr("بحث التخرج")}</span>{tr("؟")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">{tr("نبني Wesync عشان يسهّل على فرق البحث في كل التخصصات: تنسيق الفريق، متابعة المشرف، الإحصاء، والمواعيد. إجاباتكم تحدد وش نبني أول. مجهولة، وما نطلب بيانات شخصية.")}</p>

        <div className="mt-8 space-y-4">
          <Q n={1} title={tr("تخصصكم؟")}>
            {majors.map((m) => (
              <Chip key={m} active={a.major === m} onClick={() => set("major", m)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={2} title={tr("مرحلتكم الدراسية؟")}>
            {stages.map((m) => (
              <Chip key={m} active={a.stage === m} onClick={() => set("stage", m)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={3} title={tr("هل عملتم على بحث تخرج أو رسالة؟")}>
            {experience.map((m) => (
              <Chip key={m} active={a.experience === m} onClick={() => set("experience", m)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={4} title={tr("كم عدد فريقكم؟")}>
            {teamSize.map((m) => (
              <Chip key={m} active={a.teamSize === m} onClick={() => set("teamSize", m)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={5} title={tr("كيف تنسّقون شغل البحث؟")} hint={tr("تقدرون تختارون أكثر من خيار")}>
            {coordination.map((m) => (
              <Chip key={m} active={a.coordination.includes(m)} onClick={() => toggle("coordination", m)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={6} title={tr("أكثر شي يتعبكم؟")} hint={tr("اختاروا حتى ٣ (مطلوب)")}>
            {pains.map((m) => (
              <Chip key={m} active={a.pains.includes(m)} onClick={() => toggle("pains", m, 3)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={7} title={tr("كم ساعة بالأسبوع تروح على التنسيق والمتابعة (بدل الشغل العلمي نفسه)؟")}>
            {hours.map((m) => (
              <Chip key={m} active={a.hours === m} onClick={() => set("hours", m)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={8} title={tr("لو فيه منصة تحل هذا، أي ميزات تهمكم أكثر؟")} hint={tr("اختاروا حتى ٣")}>
            {features.map((m) => (
              <Chip key={m} active={a.features.includes(m)} onClick={() => toggle("features", m, 3)}>
                {m}
              </Chip>
            ))}
          </Q>
          <Q n={9} title={tr("كم ممكن تدفعون شهريًا للفرد مقابل منصة كهذي؟")}>
            {prices.map((m) => (
              <Chip key={m} active={a.price === m} onClick={() => set("price", m)}>
                {m}
              </Chip>
            ))}
          </Q>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="flex items-start gap-3 text-base font-extrabold">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs text-amber-300">10</span>{tr("أي اقتراح أو صعوبة ثانية؟ ")}<span className="text-xs font-normal text-white/40">{tr("(اختياري)")}</span>
            </h2>
            <textarea
              value={a.notes}
              onChange={(e) => set("notes", e.target.value.slice(0, 800))}
              rows={3}
              className="mt-3 w-full rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/60"
              placeholder={tr("اكتبوا بحريّة…")}
            />
            <label className="mt-4 block text-xs text-white/50">{tr("تبون نخبركم لما تجهز؟ اتركوا بريدكم ")}<span className="text-white/30">{tr("(اختياري)")}</span>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/60"
              />
            </label>
          </section>
        </div>

        {error && <p className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">{error}</p>}

        <button
          onClick={submit}
          disabled={!ready || busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 py-3.5 text-sm font-extrabold text-neutral-950 shadow-[0_12px_30px_-10px_rgba(251,191,36,0.6)] transition-opacity disabled:opacity-40"
        >{trx("{0}إرسال الإجابات", busy && <Loader2 size={16} className="animate-spin" />)}</button>
        {!ready && <p className="mt-2 text-center text-xs text-white/40">{tr("أجيبوا على التخصص والمرحلة وأكثر ما يتعبكم عشان يتفعّل الإرسال.")}</p>}
      </div>
    </div>
  );
}
