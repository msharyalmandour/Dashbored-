import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  MessageCircleWarning,
  Milestone,
  PartyPopper,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Reveal from "../components/Reveal";
import Logo from "../components/Logo";
import TiltCard from "../components/cinematic/TiltCard";
import CountUp from "../components/cinematic/CountUp";
import { useMouseParallax } from "../hooks/useMouseParallax";
import { researchStages } from "../data/mockData";
import overviewShot from "../assets/landing/overview.png";
import tasksShot from "../assets/landing/tasks.png";
import evidenceShot from "../assets/landing/evidence.png";
import celebrationShot from "../assets/landing/celebration.png";

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

function FloatingCard({
  className,
  duration,
  tilt,
  depth,
  parallax,
  children,
}: {
  className: string;
  duration: number;
  tilt: string;
  depth: number;
  parallax: { x: number; y: number };
  children: React.ReactNode;
}) {
  return (
    <div
      className={`pointer-events-none absolute motion-reduce:animate-none ${className}`}
      style={
        {
          animation: `card-float ${duration}s ease-in-out infinite`,
          "--tilt": tilt,
        } as CSSProperties
      }
    >
      <div
        style={{
          transform: `translate3d(${parallax.x * depth}px, ${parallax.y * depth}px, 0)`,
          transition: "transform 120ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/40 transition-transform duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-neutral-800/70 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
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
  const { ref: heroRef, offset } = useMouseParallax(16);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const activeStage = researchStages.find((s) => s.id === hoveredStage) ?? researchStages[1];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <span className="font-display text-lg font-extrabold tracking-tight text-white">
            NURSYNC
          </span>
        </div>
        <Link
          to="/login"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white/90 hover:bg-white/5"
        >
          تسجيل الدخول
        </Link>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-[blob-drift_11s_ease-in-out_infinite] rounded-full bg-amber-500/10 blur-3xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute -right-16 top-40 h-56 w-56 animate-[blob-drift_9s_ease-in-out_infinite] rounded-full bg-rose-500/10 blur-3xl motion-reduce:animate-none" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white/80">
              <Sparkles size={13} />
              مبنية خصيصًا لفرق بحث التخرج التمريضي
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.15] text-white lg:text-5xl">
              حوّلوا بحثكم
              <br />
              لرؤية واضحة
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/55">
              NURSYNC تنظّم رحلة بحث فريقكم البحثي كامل — من المقترح للتسليم
              النهائي — بمكان واحد يشوفه الجميع.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-neutral-950 shadow-sm shadow-amber-400/20 hover:bg-amber-300"
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
            <p className="mt-5 text-sm text-white/35">
              ٤٠ ريال شهريًا لكل شخص — يعني {PRICE_PER_PERSON * TEAM_SIZE} ريال بس للفريق كامل
              ({TEAM_SIZE} أعضاء).
            </p>
          </div>

          <div className="relative lg:pe-4">
            <TiltCard maxTilt={4} className="relative z-10">
              <Reveal>
                <BrowserFrame src={overviewShot} alt="لوحة تحكم NURSYNC" />
              </Reveal>
            </TiltCard>

            <FloatingCard
              className="-top-8 start-2 z-20 hidden sm:block"
              duration={7}
              tilt="-6deg"
              depth={0.7}
              parallax={offset}
            >
              <div className="w-40 rounded-2xl border border-white/10 bg-neutral-900/90 p-3 shadow-2xl shadow-black/40 backdrop-blur">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Check size={12} />
                  <span className="text-[11px] font-bold">مراجعة الأدبيات</span>
                </div>
                <p className="mt-1 text-[10px] text-white/45">مكتملة — ١٨ دراسة</p>
              </div>
            </FloatingCard>

            <FloatingCard
              className="-bottom-6 -start-6 z-20 hidden sm:block"
              duration={8.5}
              tilt="4deg"
              depth={0.9}
              parallax={offset}
            >
              <div className="flex w-36 items-center gap-2.5 rounded-2xl border border-white/10 bg-neutral-900/90 p-3 shadow-2xl shadow-black/40 backdrop-blur">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 text-[11px] font-extrabold text-amber-300">
                  ٤٢٪
                </span>
                <span className="text-[10px] font-semibold text-white/60">نسبة تقدم البحث</span>
              </div>
            </FloatingCard>

            <FloatingCard
              className="-end-8 top-1/3 z-20 hidden lg:block"
              duration={6.5}
              tilt="-3deg"
              depth={0.5}
              parallax={offset}
            >
              <span className="flex h-3 w-3 animate-[node-pulse_2.4s_ease-in-out_infinite] rounded-full bg-amber-400 motion-reduce:animate-none" />
            </FloatingCard>
          </div>
        </div>
      </section>

      {/* Facts strip */}
      <Reveal className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-4 border-t border-white/10 py-8 sm:grid-cols-4">
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
      <section className="mx-auto max-w-6xl px-6 py-16">
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

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 bg-neutral-900/80 p-5 text-center backdrop-blur transition-all">
            <p className="font-display font-bold text-amber-300">{activeStage.titleAr}</p>
            <p className="mt-1.5 text-sm text-white/55">{stageBlurbs[activeStage.id]}</p>
          </div>
        </Reveal>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-extrabold text-white lg:text-3xl">
            نعرف بالضبط وش اللي تمرون فيه
          </h2>
          <p className="mt-2 text-white/50">لأننا فهمناها من فرق حقيقية زيكم</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {problems.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 shadow-sm shadow-black/20">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
                  <p.icon size={20} />
                </span>
                <h3 className="mt-4 font-display font-bold text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm text-white/50">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-14">
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
              <Reveal>
                <TiltCard maxTilt={3}>
                  <BrowserFrame src={f.image} alt={f.title} />
                </TiltCard>
              </Reveal>
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
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-8 py-3 text-sm font-bold text-neutral-950 shadow-sm shadow-amber-400/20 hover:bg-amber-300"
          >
            ابدأ فريقك الآن
            <ArrowLeft size={16} />
          </Link>

          <div className="mt-8 border-t border-white/10 pt-6 text-start text-sm text-white/50">
            <p className="mb-2 font-bold text-white">كيف يتم الدفع؟</p>
            <ol className="space-y-1.5">
              <li>١. حوّلوا المبلغ عبر STC Pay</li>
              <li>٢. أرسلوا لنا إثبات التحويل</li>
              <li>٣. نفعّل اشتراك فريقكم خلال ساعة</li>
            </ol>
          </div>
        </section>
      </Reveal>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/35">
        NURSYNC — صُنعت لفرق بحث التخرج التمريضي
      </footer>
    </div>
  );
}
