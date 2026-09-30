import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import overviewImg from "../assets/landing/dash-overview.jpg";
import tasksImg from "../assets/landing/dash-tasks.jpg";
import supervisorImg from "../assets/landing/dash-supervisor.jpg";
import statsImg from "../assets/landing/dash-stats.jpg";
import { AI_PRICE, BASIC_PRICE, FOUNDER_AI_PRICE } from "../lib/plans";

interface Step {
  title: string;
  desc: string;
  chip?: string;
  image?: string;
}

const steps: Step[] = [
  {
    title: "لوحة فريقكم",
    desc: "كل شي بنظرة: التقدم، المتأخر، والخطوة الجاية. وأول ما تفتحون يقول لكم: وش تسوين الحين؟",
    chip: "وش تسوين الحين؟",
    image: overviewImg,
  },
  {
    title: "مهام بدون فوضى",
    desc: "وزّعوا الشغل على الفريق، وكل وحدة تعرف مهمتها ويجيها تنبيه قبل الموعد — مو قروب واتساب ضايع.",
    chip: "تنبيه قبل التسليم",
    image: tasksImg,
  },
  {
    title: "مشرفتكم بالصورة",
    desc: "رابط لها بدون حساب: تشوف تقدمكم وتراسلكم، وملاحظاتها تتحوّل لمهام تخلصونها وحدة وحدة.",
    chip: "رسالة جديدة من المشرفة",
    image: supervisorImg,
  },
  {
    title: "الإحصاء بالعربي",
    desc: "اختاروا الاختبار المناسب لبياناتكم، احسبوه، وخذوا تفسير جاهز لنتائجكم بدون ما تضيعون بالمعادلات.",
    chip: "اختاروا الاختبار الصح",
    image: statsImg,
  },
  {
    title: "اختاروا باقتكم",
    desc: "Basic يدير بحثكم كامل. AI يضيف كوتش ذكي يفكّر معكم ويدرّبكم على المناقشة.",
  },
];

const IMG_COUNT = 4;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const prefersReduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Frame({ src, alt, chip }: { src: string; alt: string; chip?: string }) {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-amber-300/20 bg-neutral-900 shadow-[0_40px_120px_-30px_rgba(251,146,60,0.45),0_20px_60px_-20px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-neutral-800/80 px-3.5 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <img src={src} alt={alt} decoding="async" className="block w-full" draggable={false} />
      </div>
      {chip && (
        <span
          className="absolute -top-3 start-6 rounded-full border border-amber-300/40 bg-neutral-950/85 px-3.5 py-1.5 text-xs font-bold text-amber-200 shadow-lg backdrop-blur-md"
          style={{ transform: "translateZ(70px)" }}
        >
          {chip}
        </span>
      )}
    </div>
  );
}

function PlanCards() {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-3xl border border-white/15 bg-neutral-900/85 p-5 backdrop-blur-xl" style={{ transform: "translateZ(30px)" }}>
        <p className="font-display text-base font-extrabold text-white">Basic</p>
        <p className="mt-1 flex items-baseline gap-1.5 text-white">
          <span className="font-display text-3xl font-extrabold">{BASIC_PRICE}</span>
          <span className="text-[11px] font-semibold text-white/55">ريال / شهريًا لكل عضو</span>
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-white/65">
          {["لوحة الفريق والمهام والتنبيهات", "المقترح والمنهجية والإحصاء", "محادثة المشرفة + تقويم الجوال"].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check size={13} className="mt-0.5 shrink-0 text-white/60" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div
        className="relative rounded-3xl border border-amber-400/50 bg-neutral-900/90 p-5 shadow-[0_0_70px_-20px_rgba(251,191,36,0.6)] backdrop-blur-xl"
        style={{ transform: "translateZ(70px)" }}
      >
        <span className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold text-neutral-950">
          <Sparkles size={10} />
          الأكثر قيمة
        </span>
        <p className="font-display text-base font-extrabold text-amber-200">AI</p>
        <p className="mt-1 flex items-baseline gap-1.5 text-white">
          <span className="font-display text-3xl font-extrabold">{AI_PRICE}</span>
          <span className="text-[11px] font-semibold text-white/55">ريال / شهريًا لكل عضو</span>
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-white/75">
          {["كل مزايا Basic", "كوتش يعرف بحثكم وينصحكم بالأولويات", "وكيل بحث + تدريب مناقشة + تحسين الصياغة"].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-amber-300" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] font-bold text-amber-300">أول ١٥ فريق: {FOUNDER_AI_PRICE} ريال ثابتة</p>
      </div>
    </div>
  );
}

/** قصة التمرير: لوحة التحكم ثلاثية الأبعاد تنقلب طبقة طبقة مع تمرير الصفحة، وكل خطوة جملة وحدة تفهمونها،
    وآخرها الباقات. الحركة تُحسب من موضع التمرير مباشرة (بدون إعادة رسم React كل إطار). */
export default function ScrollDashboard3D() {
  const reduced = useMemo(prefersReduced, []);
  const sectionRef = useRef<HTMLElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const plansRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    let lastStep = -1;

    const apply = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = clamp(-r.top / total, 0, 1);
      const t = clamp(p / 0.93, 0, 1) * (steps.length - 1); // 0..4
      const compact = window.innerWidth < 1024;

      for (let i = 0; i < IMG_COUNT; i++) {
        const el = layerRefs.current[i];
        if (!el) continue;
        const d = i - t;
        let x = 0, y = 0, z = 0, rx = 5, ry = compact ? -6 : -14, rz = 0, sc = 1, op = 1;
        if (d <= 0) {
          // طبقة تغادر: ترتفع للأعلى وتبتعد للخلف وتتلاشى
          const k = clamp(-d, 0, 1);
          y = -k * 60;
          z = -k * 420;
          rx = 5 + k * 28;
          op = 1 - k * 1.25;
        } else {
          // طبقة قادمة: تنتظر خلف الحالية بعمق متدرّج
          const k = d;
          y = k * 5;
          x = k * (compact ? 2 : 6);
          z = -k * 170;
          sc = 1 - Math.min(k, 3) * 0.04;
          op = clamp(1 - k, 0, 1) * 0.9;
        }
        if (i === 0 && t < 0.6) {
          // دخول اللوحة الأولى: تقوم من شبه أفقية
          const k = 1 - t / 0.6;
          rx += k * 38;
          y += k * 14;
          z -= k * 200;
          op *= 1 - k * 0.5;
        }
        el.style.transform = `translate(-50%, -50%) translate3d(${x}%, ${y}%, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`;
        el.style.opacity = String(clamp(op, 0, 1));
        el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      }

      const plans = plansRef.current;
      if (plans) {
        const k = clamp((t - 3.35) / 0.55, 0, 1);
        plans.style.opacity = String(k);
        plans.style.transform = `translate(-50%, -50%) translate3d(0, ${(1 - k) * 18}%, ${-(1 - k) * 260}px) rotateX(${(1 - k) * 30}deg)`;
        plans.style.pointerEvents = k > 0.6 ? "auto" : "none";
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

      const s = Math.round(t);
      if (s !== lastStep) {
        lastStep = s;
        setStep(s);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const goTo = (i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const total = section.offsetHeight - window.innerHeight;
    const p = (i / (steps.length - 1)) * 0.93;
    window.scrollTo({ top: section.offsetTop + p * total + 2, behavior: "smooth" });
  };

  // بدون حركة: قائمة عادية (صورة + نص لكل خطوة)
  if (reduced) {
    return (
      <section id="features" className="relative z-10 mx-auto max-w-5xl scroll-mt-8 space-y-16 px-6 py-16">
        {steps.map((s) =>
          s.image ? (
            <div key={s.title} className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h3 className="font-display text-2xl font-extrabold text-white">{s.title}</h3>
                <p className="mt-3 text-white/60">{s.desc}</p>
              </div>
              <Frame src={s.image} alt={s.title} />
            </div>
          ) : (
            <div key={s.title} className="text-center">
              <h3 className="font-display text-2xl font-extrabold text-white">{s.title}</h3>
              <p className="mx-auto mb-6 mt-3 max-w-md text-white/60">{s.desc}</p>
              <PlanCards />
            </div>
          ),
        )}
      </section>
    );
  }

  const current = steps[step];

  return (
    <section ref={sectionRef} id="features" className="relative z-10 scroll-mt-0" style={{ height: "520vh" }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        {/* توهّج خلفي */}
        <div className="pointer-events-none absolute -start-32 top-1/4 h-96 w-96 rounded-full bg-amber-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute -end-24 bottom-0 h-80 w-80 rounded-full bg-teal-400/10 blur-[110px]" />

        <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] gap-2 px-5 py-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:grid-rows-1 lg:items-center lg:gap-10 lg:py-0">
          {/* النص — يمين بالعربي */}
          <div className="relative z-20 pt-14 lg:pt-0">
            <p dir="ltr" className="text-start text-xs font-bold tracking-[0.2em] text-amber-300/80 rtl:text-right">
              {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
            </p>
            <div key={step} className="cine-rise" style={{ animationDelay: "0s", animationDuration: "0.6s" }}>
              <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">{current.title}</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">{current.desc}</p>
            </div>
            {step === steps.length - 1 && (
              <div className="cine-rise mt-5 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.2s" }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-sm font-extrabold text-neutral-950 shadow-[0_12px_30px_-10px_rgba(251,191,36,0.6)] transition-transform hover:scale-[1.04]"
                >
                  ابدأوا مجانًا ٧ أيام
                  <ArrowLeft size={15} />
                </Link>
                <a href="#pricing" className="text-xs font-bold text-white/60 underline underline-offset-4 hover:text-amber-300">
                  قارنوا كل التفاصيل
                </a>
              </div>
            )}
            {/* مؤشر الخطوات */}
            <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="خطوات الجولة">
              {steps.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => goTo(i)}
                  aria-label={s.title}
                  aria-selected={i === step}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-amber-300" : "w-2.5 bg-white/25 hover:bg-white/45"}`}
                />
              ))}
            </div>
            <p className="mt-5 hidden items-center gap-1.5 text-[11px] font-semibold text-white/35 lg:flex">
              <span className="inline-block h-4 w-2.5 rounded-full border border-white/25 after:mx-auto after:mt-0.5 after:block after:h-1 after:w-1 after:animate-bounce after:rounded-full after:bg-white/50 motion-reduce:after:animate-none" />
              كمّلوا التمرير
            </p>
          </div>

          {/* المشهد ثلاثي الأبعاد */}
          <div className="relative min-h-0" style={{ perspective: "1900px", perspectiveOrigin: "50% 40%" }}>
            <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
              {steps.slice(0, IMG_COUNT).map((s, i) => (
                <div
                  key={s.title}
                  ref={(el) => {
                    layerRefs.current[i] = el;
                  }}
                  className="absolute left-1/2 top-1/2 w-[96%] max-w-[900px] will-change-transform lg:w-[112%]"
                  style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                >
                  <Frame src={s.image!} alt={s.title} chip={s.chip} />
                </div>
              ))}
              <div
                ref={plansRef}
                className="absolute left-1/2 top-1/2 flex w-[96%] max-w-[700px] items-center opacity-0 lg:w-[100%]"
                style={{ transformStyle: "preserve-3d" }}
              >
                <PlanCards />
              </div>
            </div>
          </div>
        </div>

        {/* شريط تقدّم التمرير */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
          <div ref={barRef} className="h-full origin-right bg-gradient-to-l from-amber-300 to-amber-500" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </section>
  );
}
