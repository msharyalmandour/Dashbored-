import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronDown,
  Copy,
  MessageCircle,
  MessageCircleWarning,
  Milestone,
  PartyPopper,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";
import Reveal from "../components/Reveal";
import RevealRotate from "../components/RevealRotate";
import Logo from "../components/Logo";
import TiltCard from "../components/cinematic/TiltCard";
import CountUp from "../components/cinematic/CountUp";
import CursorGlow from "../components/cinematic/CursorGlow";
import { researchStages } from "../data/mockData";
import overviewShot from "../assets/landing/overview.png";
import tasksShot from "../assets/landing/tasks.png";
import evidenceShot from "../assets/landing/evidence.png";
import celebrationShot from "../assets/landing/celebration.png";

const Scene3D = lazy(() => import("../components/cinematic/Scene3D"));
const StarsBackdrop = lazy(() =>
  import("../components/cinematic/Scene3D").then((m) => ({ default: m.StarsBackdrop })),
);

const PRICE_PER_PERSON = 40;
const TEAM_SIZE = 5;

const stageBlurbs: Record<string, string> = {
  proposal: "تحددون فكرة بحثكم ومشكلته من البداية",
  "lit-review": "تجمعون وتحللون الدراسات السابقة المرتبطة",
  gap: "تكتشفون وش الناقص بالدراسات الموجودة",
  aim: "تصيغون هدف بحثكم وأسئلته بدقة",
  methodology: "تحددون طريقة جمع وتحليل بياناتكم",
  "data-collection": "تنفذون الجمع الفعلي للبيانات بالميدان",
  analysis: "تحللون النتائج وتستخرجون الدلالات",
  final: "تجمعون كل شي بتقرير نهائي جاهز للتسليم",
};

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-400/10 bg-neutral-900 shadow-2xl shadow-black/40 transition-transform duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-1.5 border-b border-amber-400/10 bg-neutral-800/70 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  );
}

function GoldDivider() {
  return (
    <div className="mx-auto h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-amber-400/25 to-transparent" />
  );
}

/** بديل خفيف يبين وقت تحميل مشهد الـ3D الثقيل (~950 كيلوبايت) — عشان ما تبين
    منطقة الهيرو فاضية لحظة أو لحظتين عند اتصال بطيء */
function ScenePlaceholder() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
      <div className="h-40 w-40 animate-pulse rounded-full bg-amber-400/10 blur-3xl" />
    </div>
  );
}

/** زر عائم يظهر بعد ما تنزلين تحت الهيرو، ويختفي قرب الفوتر عشان ما يتعارض
    مع زر الاشتراك بكرت الأسعار */
function ShareSiteRow() {
  const [copied, setCopied] = useState(false);
  const siteUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const waMessage = `جربوا Wesync — منصة تنظّم بحث التخرج كامل بمكان واحد بدل قروبات الواتساب المشتتة 🎓\n${siteUrl}`;

  const copy = async () => {
    await navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/50 transition hover:border-[#25D366]/40 hover:text-[#25D366]"
      >
        <MessageCircle size={13} /> شاركي الموقع
      </a>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/50 transition hover:border-amber-400/40 hover:text-amber-300"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "تم النسخ" : "نسخ الرابط"}
      </button>
    </div>
  );
}

function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      const pastHero = window.scrollY > 700;
      const nearBottom =
        window.scrollY + window.innerHeight > document.body.scrollHeight - 500;
      setShow(pastHero && !nearBottom);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <Link
        to="/login"
        className="flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-black/40 transition-all duration-300 hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
      >
        ابدأ فريقك الآن
        <ArrowLeft size={16} />
      </Link>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-400/10 bg-neutral-900">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
      >
        <span className="font-display font-bold text-white">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-amber-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-white/55">{a}</p>
        </div>
      </div>
    </div>
  );
}

const problems = [
  {
    icon: MessageCircleWarning,
    title: "٥ محادثات واتساب متفرقة",
    desc: "مين سوّى وش؟ الملف الأخير وين؟ كل شي ضايع بين الرسائل.",
  },
  {
    icon: Users,
    title: "ما أحد متابع الكل",
    desc: "قائد الفريق يسأل \"وصلتوا لوين؟\" وكل عضو يجاوب بشكل مختلف.",
  },
  {
    icon: PartyPopper,
    title: "قرب التسليم = فزعة",
    desc: "آخر أسبوع الكل يكتشف إن فيه أقسام ناقصة محد سوّاها.",
  },
];

const beforeAfter = {
  before: [
    "محادثات واتساب متفرقة وملفات ضايعة بين الأجهزة",
    "محد يعرف بالضبط وين وصل الفريق",
    "قرب التسليم = فوضى واكتشاف أقسام ناقصة",
  ],
  after: [
    "كل شي بمكان واحد، منظم وواضح لكل الفريق",
    "تقدم كل مرحلة يبين لحظيًا للجميع",
    "تسليم مرتب من بداية البحث، بدون مفاجآت اللحظة الأخيرة",
  ],
};

const faqs = [
  {
    q: "شنو لو ما نعرف نستخدم برامج تقنية؟",
    a: "التطبيق بسيط وبالعربي بالكامل، ودليل الطالب داخل التطبيق يمشي وياكم خطوة بخطوة من أول يوم.",
  },
  {
    q: "لو حبينا نوقف الاشتراك بعد شهر أو شهرين؟",
    a: "تقدرون توقفون في أي وقت تبونه، ما فيه أي التزام طويل أو شروط جزائية.",
  },
  {
    q: "هل بيانات وملفات فريقنا آمنة؟",
    a: "بياناتكم خاصة بفريقكم فقط، ومحمية بنظام صلاحيات — كل عضو يشوف اللي يخصه حسب دوره في الفريق.",
  },
  {
    q: "ينفع نستخدمه لو فريقنا أكبر أو أصغر من ٥ أعضاء؟",
    a: `أكيد، السعر ${PRICE_PER_PERSON} ريال لكل شخص، فتقدرون تضيفون أو تحذفون أعضاء ويتغيّر السعر تلقائيًا حسب عدد فريقكم.`,
  },
  {
    q: "لو واجهنا مشكلة أو سؤال، كيف الدعم؟",
    a: "تراسلوننا مباشرة من داخل التطبيق أو عبر التواصل المتاح، ونرد عليكم خلال نفس اليوم غالبًا.",
  },
];

const features: { image: string; title: string; desc: string; reverse?: boolean }[] = [
  {
    image: overviewShot,
    title: "رحلة بحث واضحة من أول يوم للتسليم",
    desc: "٨ مراحل بحثية واضحة، تعرفون وين وصلتوا بالضبط ووش الخطوة الجاية — بدون ما تسألون حد.",
  },
  {
    image: tasksShot,
    title: "مهام موزعة، واضح مين مسؤول عن وش",
    desc: "كل عضو يشوف مهامه بالضبط، بأولويتها وتاريخ استحقاقها — وقائد الفريق يسند ويتابع بضغطة.",
    reverse: true,
  },
  {
    image: evidenceShot,
    title: "مكتبة أدلة منظمة، مو ملفات مبعثرة",
    desc: "كل دراسة تجمعونها مصنّفة حسب موضوعها وحالة مراجعتها — تلقونها بثوانٍ وقت الكتابة.",
  },
  {
    image: celebrationShot,
    title: "لحظات نفتخر فيها فعلاً",
    desc: "من أول رسالة تكتبونها لنفسكم، للاحتفال الحقيقي يوم تسلّمون البحث النهائي.",
    reverse: true,
  },
];

export default function Landing() {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const activeStage = researchStages.find((s) => s.id === hoveredStage) ?? researchStages[1];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // نخفف كثافة موجات وجزيئات المشهد ثلاثي الأبعاد على الشاشات الصغيرة
  // (أداء أفضل، وموجات أقل ازدحامًا حوالين النص على الجوال)
  const [heroDensity, setHeroDensity] = useState<"full" | "light">("full");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setHeroDensity(mq.matches ? "light" : "full");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white">
      <Suspense fallback={null}>
        <StarsBackdrop />
      </Suspense>
      <CursorGlow />
      <StickyCTA />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <span className="font-display text-lg font-extrabold tracking-tight text-white">
            Wesync
          </span>
        </div>
        <Link
          to="/login"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white/90 hover:bg-white/5"
        >
          تسجيل الدخول
        </Link>
      </header>

      {/* Hero — ارتفاع محدود بمقاس الشاشة عشان المشهد ثلاثي الأبعاد يتناسب
          دايمًا مع حجم معقول، ما يكبر بشكل عشوائي حسب طول المحتوى تحته */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden lg:min-h-[820px]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-[blob-drift_11s_ease-in-out_infinite] rounded-full bg-amber-500/10 blur-3xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute -right-16 top-40 h-56 w-56 animate-[blob-drift_9s_ease-in-out_infinite] rounded-full bg-rose-500/10 blur-3xl motion-reduce:animate-none" />
        <ErrorBoundary fallback={<ScenePlaceholder />}>
          <Suspense fallback={<ScenePlaceholder />}>
            <Scene3D density={heroDensity} waveRings centerpieceScale={0.25} centerpieceY={1} />
          </Suspense>
        </ErrorBoundary>
        {/* تعتيم خفيف خلف النص عشان يفضل واضح ومقروء فوق توهج الشكل ثلاثي
            الأبعاد، مهما كانت شدة الإضاءة خلفه */}
        <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_60%_55%_at_50%_42%,rgba(10,10,10,0.55),transparent_70%)]" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
          <div className="animate-[hero-in_0.9s_ease-out] [text-shadow:0_4px_28px_rgba(3,6,10,0.85)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white/80 backdrop-blur">
              <Sparkles size={13} />
              مبنية خصيصًا لفرق بحث التخرج التمريضي
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-white lg:text-6xl">
              حوّلوا بحثكم
              <br />
              <span className="bg-gradient-to-l from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                لرؤية واضحة
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">
              Wesync تنظّم رحلة بحث فريقكم البحثي كامل — من المقترح للتسليم
              النهائي — بمكان واحد يشوفه الجميع.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-neutral-950 shadow-sm shadow-amber-400/20 transition-all duration-300 hover:scale-[1.03] hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
              >
                ابدأ فريقك الآن
                <ArrowLeft size={16} />
              </Link>
              <a
                href="#pricing"
                className="rounded-xl px-5 py-3 text-sm font-bold text-white/75 hover:bg-white/5"
              >
                شوفوا السعر
              </a>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/5 px-3.5 py-1.5 text-xs font-semibold text-white/50 backdrop-blur">
              <Check size={12} className="text-amber-400" />
              {PRICE_PER_PERSON} ريال شهريًا لكل شخص — {PRICE_PER_PERSON * TEAM_SIZE} ريال للفريق كامل ({TEAM_SIZE} أعضاء)
            </span>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-4xl px-6 pb-16 lg:-mt-16 lg:pb-24">
        <TiltCard maxTilt={3}>
          <RevealRotate direction="left">
            <BrowserFrame src={overviewShot} alt="لوحة تحكم Wesync" />
          </RevealRotate>
        </TiltCard>
      </section>

      {/* Facts strip */}
      <GoldDivider />
      <Reveal className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
          {[
            { icon: Milestone, value: 8, label: "مراحل بحثية واضحة" },
            { icon: Users, value: TEAM_SIZE, label: "أعضاء بكل فريق" },
            { icon: Trophy, value: 15, label: "مقعد بسعر المؤسسين" },
            { icon: BookOpenCheck, value: PRICE_PER_PERSON, label: "ريال شهريًا لكل شخص" },
          ].map((f) => (
            <div key={f.label} className="text-center">
              <f.icon size={18} className="mx-auto text-amber-300/80" />
              <p className="mt-2 font-display text-3xl font-extrabold text-white">
                <CountUp value={f.value} />
              </p>
              <p className="mt-1 text-xs text-white/45">{f.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Research journey constellation */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-2xl font-extrabold text-white lg:text-3xl">
            رحلتكم البحثية، متصلة
          </h2>
          <p className="mt-2 text-white/50">٨ مراحل واضحة من أول فكرة للتسليم النهائي</p>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex items-start justify-between overflow-x-auto pb-2">
            {researchStages.map((stage, i) => (
              <div key={stage.id} className="flex flex-1 items-center">
                <button
                  onMouseEnter={() => setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                  className="flex min-w-[80px] flex-col items-center gap-2.5 text-center"
                >
                  <span
                    className={`flex h-3 w-3 rounded-full border-2 transition-all ${
                      hoveredStage === stage.id
                        ? "scale-125 border-amber-400 bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.5)]"
                        : "border-white/25 bg-neutral-950"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-semibold transition-colors ${
                      hoveredStage === stage.id ? "text-amber-300" : "text-white/50"
                    }`}
                  >
                    {stage.titleAr}
                  </span>
                </button>
                {i < researchStages.length - 1 && (
                  <div className="mt-[6px] h-px flex-1 bg-white/10" />
                )}
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-400/10 bg-neutral-900/80 p-5 text-center backdrop-blur transition-all">
            <p className="font-display font-bold text-amber-300">{activeStage.titleAr}</p>
            <p className="mt-1.5 text-sm text-white/55">{stageBlurbs[activeStage.id]}</p>
          </div>
        </Reveal>
      </section>

      {/* Problem */}
      <GoldDivider />
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-extrabold text-white lg:text-3xl">
            نعرف بالضبط وش اللي تمرون فيه
          </h2>
          <p className="mt-2 text-white/50">لأننا فهمناها من فرق حقيقية زيكم</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {problems.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <div className="rounded-3xl border border-amber-400/10 bg-neutral-900 p-6 shadow-sm shadow-black/20">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
                  <p.icon size={20} />
                </span>
                <h3 className="mt-4 font-display font-bold text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm text-white/50">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Before / after */}
        <Reveal delay={200} className="mt-14">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
              <p className="mb-4 text-sm font-bold text-white/40">قبل Wesync</p>
              <ul className="space-y-3">
                {beforeAfter.before.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/50">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-400/10 text-rose-300">
                      <X size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-amber-400/25 bg-neutral-900 p-6">
              <p className="mb-4 text-sm font-bold text-amber-300">بعد Wesync</p>
              <ul className="space-y-3">
                {beforeAfter.after.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/75">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <div className="mb-14 text-center">
          <h2 className="font-display text-2xl font-extrabold text-white lg:text-3xl">
            كل شي يحتاجه فريقكم، بمكان واحد
          </h2>
        </div>
        <div className="space-y-20">
          {features.map((f) => (
            <div
              key={f.title}
              className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${
                f.reverse ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <RevealRotate direction={f.reverse ? "right" : "left"}>
                <TiltCard maxTilt={3}>
                  <BrowserFrame src={f.image} alt={f.title} />
                </TiltCard>
              </RevealRotate>
              <Reveal delay={150}>
                <div>
                  <h3 className="font-display text-xl font-extrabold text-white lg:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 max-w-md text-white/55">{f.desc}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <GoldDivider />
      <section className="relative z-10 mx-auto max-w-2xl px-6 py-16">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-2xl font-extrabold text-white lg:text-3xl">
            أسئلة يسألونها كل الفرق
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <FaqItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </Reveal>
      </section>

      {/* Pricing */}
      <Reveal className="mx-auto max-w-3xl px-6 py-16">
        <section id="pricing" className="rounded-3xl border-2 border-amber-400/25 bg-neutral-900 p-8 text-center shadow-lg shadow-black/30 lg:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3.5 py-1.5 text-xs font-bold text-amber-300">
            <Trophy size={13} />
            أول ١٥ فريق يحصلون على سعر المؤسسين — ثابت مدى اشتراككم
          </span>
          <p className="mt-6 flex items-center justify-center gap-2 font-display text-white">
            <span className="text-5xl font-extrabold">{PRICE_PER_PERSON}</span>
            <span className="text-lg font-semibold text-white/55">ريال / شهريًا لكل شخص</span>
          </p>
          <p className="mt-1 text-sm text-white/40">
            يعني {PRICE_PER_PERSON * TEAM_SIZE} ريال شهريًا للفريق كامل ({TEAM_SIZE} أعضاء)
          </p>

          <ul className="mx-auto mt-8 max-w-xs space-y-3 text-start">
            {[
              "وصول كامل لكل أعضاء الفريق",
              "تتبع مراحل البحث والمهام لحظيًا",
              "مكتبة أدلة ومرفقات بلا حدود",
              "دعم مباشر وتحديثات مستمرة",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                  <Check size={12} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-8 py-3 text-sm font-bold text-neutral-950 shadow-sm shadow-amber-400/20 transition-all duration-300 hover:scale-[1.03] hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
          >
            ابدأ فريقك الآن — تجربة مجانية ٧ أيام
            <ArrowLeft size={16} />
          </Link>
          <Link
            to="/login"
            className="mt-3 block text-center text-xs font-semibold text-white/40 hover:text-amber-300 hover:underline"
          >
            متأكدين؟ فعّلوا الاشتراك مباشرة بدون تجربة
          </Link>

          <div className="mt-8 border-t border-amber-400/15 pt-6 text-start text-sm text-white/50">
            <p className="mb-3 font-bold text-white">كيف يتم الدفع؟</p>
            <ol className="space-y-2.5">
              {["ادفعوا فورًا بالبطاقة (تفعيل لحظي)", "أو حوّلوا عبر STC Pay وأرسلوا لنا إثبات التحويل", "نفعّل اشتراك فريقكم خلال ساعة كحد أقصى"].map(
                (step, i) => (
                  <li key={step} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[11px] font-bold text-amber-300">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ),
              )}
            </ol>
          </div>
        </section>
      </Reveal>

      <footer className="relative z-10 border-t border-amber-400/10 py-10 text-center">
        <p className="font-display text-sm font-semibold tracking-wide text-white/60">Wesync</p>
        <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-white/30">
          صُنعت لفرق بحث التخرج التمريضي
        </p>
        <ShareSiteRow />
      </footer>
    </div>
  );
}
