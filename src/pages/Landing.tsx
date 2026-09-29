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
import Reveal from "../components/Reveal";
import RevealRotate from "../components/RevealRotate";
import Logo from "../components/Logo";
import TiltCard from "../components/cinematic/TiltCard";
import CountUp from "../components/cinematic/CountUp";
import CursorGlow from "../components/cinematic/CursorGlow";
import { researchStages } from "../data/mockData";
import overviewShot from "../assets/landing/overview.webp";
import tasksShot from "../assets/landing/tasks.webp";
import evidenceShot from "../assets/landing/evidence.webp";
import celebrationShot from "../assets/landing/celebration.webp";
import heroArt from "../assets/landing/hero.webp";

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
        className="flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_12px_30px_-10px_rgba(251,191,36,0.6)] px-6 py-3 text-sm font-bold text-neutral-950 transition-all duration-300 hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
      >
        ابدأ فريقك الآن
        <ArrowLeft size={16} />
      </Link>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="glass-panel overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
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

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white">
      <Suspense fallback={null}>
        <StarsBackdrop />
      </Suspense>
      <CursorGlow />
      <StickyCTA />
      {/* Hero — لوحة سينمائية بعرض الشاشة (شخص يمشي باتجاه أفق مضيء) بدل
          المشهد ثلاثي الأبعاد: أخف بكثير (~33KB) وأقرب للغة "الزجاج
          الكهرماني". مركز اللوحة يسار الصورة عمدًا، عشان النص العربي
          (اليمين) يقعد على مساحة داكنة ومقروءة */}
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <img
          src={heroArt}
          alt=""
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-[62%] w-full animate-[hero-zoom_22s_ease-out_both] object-cover object-[30%_center] motion-reduce:animate-none md:inset-0 md:h-full"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-black/75 via-black/25 to-transparent" />
        {/* على الجوال اللوحة تقعد بالنص السفلي تحت الكلام، عشان الشخص ما يختفي ورا الأزرار */}
        <div className="absolute inset-x-0 top-[38%] -z-10 h-28 bg-gradient-to-b from-neutral-950 to-transparent md:hidden" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-2.5">
            <Logo size={40} />
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Wesync
            </span>
          </div>
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-xs font-semibold text-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:flex">
            {[
              { href: "#journey", label: "كيف يشتغل" },
              { href: "#features", label: "المزايا" },
              { href: "#faq", label: "الأسئلة" },
              { href: "#pricing", label: "الأسعار" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="rounded-full px-4 py-2 transition-colors hover:bg-white/10 hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <Link
            to="/login"
            className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-2 text-sm font-bold text-white/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md hover:bg-white/10"
          >
            تسجيل الدخول
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-96px)] max-w-6xl flex-col justify-start px-6 pb-28 pt-6 md:justify-center md:pt-0">
          <div className="max-w-xl animate-[hero-in_0.9s_ease-out] [text-shadow:0_4px_28px_rgba(0,0,0,0.6)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md">
              <Sparkles size={13} className="text-amber-300" />
              مبنية خصيصًا لفرق بحث التخرج التمريضي
            </span>
            <h1 className="mt-7 font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-7xl">
              حوّلوا بحثكم
              <br />
              <span className="bg-gradient-to-l from-amber-200 via-amber-400 to-orange-500 bg-clip-text font-bold text-transparent">
                لرؤية واضحة
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/65">
              Wesync تنظّم رحلة بحث فريقكم كامل — من المقترح للتسليم النهائي —
              بمكان واحد هادي يشوفه الجميع.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-bold text-neutral-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_12px_30px_-10px_rgba(251,191,36,0.6)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_14px_40px_-8px_rgba(251,191,36,0.8)]"
              >
                ابدأ فريقك الآن
                <ArrowLeft size={16} />
              </Link>
              <a
                href="#pricing"
                className="rounded-full border border-white/15 bg-white/[0.05] px-6 py-3.5 text-sm font-bold text-white/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md hover:bg-white/10"
              >
                شوفوا السعر
              </a>
            </div>
            <span className="mt-7 inline-flex items-center gap-1.5 text-xs font-semibold text-white/45">
              <Check size={12} className="text-amber-400" />
              {PRICE_PER_PERSON} ريال شهريًا لكل شخص — تجربة مجانية ٧ أيام
            </span>
          </div>

          <div className="absolute inset-x-6 bottom-10 hidden items-end justify-between gap-6 border-t border-white/10 pt-5 md:flex">
            <p className="max-w-xs text-xs leading-relaxed text-white/45">
              من أول فكرة لآخر صفحة — فريقكم يمشي بنفس الاتجاه، وما تضيع خطوة بالطريق.
            </p>
            <a href="#journey" className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/40 hover:text-white/70">
              اكتشفوا الرحلة
              <ChevronDown size={14} className="animate-bounce motion-reduce:animate-none" />
            </a>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-6 lg:pb-24">
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
      <section id="journey" className="relative z-10 mx-auto max-w-6xl scroll-mt-8 px-6 py-16">
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

          <div className="mx-auto mt-8 max-w-md glass-panel rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur-xl transition-all">
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
              <div className="glass-panel h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
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
            <div className="glass-panel rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
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
            <div className="glass-panel rounded-3xl border border-amber-400/25 bg-amber-400/[0.05] p-6 backdrop-blur-xl">
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

      {/* Our story */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-14">
        <Reveal className="glass-panel rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl lg:p-10">
          <h2 className="font-display text-2xl font-extrabold text-white lg:text-3xl">
            ليش Wesync؟
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/60">
            عشنا فوضى بحث التخرج زي أي فريق تمريض — رسائل واتساب ضايعة، مستندات
            متكررة بين أعضاء الفريق، ومواعيد تسليم تفوتنا بدون سبب وجيه. بنينا
            Wesync عشان يصير لفريقكم مكان واحد يجمع بحثكم كامل — بدون فوضى،
            وبدون ما تحسّون إنكم لحالكم فيه.
          </p>
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl scroll-mt-8 px-6 py-14">
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
      <section id="faq" className="relative z-10 mx-auto max-w-2xl scroll-mt-8 px-6 py-16">
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
        <section id="pricing" className="glass-panel rounded-[2rem] border border-amber-400/30 bg-white/[0.04] p-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_0_80px_-30px_rgba(251,191,36,0.45)] backdrop-blur-2xl lg:p-12">
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
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_12px_30px_-10px_rgba(251,191,36,0.6)] px-8 py-3 text-sm font-bold text-neutral-950 transition-all duration-300 hover:scale-[1.03] hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
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
