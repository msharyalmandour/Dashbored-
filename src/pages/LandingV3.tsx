import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import Wesy from "../components/brand/Wesy";
import type { WesyState } from "../vendor/wesy-real";
import WLogo from "../components/brand/WLogo";
import LangToggle from "../components/ui/LangToggle";
import { SUPPORT_WHATSAPP } from "../lib/legal";
import { BEST_PLAN, PLAN_OPTIONS, TRIAL_DAYS, perMonth, planOf, planSaving, type BillingPeriod } from "../lib/plans";
import { tr } from "../lib/i18n";
import shotOverview from "../assets/landing/overview.webp";
import shotTasks from "../assets/landing/tasks.webp";
import shotEvidence from "../assets/landing/evidence.webp";
import shotSupervisor from "../assets/landing/dash-supervisor.jpg";
import shotStats from "../assets/landing/dash-stats.jpg";
import shotDashTasks from "../assets/landing/dash-tasks.jpg";
import shotCelebrate from "../assets/landing/celebration.webp";

/* صفحة الهبوط v3 «فخامة كلاسيكية» — رابط تجربة (#/welcome) لين يوافق المالك، والقديمة باقية على «/».
   قرارات المالك (20 سؤال، 2026-11-19): أسود Obsidian + قسم كريمي واحد · ويسي بالهيرو + قسم خاص · «فريقٌ صغير، بحثٌ كبير»
   · المنحنى = لقطات من المنصة · الوجوه = الفريق الأربعة + الدكتورة + ويسي (صور توضيحية مولّدة، مو عملاء) · حركة سينمائية
   · قسم للدكاترة · زر واحد «ابدأوا فريقكم مجانًا» · بدون إثبات اجتماعي حاليًا · عربي + EN · تسويق ودّي · خطوط ذهبية وأرقام أقسام.
   الحركة كلها مربوطة بالسكرول (ما فيه حركة لا نهائية)، و«قلّل الحركة» يعرض كل شي ثابت بمكانه النهائي. */

const SIGNUP = "/login?signup=1";

const reduced = () =>
  typeof window !== "undefined" &&
  (document.documentElement.dataset.reduceMotion === "true" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** تقدّم السكرول داخل قسم (0 أول ما يلصق، 1 آخر ما يفك) */
function useSectionProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(() => (reduced() ? 1 : 0));
  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const calc = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(total > 0 ? clamp01(-r.top / total) : 0);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    calc();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return [ref, p] as const;
}

/** يظهر بنعومة أول ما يدخل الشاشة (مرة وحدة) */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(() => reduced());
  useEffect(() => {
    if (on || !ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [on]);
  return [ref, on] as const;
}

function Kicker({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="l3-kicker">
      <span className="l3-num">{n}</span>
      <span className="l3-rule" aria-hidden />
      {children}
    </p>
  );
}

function Cta({ className = "" }: { className?: string }) {
  return (
    <div className={`l3-cta-wrap ${className}`}>
      <Link to={SIGNUP} className="l3-cta">
        {tr("ابدأوا فريقكم مجانًا")}
        <ArrowLeft size={18} aria-hidden />
      </Link>
      <span className="l3-cta-note">{tr("{0} يوم مجانًا · بدون بطاقة · الدكتورة مجانًا دايمًا", TRIAL_DAYS)}</span>
    </div>
  );
}

/* ── 01 + 02: المشهد السينمائي — الهيرو الأسود يتحول لقسم كريمي، والكلمات تكبر، والوجوه تنتثر ── */
const FACES = [
  { src: "/landing/v3/face-1.webp", x: -36, y: -22, r: -8, d: 0 },
  { src: "/landing/v3/face-3.webp", x: -30, y: 20, r: 5, d: 0.06 },
  { src: "/landing/v3/face-5.webp", x: 34, y: -22, r: 7, d: 0.1 },
  { src: "/landing/v3/face-2.webp", x: 27, y: 22, r: -4, d: 0.14 },
  { src: "/landing/v3/face-4.webp", x: 42, y: 2, r: -9, d: 0.18 },
];

/** مقاس رأس ويسي = عرض بطاقته (نفس clamp حق .l3-face) — قبل كان 170 ثابت وينقص نص الوجه بالشاشات الأصغر */
const wesyTile = () => (window.innerWidth <= 760 ? 104 : Math.round(Math.min(186, Math.max(92, window.innerWidth * 0.115))));
function useWesyTile() {
  const [size, setSize] = useState(wesyTile);
  useEffect(() => {
    const on = () => setSize(wesyTile());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

function Stage() {
  const [ref, prog] = useSectionProgress<HTMLElement>();
  const tile = useWesyTile();
  // «قلّل الحركة»: الهيرو والقسم الكريمي تحت بعض، ثابتين بمكانهم النهائي
  const still = reduced();
  const p = still ? 0 : prog;
  // 0.08→0.26 الهيرو يطلع · 0.26→0.46 دائرة الكريمي تنفتح والكلمات تكبر · 0.42→0.9 الوجوه تنتثر
  // الهيرو يطلع كامل قبل ما تبدأ دائرة الكريمي — ما يتداخلون أبدًا
  const out = still ? 0 : clamp01((p - 0.08) / 0.18);
  const cream = still ? 1 : clamp01((p - 0.26) / 0.2);
  const faces = (i: number) => (still ? 1 : clamp01((p - 0.42 - FACES[i].d) / 0.3));
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  return (
    <section ref={ref} className={still ? "l3-stage still" : "l3-stage"} aria-label={tr("فريقٌ صغير، بحثٌ كبير")}>
      <div className="l3-stage-pin" style={{ ["--cr" as string]: still ? 1 : cream }}>
        {/* الهيرو */}
        <div className="l3-hero" style={{ opacity: 1 - out, transform: `translateY(${-out * 60}px) scale(${1 - out * 0.06})`, pointerEvents: out > 0.6 ? "none" : undefined }}>
          <div className="l3-hero-copy">
            <Kicker n="01">{tr("لفِرَق بحوث التخرّج")}</Kicker>
            <h1 className="l3-h1">
              <span className="block">{tr("فريقٌ صغير،")}</span>
              <span className="l3-grad block">{tr("بحثٌ كبير.")}</span>
            </h1>
            <p className="l3-lead">{tr("أنتم أربعة، ومعكم دكتورة، وقدّامكم بحث تخرّج. ويسي يرتّب الباقي: مين يسوي وش، ومتى، ووش قالت الدكتورة.")}</p>
            <Cta />
          </div>
          <div className="l3-hero-wesy">
            <div className="l3-sun" aria-hidden />
            <div className="l3-bubble">{tr("هلا! أنا ويسي. ارموا علي الفوضى، وأنا أرتّبها 🙌")}</div>
            <Wesy state="greet" size={340} label={tr("ويسي يرحّب فيكم")} />
            <span className="l3-plaque">{tr("ويسي · الرئيس التنفيذي لفريقكم")}</span>
          </div>
        </div>

        {/* القسم الكريمي: الكلمات الضخمة والوجوه */}
        <div className="l3-big" aria-hidden={cream < 0.5} style={{ visibility: cream > 0 ? "visible" : "hidden", pointerEvents: cream > 0.5 ? undefined : "none" }}>
          <Kicker n="02">{tr("الفريق")}</Kicker>
          <p className="l3-big-top">{tr("أربعة طلاب، دكتورة وحدة، وويسي بالنص.")}</p>
          <div className="l3-words" style={{ transform: `scale(${0.82 + ease(cream) * 0.18})` }}>
            <span>{tr("صغير")}</span>
            <span>{tr("كبير")}</span>
          </div>
          <div className="l3-faces">
            {FACES.map((f, i) => {
              const t = ease(faces(i));
              return (
                <figure key={f.src} className="l3-face" style={{ opacity: t, ["--tx" as string]: f.x * t, ["--ty" as string]: f.y * t, ["--rot" as string]: `${f.r * t}deg`, ["--sc" as string]: 0.6 + t * 0.4 }}>
                  <img src={f.src} alt="" loading="lazy" width={260} height={345} />
                </figure>
              );
            })}
            <figure className="l3-face l3-face-wesy" style={{ opacity: cream, transform: `scale(${0.7 + ease(cream) * 0.3})` }}>
              <span className="l3-face-wesy-in">
                <Wesy state="wink" size={tile} head label={tr("ويسي")} />
              </span>
            </figure>
          </div>
          <p className="l3-big-sub">{tr("كل واحد يعرف وش عليه. بدون قروب ضايع، وبدون واحد شايل الشغل كله.")}</p>
          <p className="l3-disclaimer">{tr("الصور توضيحية.")}</p>
        </div>
      </div>
    </section>
  );
}

/* ── 03: المنحنى — لقطات من المنصة على قوس، يلف مع السكرول ── */
const SHOTS = [
  { src: shotTasks, alt: tr("مهام الفريق") },
  { src: shotOverview, alt: tr("نظرة على البحث") },
  { src: shotDashTasks, alt: tr("توزيع المهام") },
  { src: shotSupervisor, alt: tr("لوحة الدكتورة") },
  { src: shotEvidence, alt: tr("مكتبة الدراسات") },
  { src: shotStats, alt: tr("الإحصاء") },
  { src: shotCelebrate, alt: tr("إنجاز مرحلة") },
];

function Curve() {
  const [ref, p] = useSectionProgress<HTMLElement>();
  const shift = (p - 0.5) * 3; // يلف ثلاث كروت تقريبًا خلال السكرول
  // الجوال: الكرت أعرض، فالمسافة بين الكروت أكبر عشان الوسط يبان واضح والجيران يطلّون من الجنب
  const step = typeof window !== "undefined" && window.innerWidth < 760 ? 54 : 23;
  const mid = (SHOTS.length - 1) / 2;
  return (
    <section ref={ref} className="l3-curve-sec">
      <div className="l3-curve-pin">
        <div className="l3-wrap">
          <Kicker n="03">{tr("داخل Wesync")}</Kicker>
          <h2 className="l3-h2">{tr("كل شي بمكانه، من أول يوم.")}</h2>
        </div>
        <div className="l3-curve" aria-label={tr("لقطات من المنصة")}>
          {SHOTS.map((s, i) => {
            const k = i - mid - shift;
            const abs = Math.abs(k);
            return (
              <figure
                key={s.alt}
                className="l3-shot"
                style={{
                  transform: `translateX(${k * -step}vw) translateZ(${-abs * abs * 34}px) rotateY(${k * -16}deg)`,
                  opacity: abs > 3.4 ? 0 : 1,
                  zIndex: 10 - Math.round(abs),
                }}
              >
                <img src={s.src} alt={s.alt} loading="lazy" />
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const [stepsRef, stepsOn] = useReveal<HTMLDivElement>();
  return (
    <div ref={stepsRef} className={`l3-wrap l3-steps ${stepsOn ? "on" : ""}`}>
        {[
          [tr("ادعوا فريقكم"), tr("رابط واحد بقروب الدفعة، وكل من يفتحه يدخل فريقكم على طول.")],
          [tr("عرّفوا ويسي على دكتورتكم"), tr("رابط بدون حساب: تشوف تقدّمكم، وتردّ عليكم، وتعتمد المحاضر بضغطة.")],
          [tr("اشتغلوا، وويسي يرتّب"), tr("يوزّع المهام، ويذكّركم قبل الموعد، ويحوّل ملاحظات الدكتورة لمهام.")],
        ].map(([t, d], i) => (
          <div key={t} className="l3-step" style={{ transitionDelay: `${i * 120}ms` }}>
            <span className="l3-step-n">{i + 1}</span>
            <b>{t}</b>
            <p>{d}</p>
          </div>
        ))}
      </div>
  );
}

/* ── 04: قابلوا ويسي ── */
const MOODS: WesyState[] = ["greet", "wink", "working", "laugh", "success"];
function MeetWesy() {
  const [ref, on] = useReveal<HTMLElement>();
  const [mood, setMood] = useState(0);
  const traits: [string, string][] = [
    [tr("هادي"), tr("ما يخوّفكم من المواعيد. يقسّمها لخطوات صغيرة تلحقون عليها.")],
    [tr("مرتّب"), tr("كل شي يحطه بمكانه: الدراسة بالمكتبة، والموعد بالتقويم، والمهمة لصاحبها.")],
    [tr("صادق"), tr("يقول لكم وش ناقص قبل لا تشوفه الدكتورة. بلطف، بس بصراحة.")],
    [tr("يستأذن"), tr("ما يرسل ولا يكتب ولا يوزّع شي إلا بعد ما توافقون.")],
  ];
  return (
    <section ref={ref} className={`l3-sec l3-meet ${on ? "on" : ""}`}>
      <div className="l3-wrap l3-meet-grid">
        <div>
          <Kicker n="04">{tr("قابلوا ويسي")}</Kicker>
          <h2 className="l3-h2">{tr("رئيسكم التنفيذي… بشماغ.")}</h2>
          <p className="l3-lead">{tr("مو روبوت ولا مدرّس. زميل يرتّب الفريق ويخلّيكم والدكتورة على نفس الصفحة.")}</p>
          <ul className="l3-traits">
            {traits.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" className="l3-meet-wesy" onClick={() => setMood((m) => (m + 1) % MOODS.length)} aria-label={tr("سلّموا على ويسي")}>
          <span className="l3-sun" aria-hidden />
          <Wesy state={MOODS[mood]} size={300} label={tr("ويسي")} />
          <span className="l3-tap">{tr("سلّموا عليه")}</span>
        </button>
      </div>
    </section>
  );
}

/* ── 05: الدكاترة ── */
function Doctors() {
  const [ref, on] = useReveal<HTMLElement>();
  const wa = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(tr("السلام عليكم، أنا دكتورة مشرفة وأبي كود Wesync لطلابي."))}`;
  return (
    <section id="doctors" ref={ref} className={`l3-sec l3-doc ${on ? "on" : ""}`}>
      <div className="l3-wrap l3-doc-grid">
        <div>
          <Kicker n="05">{tr("للدكاترة")}</Kicker>
          <h2 className="l3-h2">{tr("مشرفة على كذا فريق؟ كلهم بلوحة وحدة.")}</h2>
          <p className="l3-lead">{tr("بدون حساب ولا كلمة مرور. الطلبات والمحاضر والمواعيد توصلكم مرتّبة، وتردّون بضغطة. ومجانية لكم دايمًا.")}</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="l3-ghost">
            <MessageCircle size={17} aria-hidden />
            {tr("اطلبوا كود الدكتورة")}
          </a>
        </div>
        <figure className="l3-doc-shot">
          <img src={shotSupervisor} alt={tr("لوحة الدكتورة")} loading="lazy" />
        </figure>
      </div>
    </section>
  );
}

/* ── 06: السعر ── */
const PLAN_NAME: Record<BillingPeriod, () => string> = {
  month: () => tr("شهري"),
  semester: () => tr("فصل"),
  year: () => tr("السنة الدراسية"),
};

function Price() {
  const [ref, on] = useReveal<HTMLElement>();
  const [period, setPeriod] = useState<BillingPeriod>(BEST_PLAN);
  const plan = planOf(period);
  return (
    <section id="price" ref={ref} className={`l3-sec l3-price ${on ? "on" : ""}`}>
      <div className="l3-wrap">
        <Kicker n="06">{tr("السعر")}</Kicker>
        <div className="l3-price-card">
          <div className="l3-period l3-period-3" role="radiogroup" aria-label={tr("مدة الاشتراك")}>
            {PLAN_OPTIONS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={period === p.id} className={period === p.id ? "on" : ""} onClick={() => setPeriod(p.id)}>
                {PLAN_NAME[p.id]()}
                {p.id === BEST_PLAN && <span className="l3-period-tag">{tr("الأوفر")}</span>}
              </button>
            ))}
          </div>
          <p className="l3-price-k">{tr("لكل شخص · كل شي داخل")}</p>
          <p className="l3-price-n">
            <b>{plan.price}</b> {tr("ريال")}
          </p>
          <p className="l3-price-s">
            {period === "month"
              ? tr("بالشهر — يعني نص ريال باليوم.")
              : tr("{0} شهور — يعني {1} بالشهر، وتوفّر {2} ريال.", plan.months, perMonth(period), planSaving(period))}
          </p>
          <ul>
            {[
              tr("كل أدوات البحث والفريق + ويسي المساعد الذكي"),
              tr("الدكتورة مجانًا دايمًا"),
              tr("{0} يوم مجانًا بدون بطاقة", TRIAL_DAYS),
              tr("ادفع حصتك بنفسك، أو عن صاحبك، أو عن الفريق كامل"),
              tr("ضمان أول شهر · سعرك ثابت لين تتخرج"),
            ].map((x) => (
              <li key={x}>
                <Check size={16} aria-hidden />
                {x}
              </li>
            ))}
          </ul>
          <Cta />
          <p className="l3-price-small">{tr("فريق من 4 بالشهري = 60 ريال · وبالسنة الدراسية = 396 للفريق كامل")}</p>
        </div>
      </div>
    </section>
  );
}

/* ── 07: الخاتمة ── */
function Ending() {
  const [ref, on] = useReveal<HTMLElement>();
  const faq: [string, string][] = [
    [tr("الدكتورة تحتاج حساب؟"), tr("لا. رابط واحد تفتحه من جوالها، بدون تسجيل ولا كلمة مرور.")],
    [tr("فريقي مو كامل، أقدر أبدأ؟"), tr("أكيد. ابدأوا لحالكم وادعوا الباقين بأي وقت برابط واحد.")],
    [tr("مين يشوف بياناتنا؟"), tr("فريقكم ودكتورتكم بس. ولا فريق ثاني يشوف شي منها.")],
    [tr("وش يصير بعد الـ{0} يوم؟", TRIAL_DAYS), tr("ما فيه تجديد تلقائي ولا نسحب من بطاقتكم. لو ما اشتركتوا، بياناتكم تبقى محفوظة.")],
  ];
  return (
    <section ref={ref} className={`l3-sec l3-end ${on ? "on" : ""}`}>
      <div className="l3-wrap l3-end-in">
        <Kicker n="07">{tr("يلا")}</Kicker>
        <div className="l3-end-wesy">
          <span className="l3-sun" aria-hidden />
          <Wesy state="greet" size={240} label={tr("ويسي يودّعكم")} />
        </div>
        <h2 className="l3-h2 l3-center">{tr("فريقكم ينتظركم.")}</h2>
        <Cta className="l3-center" />
        <div className="l3-faq">
          {faq.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
      <footer className="l3-foot">
        <span>© Wesync</span>
        <Link to="/legal/terms">{tr("شروط الاستخدام")}</Link>
        <Link to="/legal/privacy">{tr("سياسة الخصوصية")}</Link>
        <Link to="/legal/contact">{tr("تواصل معنا")}</Link>
      </footer>
    </section>
  );
}

export default function LandingV3() {
  useEffect(() => {
    document.title = "Wesync — فريقٌ صغير، بحثٌ كبير";
  }, []);
  return (
    <div className="l3">
      <header className="l3-head">
        <Link to="/welcome" className="l3-logo" aria-label="Wesync">
          <WLogo size={30} />
          <b>Wesync</b>
        </Link>
        <nav className="l3-nav" aria-label={tr("أقسام الصفحة")}>
          <a href="#doctors" onClick={(e) => (e.preventDefault(), document.getElementById("doctors")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }))}>
            {tr("للدكاترة")}
          </a>
          <a href="#price" onClick={(e) => (e.preventDefault(), document.getElementById("price")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }))}>
            {tr("السعر")}
          </a>
        </nav>
        <span className="flex-1" />
        <LangToggle className="l3-lang" />
        <Link to="/login" className="l3-login">
          {tr("دخول")}
        </Link>
      </header>
      <main>
        <Stage />
        <Curve />
        <Steps />
        <MeetWesy />
        <Doctors />
        <Price />
        <Ending />
      </main>
    </div>
  );
}
