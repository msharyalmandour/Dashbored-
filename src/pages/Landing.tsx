import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  MessageCircleWarning,
  PartyPopper,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Reveal from "../components/Reveal";
import Logo from "../components/Logo";
import overviewShot from "../assets/landing/overview.png";
import tasksShot from "../assets/landing/tasks.png";
import evidenceShot from "../assets/landing/evidence.png";
import celebrationShot from "../assets/landing/celebration.png";

const PRICE_PER_PERSON = 25;
const TEAM_SIZE = 5;

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100 bg-paper shadow-2xl shadow-brand-950/20 transition-transform duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-1.5 border-b border-brand-100 bg-surface-muted px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-accent-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-300" />
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
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <span className="font-display text-lg font-extrabold tracking-tight text-brand-950">
            NURSYNC
          </span>
        </div>
        <Link
          to="/login"
          className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
        >
          تسجيل الدخول
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-[blob-drift_11s_ease-in-out_infinite] rounded-full bg-brand-100/60 blur-3xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute -right-16 top-40 h-56 w-56 animate-[blob-drift_9s_ease-in-out_infinite] rounded-full bg-amber-accent-100/70 blur-3xl motion-reduce:animate-none" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold text-brand-700">
              <Sparkles size={13} />
              مبنية خصيصًا لفرق بحث التخرج التمريضي
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.15] text-brand-950 lg:text-5xl">
              بحث التخرج مو لازم
              <br />
              يكون فوضى واتساب وإكسل
            </h1>
            <p className="mt-5 max-w-lg text-lg text-brand-950/60">
              NURSYNC تنظّم رحلة بحث فريقكم البحثي كامل — من المقترح للتسليم
              النهائي — بمكان واحد يشوفه الجميع.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
              >
                ابدأ فريقك الآن
                <ArrowLeft size={16} />
              </Link>
              <a
                href="#pricing"
                className="rounded-xl px-5 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
              >
                شوفوا السعر
              </a>
            </div>
            <p className="mt-5 text-sm text-brand-950/45">
              ٢٥ ريال شهريًا لكل شخص — يعني {PRICE_PER_PERSON * TEAM_SIZE} ريال بس للفريق كامل
              ({TEAM_SIZE} أعضاء).
            </p>
          </div>
          <div className="lg:pe-4">
            <Reveal>
              <BrowserFrame src={overviewShot} alt="لوحة تحكم NURSYNC" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-extrabold text-brand-950 lg:text-3xl">
            نعرف بالضبط وش اللي تمرون فيه
          </h2>
          <p className="mt-2 text-brand-950/55">لأننا فهمناها من فرق حقيقية زيكم</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {problems.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <div className="rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                  <p.icon size={20} />
                </span>
                <h3 className="mt-4 font-display font-bold text-brand-950">{p.title}</h3>
                <p className="mt-1.5 text-sm text-brand-950/55">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-14 text-center">
          <h2 className="font-display text-2xl font-extrabold text-brand-950 lg:text-3xl">
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
                <BrowserFrame src={f.image} alt={f.title} />
              </Reveal>
              <Reveal delay={150}>
                <div>
                  <h3 className="font-display text-xl font-extrabold text-brand-950 lg:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 max-w-md text-brand-950/60">{f.desc}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <Reveal className="mx-auto max-w-3xl px-6 py-16">
        <section id="pricing" className="rounded-3xl border-2 border-brand-200 bg-paper p-8 text-center shadow-lg shadow-brand-950/10 lg:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-accent-100 px-3.5 py-1.5 text-xs font-bold text-amber-accent-700">
            <Trophy size={13} />
            أول ١٥ فريق يحصلون على سعر المؤسسين — ثابت مدى اشتراككم
          </span>
          <p className="mt-6 flex items-center justify-center gap-2 font-display text-brand-950">
            <span className="text-5xl font-extrabold">{PRICE_PER_PERSON}</span>
            <span className="text-lg font-semibold text-brand-950/60">ريال / شهريًا لكل شخص</span>
          </p>
          <p className="mt-1 text-sm text-brand-950/50">
            يعني {PRICE_PER_PERSON * TEAM_SIZE} ريال شهريًا للفريق كامل ({TEAM_SIZE} أعضاء)
          </p>

          <ul className="mx-auto mt-8 max-w-xs space-y-3 text-start">
            {[
              "وصول كامل لكل أعضاء الفريق",
              "تتبع مراحل البحث والمهام لحظيًا",
              "مكتبة أدلة ومرفقات بلا حدود",
              "دعم مباشر وتحديثات مستمرة",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-brand-950/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Check size={12} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-3 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
          >
            ابدأ فريقك الآن
            <ArrowLeft size={16} />
          </Link>

          <div className="mt-8 border-t border-brand-100 pt-6 text-start text-sm text-brand-950/55">
            <p className="mb-2 font-bold text-brand-950">كيف يتم الدفع؟</p>
            <ol className="space-y-1.5">
              <li>١. حوّلوا المبلغ عبر STC Pay</li>
              <li>٢. أرسلوا لنا إثبات التحويل</li>
              <li>٣. نفعّل اشتراك فريقكم خلال ساعة</li>
            </ol>
          </div>
        </section>
      </Reveal>

      <footer className="border-t border-brand-100/70 py-8 text-center text-sm text-brand-950/40">
        NURSYNC — صُنعت لفرق بحث التخرج التمريضي
      </footer>
    </div>
  );
}
