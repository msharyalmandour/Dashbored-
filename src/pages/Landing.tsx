import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Copy, MessageCircle } from "lucide-react";
import Logo from "../components/Logo";
import HeroVideo from "../components/HeroVideo";
import WelcomeVoice from "../components/WelcomeVoice";
import InstallAppButton from "../components/InstallAppButton";
import PlanComparison from "../components/PlanComparison";
import {
  AI_ADDON_FOUNDER,
  AI_ADDON_SOLO,
  AI_ADDON_TEAM,
  AI_PRICE,
  DUO_PRICE,
  MAX_TEAM_MEMBERS,
  SOLO_PRICE,
  TEAM_PRICE,
  TRIAL_DAYS,
  aiFeatures,
  basicHighlights,
  memberShare,
} from "../lib/plans";
import { SUPPORT_WHATSAPP } from "../lib/legal";
import LangToggle from "../components/ui/LangToggle";
import { tr, trx } from "../lib/i18n";


const font = "font-display";
/** خصائص حركة الظهور: يضاف لها كلاس ld-fx وتتأخر بالمللي ثانية للتتابع */
const fx = (d = 0) => ({ "data-fx": "", style: { ["--d" as string]: `${d}ms` } as React.CSSProperties });
const rise = (d: number) => ({ style: { ["--d" as string]: `${d}ms` } as React.CSSProperties });
const glassBtn = "ld-btn ld-glass rounded-full border border-white/20 bg-white/[0.08] px-7 py-3.5 text-[17px] text-white";
/** الزر الأبيض الدافئ بدائرة سهم — الزر الرئيسي بكل الصفحة */
function CtaButton({ children, big = false }: { children: React.ReactNode; big?: boolean }) {
  return (
    <Link
      to="/login?signup=1"
      className={`ld-btn ld-sheen inline-flex items-center gap-3.5 rounded-full bg-[#F6F1EC] font-semibold text-[#1A0F00] shadow-[0_18px_50px_rgba(255,120,0,0.35)] ${
        big ? "py-2 ps-7 pe-2 text-lg" : "py-2 ps-6 pe-2 text-[17px]"
      }`}
    >
      {children}
      <span className={`flex items-center justify-center rounded-full bg-[#1A0F00] text-[#F6F1EC] ${big ? "h-11 w-11" : "h-10 w-10"}`}>
        <ArrowLeft size={18} />
      </span>
    </Link>
  );
}

/** مشاركة الموقع (واتساب / نسخ الرابط) */
function ShareSiteRow() {
  const [copied, setCopied] = useState(false);
  const siteUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const waMessage = tr("جربوا Wesync — منصة تنظّم بحث التخرج كامل بمكان واحد بدل قروبات الواتساب المشتتة 🎓\n{0}", siteUrl);

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
        <MessageCircle size={13} />{tr(" شاركي الموقع")}</a>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/50 transition hover:border-amber-400/40 hover:text-amber-300"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? tr("تم النسخ") : tr("نسخ الرابط")}
      </button>
    </div>
  );
}


const faqs = [
  {
    q: tr("شنو لو ما نعرف نستخدم برامج تقنية؟"),
    a: tr("التطبيق بسيط وبالعربي بالكامل، ودليل الطالب داخل التطبيق يمشي وياكم خطوة بخطوة من أول يوم."),
  },
  {
    q: tr("لو حبينا نوقف الاشتراك بالإجازة أو بعد التسليم؟"),
    a: tr("ما فيه تجديد تلقائي أصلًا ولا نسحب من بطاقتكم. إذا ما دفعتم يتجمّد الفريق مجانًا (قراءة فقط) وبياناتكم محفوظة لين ترجعون."),
  },
  {
    q: tr("هل بيانات وملفات فريقنا آمنة؟"),
    a: tr("بياناتكم خاصة بفريقكم فقط، ومحمية بنظام صلاحيات — كل عضو يشوف اللي يخصه حسب دوره في الفريق."),
  },
  {
    q: tr("ينفع لو فريقنا أقل من ٥ أعضاء؟"),
    a: tr("أكيد. السعر للفريق كامل مو لكل شخص: لحالك {0} ريال، شخصين {1}، ومن ٣ إلى {2} أعضاء {3} ريال بالشهر. والمشرفة مجانًا دايمًا وما تنحسب.", SOLO_PRICE, DUO_PRICE, MAX_TEAM_MEMBERS, TEAM_PRICE),
  },
  {
    q: tr("هل الذكاء الاصطناعي يكتب البحث عنّا؟"),
    a: tr("لا. المساعد يرتّب ويشرح ويقترح، والكتابة منكم — عشان بحثكم يطلع من شغلكم، وتدافعون عنه بالمناقشة وأنتم واثقين."),
  },
  {
    q: tr("ظروفي ما تسمح بالدفع؟"),
    a: tr("عندنا منحة لعدد محدود من الطلاب. راسلونا واتساب (الزر الأخضر تحت) وقولوا لنا عن وضعكم، بدون إحراج."),
  },
  {
    q: tr("لو واجهنا مشكلة أو سؤال، كيف الدعم؟"),
    a: tr("تراسلوننا مباشرة من داخل التطبيق أو عبر التواصل المتاح، ونرد عليكم خلال نفس اليوم غالبًا."),
  },
];


/** يضيف كلاس الظهور لأي عنصر فيه data-fx أول ما يدخل الشاشة، ويحدّث --sy (للبارالاكس) أثناء التمرير */
function useScrollFx(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(el.querySelectorAll<HTMLElement>("[data-fx]"));
    if (reduced) {
      targets.forEach((t) => t.classList.add("ld-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("ld-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => el.style.setProperty("--sy", String(Math.min(window.scrollY, 1400))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [root]);
}

/** حلقة التقدّم تتعبّى من صفر لحد القيمة أول ما تظهر */
function AnimatedRing({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / 1600, 1);
        setV(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <div ref={ref} className="flex h-[170px] w-[170px] items-center justify-center self-center rounded-full shadow-[0_0_60px_rgba(255,180,68,0.35)]" style={{ background: `conic-gradient(#FFE3A3 0 ${v}%,rgba(255,255,255,.14) 0)` }}>
      <div className="flex h-[138px] w-[138px] flex-col items-center justify-center rounded-full bg-[#1E0A03]">
        <div className="font-display text-[38px] font-extrabold leading-[1.1]">{v}%</div>
        <div className="text-xs text-[#CDBFB3]">{tr("من الطريق")}</div>
      </div>
    </div>
  );
}

type Door = { id: string; label: string; line: string; body: React.ReactNode };

const row = "flex items-center gap-2 rounded-xl bg-black/25 p-2.5 text-xs";
const dot = <span className="h-2 w-2 shrink-0 rounded-full bg-[#FFB444]" />;

/** أقسام المنصّة الفعلية (نفس أبواب القائمة) بعرض مبسّط */
const doors: Door[] = [
  {
    id: "search",
    label: tr("أبحث"),
    line: tr("أسئلة بحثكم من دراسات حقيقية"),
    body: (
      <div className="space-y-2">
        <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs text-[#CDBFB3]">{tr("أثر الإرهاق الوظيفي على الممرضين…")}</div>
        {[tr("دراسة سعودية · ٢٠٢٣"), tr("مراجعة منهجية · ٢٠٢١"), tr("دراسة مقطعية · ٢٠٢٢")].map((t) => (
          <div key={t} className={row}>{dot}<span>{t}</span><span className="ms-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[#F1D9C4]">PubMed</span></div>
        ))}
      </div>
    ),
  },
  {
    id: "write",
    label: tr("أكتب"),
    line: tr("مقترح ومنهجية خطوة بخطوة"),
    body: (
      <div className="space-y-2">
        {[[tr("الهدف"), true], [tr("أسئلة البحث"), true], [tr("المنهجية"), false], [tr("الموافقة الأخلاقية"), false]].map(([t, d]) => (
          <div key={String(t)} className={row}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${d ? "border-[#FFB444] bg-[#FFB444] text-[#1A0F00]" : "border-white/30"}`}>{d ? <Check size={10} /> : null}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "collect",
    label: tr("أجمع وأحلل"),
    line: tr("من الاستبيان حتى الإحصاء"),
    body: <AnimatedRing value={72} />,
  },
  {
    id: "team",
    label: tr("الفريق"),
    line: tr("من أنجز، ومن يحتاج مساعدة"),
    body: (
      <div className="space-y-2.5">
        {[[tr("س"), 82, "#FFB444"], [tr("ل"), 91, "#FFB444"], [tr("ع"), 54, "#FF8A5C"]].map(([l, w, c]) => (
          <div key={String(l)} className="flex items-center gap-2">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] text-xs" style={{ borderColor: String(c) }}>{l}</span>
            <div className="h-1.5 flex-1 rounded-full bg-white/15"><div className="h-full rounded-full" style={{ width: `${w}%`, background: String(c) }} /></div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "supervisor",
    label: tr("المشرف/ة"),
    line: tr("ملاحظاتها تتحول لمهام"),
    body: (
      <div className="space-y-2">
        <div className={row}>{dot}<span>{tr("ملاحظة: وضّحوا عيّنة الدراسة")}</span></div>
        <div className={row}><Check size={13} className="shrink-0 text-[#FFB444]" /><span>{tr("صارت مهمة · مها · الأحد")}</span></div>
        <div className="rounded-full bg-[#FFB444]/20 px-3 py-1.5 text-center text-[11px] text-[#FFE3A3]">{tr("رابط بدون حساب للمشرف/ة")}</div>
      </div>
    ),
  },
  {
    id: "calendar",
    label: tr("التقويم والملفات"),
    line: tr("مواعيدكم على جوالكم"),
    body: (
      <div className="space-y-2">
        {[[tr("الأحد ١٠:٠٠"), tr("اجتماع المشرف")], [tr("الثلاثاء ٨:٠٠"), tr("تسليم الاستبيان")], [tr("الخميس ١٢:٠٠"), tr("جمع البيانات")]].map(([t, e]) => (
          <div key={t} className={row}><span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-[#F1D9C4]">{t}</span><span>{e}</span></div>
        ))}
      </div>
    ),
  },
];

/** الكاروسيل: البطاقة النشطة بالنص، والبقية بزاوية. يتقلّب تلقائيًا ويقف لما أحد يلمسه */
function DoorsCoverflow() {
  const [active, setActive] = useState(2);
  const [paused, setPaused] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const touchX = useRef(0);
  const n = doors.length;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), 4500);
    return () => clearInterval(t);
  }, [paused, n]);

  const step = narrow ? 168 : 285;
  const reach = narrow ? 1 : 2;
  const cardW = narrow ? 232 : 300;
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) setActive((a) => (a + (dx < 0 ? 1 : -1) + n) % n);
        setTimeout(() => setPaused(false), 6000);
      }}
    >
      <div className="relative h-[440px]" style={{ perspective: "1800px" }}>
        {doors.map((d, i) => {
          let off = (i - active + n) % n;
          if (off > n / 2) off -= n;
          const abs = Math.abs(off);
          const shown = abs <= reach;
          const center = off === 0;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={d.label}
              aria-current={center}
              tabIndex={shown ? 0 : -1}
              className={`ld-glass absolute left-1/2 top-4 flex h-[400px] flex-col justify-between rounded-[32px] border p-6 text-start ${
                center ? "border-[#FFDCAA]/40" : "border-white/15 bg-gradient-to-br from-white/[0.12] to-orange-400/10"
              }`}
              style={{
                width: cardW,
                transform: `translateX(-50%) translateX(${off * step}px) rotateY(${off * -24}deg) scale(${1 - abs * 0.1})`,
                zIndex: 10 - abs,
                opacity: shown ? (center ? 1 : abs === 1 ? (narrow ? 0.6 : 0.85) : 0.5) : 0,
                pointerEvents: shown ? "auto" : "none",
                transition: "transform .8s cubic-bezier(.2,.7,.2,1), opacity .8s",
                ...(center
                  ? {
                      background: "linear-gradient(165deg,rgba(255,180,68,.35),rgba(255,107,0,.18) 40%,rgba(30,12,4,.75))",
                      boxShadow: "0 50px 100px rgba(0,0,0,.55),0 0 80px rgba(255,107,0,.25),inset 0 1px 0 rgba(255,240,210,.35)",
                    }
                  : { boxShadow: "0 30px 70px rgba(0,0,0,.45)" }),
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#F1D9C4]">{tr("قسم في المنصّة")}</span>
                <span className="rounded-full bg-black/30 px-2.5 py-[3px] text-xs">{i + 1} / {n}</span>
              </div>
              <div className="pointer-events-none flex flex-1 flex-col justify-center py-4">{d.body}</div>
              <div>
                <div className={`${font} text-[22px] font-extrabold`}>{d.label}</div>
                <div className="text-sm text-[#E6DBD1]">{d.line}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="relative mt-2 flex flex-wrap items-center justify-center gap-2">
        {doors.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
              i === active ? "border-[#FFB444]/60 bg-[#FFB444]/15 text-[#FFE3A3]" : "border-white/10 text-[#BDAFA3] hover:text-white"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** المواقف اللي تتكرر بكل فريق بحث — نبدأ بالألم، وبعدها الحل */
const pains = [
  { pain: tr("٥٠٠ رسالة بالقروب، ولا وحدة مهمة."), fix: tr("المهام والملفات والقرارات بمكانها، مو ضايعة بين الستيكرز.") },
  { pain: tr("واحد شايل البحث كله، والباقي «إن شاء الله»."), fix: tr("الكل يشوف مين سوّى وش.. بدون إحراج ولا مواجهة.") },
  { pain: tr("المشرفة رسلت ملاحظات، ومحد يدري مين يعدّل وش."), fix: tr("كل ملاحظة تصير مهمة باسم صاحبها وموعدها.") },
  { pain: tr("انتبهتوا للتسليم قبله بيومين."), fix: tr("مخطط الموعد يوزّع الأسابيع من يوم التسليم للخلف.") },
];

const pillars = [
  { n: tr("٠١"), k: tr("وضوح"), t: tr("لكل مهمة صاحب وموعد."), d: tr("انتهى سؤال «مين عليه هذا الجزء؟». كل بند من الاجتماع يصير مهمة باسم صاحبها.") },
  { n: tr("٠٢"), k: tr("عدالة"), t: tr("العبء موزّع، والجهد ظاهر."), d: tr("ترون من يحمل أكثر من طاقته ومن يقدر يساعد، مع تقرير مساهمة جاهز للمشرف/ة.") },
  { n: tr("٠٣"), k: tr("جاهزية"), t: tr("الأوراق الرسمية، بقوالب عربية."), d: tr("الاستبيان والموافقة المستنيرة وخطاب الجهة، تتعبأ ببيانات بحثكم وتنزّل Word.") },
];

const HERO_STUDENTS_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3DcLf2tK7FaVBL9vPr6KijocE5E/hf_20261023_175737_302ddc3a-e909-4c3d-bb47-1e307440dab7.mp4";

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollFx(rootRef);
  return (
    <div ref={rootRef} className="relative min-h-screen overflow-x-clip bg-[#080808] text-[#F6F1EC]">
      <div aria-hidden className="ld-grain absolute inset-0 z-[9]" />

      {/* ================= HERO ================= */}
      <section className="relative isolate min-h-[820px] overflow-hidden bg-[#260600] md:min-h-[940px]">
        <div aria-hidden className="ld-breath ld-par absolute top-[120px] h-[720px] w-[720px] rounded-full bg-[#E8400A] opacity-[0.85] blur-[90px] end-[8%]" style={{ ["--k" as string]: 0.18 }} />
        <div aria-hidden className="ld-breath ld-par absolute top-[300px] h-[380px] w-[460px] rounded-full bg-[#FFB444] blur-[110px] end-[16%]" style={{ ["--k" as string]: 0.1 }} />
        <div aria-hidden className="absolute top-[380px] h-[240px] w-[300px] rounded-full bg-[#FFE27A] opacity-90 blur-[70px] end-[20%]" />
        {/* على الجوال الصورة تقعد بالنص السفلي تحت الكلام عشان الشخص ما يختفي ورا العنوان */}
        <div className="ld-hero-flip absolute inset-0 hidden md:block">
          <HeroVideo poster="/landing/students.webp" video={HERO_STUDENTS_VIDEO} objectPosition="left center" />
        </div>
        {/* الجوال: نفس الفيديو فوق الصورة (إلا مع توفير البيانات)، والصورة نفسها تتحرك بهدوء لو الفيديو ما اشتغل */}
        <div className="absolute inset-x-0 bottom-0 h-[58%] md:hidden [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,#000_30%)] [mask-image:linear-gradient(to_bottom,transparent_0,#000_30%)]">
          <picture>
            <img
              src="/landing/students-m.webp"
              alt=""
              fetchPriority="high"
              className="ld-hero-img ld-walk absolute inset-0 h-full w-full object-cover object-[22%_center]"
            />
          </picture>
          <HeroVideo poster="/landing/students-m.webp" video={HERO_STUDENTS_VIDEO} objectPosition="22% center" allowMobile />
        </div>
        <div aria-hidden className="ld-embers pointer-events-none absolute inset-0 z-[2]">
          {Array.from({ length: 16 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${i * 6.4 + 2}%`,
                ["--w" as string]: `${3 + (i % 3) * 2}px`,
                ["--dx" as string]: `${((i % 5) - 2) * 40}px`,
                ["--t" as string]: `${9 + (i % 4) * 3}s`,
                ["--d" as string]: `${-i * 1.3}s`,
              }}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="ld-hero-flip absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(270deg,rgba(8,8,8,.92) 0,rgba(8,8,8,.55) 38%,rgba(8,8,8,0) 65%),linear-gradient(0deg,#080808 0,rgba(8,8,8,0) 28%)",
          }}
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080808] to-transparent md:hidden" />

        <nav className="relative z-[3] mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-5 px-6 py-6 sm:px-9">
          <div className={`${font} flex items-center gap-3 text-[21px] font-extrabold tracking-[0.3px]`}>
            <Logo size={38} />
            Wesync
          </div>
          <div className="ld-glass hidden gap-1 rounded-full border border-white/[0.14] bg-white/[0.07] p-[5px] text-[15px] md:flex">
            <a href="#how" className="rounded-full bg-white/[0.12] px-5 py-2">{tr("المنصّة")}</a>
            <a href="#supervisor" className="rounded-full px-5 py-2 text-[#D9CFC6] hover:text-white">{tr("المشرف/ة")}</a>
            <a href="#pricing" className="rounded-full px-5 py-2 text-[#D9CFC6] hover:text-white">{tr("الباقات")}</a>
            <a href="#faq" className="rounded-full px-5 py-2 text-[#D9CFC6] hover:text-white">{tr("أسئلة")}</a>
          </div>
          <div className="flex items-center gap-2">
            <WelcomeVoice />
            <span className="hidden lg:inline-flex">
              <InstallAppButton />
            </span>
            <LangToggle className="border-white/20 bg-white/[0.08] text-[#F4F0EC] hover:bg-white/[0.14]" />
            <Link to="/login" className="px-4 py-2.5 text-[15px] text-[#D9CFC6] hover:text-white">{tr("دخول")}</Link>
            <Link to="/login?signup=1" className="ld-btn rounded-full bg-[#F6F1EC] px-[22px] py-2.5 text-[15px] font-semibold text-[#1A0F00]">{tr("ابدأوا")}</Link>
          </div>
        </nav>

        <div className="relative z-[3] mx-auto max-w-[1280px] px-6 pt-20 sm:px-9 md:pt-[130px]">
          <div className="max-w-[600px]">
            <div {...rise(150)} className="ld-rise ld-glass inline-block rounded-full border border-white/[0.16] bg-white/[0.08] px-[18px] py-[7px] text-sm text-[#F1D9C4]">{tr("لفِرَق بحوث التخرّج")}</div>
            <h1 {...rise(300)} className={`ld-rise ${font} mt-7 text-[38px] font-extrabold leading-[1.25] tracking-[-0.5px] sm:text-[46px] md:text-[68px] md:leading-[1.2] md:tracking-[-1px]`}>{tr("بحثكم يخلص")}<br />
              <span className="bg-gradient-to-l from-[#FFE3A3] to-[#FFB444] bg-clip-text text-transparent">{tr("بوقته، مو بآخر ليلة")}</span>
            </h1>
            <p {...rise(500)} className="ld-rise mt-6 max-w-[44ch] text-lg font-light text-[#E6DBD1] [text-shadow:0_2px_18px_rgba(0,0,0,0.55)] md:text-[21px]">{tr("قروب واتساب ضايع، وواحد شايل الشغل كله، وملاحظات المشرفة محد يدري عنها؟ Wesync يجمع فريقكم ومشرفكم وكل مراحل البحث بمكان واحد — كل واحد يعرف وش عليه، ومتى.")}</p>
            <div {...rise(700)} className="ld-rise mt-9 flex flex-wrap items-center gap-3">
              <CtaButton>{tr("ابدأوا فريقكم")}</CtaButton>
              <a href="#how" className={glassBtn}>{tr("شاهدوا كيف يعمل")}</a>
            </div>
            <p {...rise(900)} className="ld-rise mt-5 text-sm text-[#BDAFA3]">{trx("{0} يوم مجانًا بدون بطاقة · الفريق كامل بـ{1} ريال بالشهر · المشرفة مجانًا", TRIAL_DAYS, TEAM_PRICE)}</p>
          </div>
        </div>
      </section>

      {/* ================= COVERFLOW ================= */}
      <section id="how" className="relative scroll-mt-4 overflow-hidden px-6 pb-[110px] pt-10">
        <div aria-hidden className="absolute start-1/2 top-10 h-[560px] w-[1000px] -translate-x-1/2 rounded-full blur-[20px]" style={{ background: "radial-gradient(ellipse,rgba(255,107,0,.28),rgba(0,0,0,0) 65%)" }} />
        <div {...fx()} className="ld-fx relative mx-auto mb-14 max-w-[640px] text-center">
          <div className="text-[15px] font-semibold text-[#FF9A3C]">{tr("كل ما يحتاجه فريقكم")}</div>
          <h2 className={`${font} mt-2.5 text-[34px] font-extrabold leading-[1.35] md:text-[46px]`}>{tr("أدوات كثيرة. منصّة واحدة.")}</h2>
        </div>

        <DoorsCoverflow />
        <p className="relative mt-6 text-center text-xs text-[#BDAFA3]">{tr("الأقسام نفسها اللي بالمنصّة، والبيانات أمثلة للتوضيح.")}</p>
      </section>

      {/* ================= PAINS ================= */}
      <section className="relative mx-auto max-w-[1100px] px-6 pb-24 pt-6 sm:px-9">
        <div {...fx()} className="ld-fx mx-auto max-w-[640px] text-center">
          <div className="text-[15px] font-semibold text-[#FF9A3C]">{tr("تعرفون هالمواقف؟")}</div>
          <h2 className={`${font} mt-2.5 text-[32px] font-extrabold leading-[1.35] md:text-[44px]`}>{tr("مشكلة بحث التخرج مو البحث.. الفوضى اللي حوله.")}</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {pains.map((p, i) => (
            <div key={p.pain} {...fx(i * 120)} className="ld-fx ld-glass rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-6">
              <p className={`${font} text-[21px] font-bold leading-[1.5] text-[#F6F1EC]`}>{p.pain}</p>
              <p className="mt-3 flex items-start gap-2 text-[15px] text-[#FFD9A8]">
                <Check size={16} className="mt-1 shrink-0 text-[#FFB444]" />
                {p.fix}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= STATEMENT ================= */}
      <section
        className="relative overflow-hidden px-6 pb-[140px] pt-[150px] text-center sm:px-9"
        style={{
          background:
            "linear-gradient(180deg,#080808 0,#080808 6%,rgba(8,8,8,0) 30%),repeating-linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.05) 22px,rgba(255,255,255,0) 54px),linear-gradient(180deg,#080808 0,#3A1204 30%,#C24A0A 62%,#FF9A3C 84%,#FFE3B0 100%)",
        }}
      >
        <div {...fx()} className="ld-fx relative mx-auto max-w-[900px]">
          <div className="text-sm tracking-[2px] text-[#F1D9C4]">{tr("فلسفتنا")}</div>
          <h2 className={`${font} mt-[18px] text-[40px] font-extrabold leading-[1.3] md:text-[62px]`}>{tr("Wesync لا يكتب بحثكم.")}</h2>
          <p className={`${font} mt-3 text-[22px] leading-[1.6] text-[#2A0E04] md:text-[30px]`}>{tr("يرتّب كل ما حوله،")}<br />{tr("فبحثكم يطلع من شغلكم.. وبضمير مرتاح.")}</p>
        </div>
      </section>

      {/* ================= PILLARS ================= */}
      <section className="relative mx-auto max-w-[1280px] px-6 pb-16 pt-[120px] sm:px-9">
        <div className="flex flex-wrap gap-6">
          {pillars.map((p, i) => (
            <div key={p.n} {...fx(i * 160)} className="ld-fx min-w-[280px] flex-1 border-t border-[#FFB444]/40 pt-[26px]">
              <div className={`${font} text-[15px] font-extrabold text-[#FFB444]`}>{p.n} — {p.k}</div>
              <h3 className={`${font} mb-2 mt-3 text-[26px] font-semibold leading-[1.45]`}>{p.t}</h3>
              <p className="text-[#BDAFA3]">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SUPERVISOR ================= */}
      <section id="supervisor" className="relative mx-auto max-w-[1280px] scroll-mt-4 px-6 pb-24 pt-14 sm:px-9">
        <div
          className="relative flex min-h-[520px] items-center overflow-hidden rounded-[40px] p-8 md:p-[60px]"
          style={{ background: "radial-gradient(ellipse at 30% 60%,#FFD27A 0,#FF8A1F 28%,#C2400A 58%,#3A1204 100%)" }}
        >
          <div aria-hidden className="absolute top-1/2 h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-[#FFE7A8] opacity-70 blur-[80px] start-[12%]" />
          <div className="relative flex w-full flex-wrap items-center gap-10">
            <div {...fx()} className="ld-fx min-w-[280px] flex-[1_1_420px]">
              <div className="text-sm font-semibold tracking-[0.3px] text-[#2A0E04]">{tr("ما لا تلقونه عند غيرنا")}</div>
              <h2 className={`${font} mb-3.5 mt-2.5 text-[38px] font-extrabold leading-[1.3] text-[#1A0F00] md:text-[48px]`}>{tr("مشرفكم معكم،")}<br />{tr("بلا حسابات.")}</h2>
              <p className="max-w-[42ch] text-[19px] text-[#2A0E04]">{tr("رابط واحد يفتح له تقدّم الفريق ومحاضر الاجتماعات، فيعتمد ويعلّق ويجاوب على أسئلتكم بضغطة.")}</p>
            </div>
            <div {...fx(200)} className="ld-fx flex min-w-[280px] flex-[1_1_380px] flex-col gap-3.5">
              <div className="ld-glass flex items-center justify-between rounded-full border border-white/35 bg-white/[0.18] px-[22px] py-3.5 text-[#1A0F00]"><span className="font-semibold">{tr("تقدّم الفريق")}</span><span className="flex gap-1.5">●●●<span className="opacity-35">●●</span></span><span className="font-bold">{tr("مثال")}</span></div>
              <div className="ld-glass flex items-center justify-between rounded-full border border-white/35 bg-white/[0.18] px-[22px] py-3.5 text-[#1A0F00]"><span className="font-semibold">{tr("محضر الاجتماع")}</span><span className="rounded-full bg-[#1A0F00] px-3.5 py-1 text-sm text-[#F6F1EC]">{tr("اعتمد")}</span></div>
              <div className="ld-glass rounded-[28px] border border-white/20 bg-[#1A0F00]/55 px-[22px] py-[18px] text-[#F6F1EC]"><div className="text-[13px] text-[#F1D9C4]">{tr("ملاحظة المشرف/ة")}</div><div className="mt-0.5 text-lg">{tr("«ركّزوا على المحاور قبل الاجتماع القادم.»")}</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section id="pricing" className="relative mx-auto max-w-[1100px] scroll-mt-4 px-6 pb-24 pt-14 sm:px-9">
        <div {...fx()} className="ld-fx mx-auto max-w-[640px] text-center">
          <div className="text-[15px] font-semibold text-[#FF9A3C]">{tr("سعر الإطلاق")}</div>
          <h2 className={`${font} mb-2 mt-2.5 text-[34px] font-extrabold leading-[1.35] md:text-[46px]`}>{trx("الفريق كامل بـ{0} ريال.", TEAM_PRICE)}<br />
            <span className="font-normal text-[#FFD9A8]">{tr("نصيبك أقل من كوب قهوة.")}</span>
          </h2>
          <p className="text-[#BDAFA3]">{trx("اشتراك واحد للفريق كامل حتى {0} أعضاء — مو لكل شخص. لحالك {1} ريال، شخصين {2}. المشرفة مجانًا دايمًا، و{3} يوم تجربة بدون بطاقة.", MAX_TEAM_MEMBERS, SOLO_PRICE, DUO_PRICE, TRIAL_DAYS)}</p>
        </div>

        <div className="mt-14 grid items-stretch gap-[22px] md:grid-cols-2">
          <div {...fx(100)} className="ld-fx ld-glass flex flex-col gap-[22px] rounded-[34px] border border-white/[0.12] bg-white/[0.04] p-[34px]">
            <div><div className={`${font} text-[22px] font-semibold`}>{tr("اشتراك الفريق")}</div><div className="text-[15px] text-[#BDAFA3]">{tr("كل أدوات تنظيم البحث للفريق كامل")}</div></div>
            <div>
              <div className="flex items-baseline gap-2"><span className={`${font} text-[60px] font-extrabold leading-none`}>{TEAM_PRICE}</span><span className="text-[#BDAFA3]">{tr("ريال شهريًا للفريق كامل")}</span></div>
              <div className="mt-2 text-sm text-[#FFD9A8]">{trx("يعني {0} ريال بس لكل عضو لو كنتم {1}", memberShare(TEAM_PRICE, MAX_TEAM_MEMBERS), MAX_TEAM_MEMBERS)}</div>
            </div>
            <Link to="/login?signup=1" className="ld-btn rounded-full border border-white/20 bg-white/[0.08] p-3.5 text-center font-semibold">{trx("ابدأوا {0} يوم مجانًا", TRIAL_DAYS)}</Link>
            <ul className="space-y-3 border-t border-white/10 pt-5 text-[15px] text-[#E6DBD1]">
              {basicHighlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5"><Check size={15} className="mt-1 shrink-0 text-[#FFB444]" />{item}</li>
              ))}
            </ul>
          </div>

          <div
            {...fx(250)}
            className="ld-fx ld-glass relative flex flex-col gap-[22px] rounded-[34px] border border-[#FFC882]/55 p-[34px]"
            style={{
              background: "linear-gradient(170deg,rgba(255,180,68,.3),rgba(255,107,0,.14) 35%,rgba(30,12,4,.85) 75%)",
              boxShadow: "0 40px 100px rgba(255,107,0,.28),inset 0 1px 0 rgba(255,240,210,.35)",
            }}
          >
            <span className="absolute end-[22px] top-[22px] rounded-full bg-[#F6F1EC] px-3.5 py-[5px] text-xs font-semibold text-[#1A0F00]">{trx("أول ١٥ فريق: المساعد بـ{0} بس", AI_ADDON_FOUNDER)}</span>
            <div><div className={`${font} text-[22px] font-semibold`}>{tr("الفريق + المساعد الذكي")}</div><div className="text-[15px] text-[#E6DBD1]">{tr("مساعد يرتّب ويشرح ويقترح — مو بديل عنكم")}</div></div>
            <div>
              <div className="flex items-baseline gap-2"><span className={`${font} text-[60px] font-extrabold leading-none`}>{AI_PRICE}</span><span className="text-[#E6DBD1]">{tr("ريال شهريًا للفريق كامل")}</span></div>
              <div className="mt-2 text-sm text-[#FFE3A3]">{trx("اشتراك الفريق + المساعد بـ{0} ريال (لحالك +{1})", AI_ADDON_TEAM, AI_ADDON_SOLO)}</div>
            </div>
            <Link to="/login?signup=1" className="ld-btn rounded-full bg-[#F6F1EC] p-[15px] text-center font-bold text-[#1A0F00] shadow-[0_14px_40px_rgba(255,140,0,0.35)]">{tr("جرّبوا المساعد مجانًا")}</Link>
            <ul className="space-y-3 border-t border-white/[0.18] pt-5 text-[15px] text-[#F6F1EC]">
              <li className="text-[#F1D9C4]">{tr("كل اللي باشتراك الفريق، إضافةً إلى:")}</li>
              {aiFeatures.map((f) => (
                <li key={f.title} className="flex items-start gap-2.5"><Check size={15} className="mt-1 shrink-0 text-[#FFE3A3]" /><span><b className="font-semibold">{f.title}</b> — {f.desc}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <details className="ld-faq mx-auto mt-10 max-w-3xl rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-4">
          <summary className="flex items-center justify-between gap-3 font-semibold">{tr("وش يضيف المساعد الذكي بالتفصيل؟")}<ChevronDown size={18} className="ld-faq-chev shrink-0 text-[#FFB444] transition-transform" />
          </summary>
          <div className="mt-5"><PlanComparison variant="dark" /></div>
        </details>

        <div className="mx-auto mt-8 max-w-md text-start text-sm text-white/50">
          <p className="mb-3 font-bold text-white">{tr("كيف يتم الدفع؟")}</p>
          <ol className="space-y-2.5">
            {[tr("ادفعوا بـ Apple Pay أو STC Pay أو مدى"), tr("كل واحد يدفع نصيبه، أو القائد يدفع عن الكل"), tr("يتفعّل الاشتراك خلال ثوانٍ — بدون تجديد تلقائي")].map((step, i) => (
              <li key={step} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFB444]/15 text-[11px] font-bold text-[#FFB444]">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            { k: tr("بالإجازة؟"), v: tr("الفريق يتجمّد مجانًا، وبياناتكم محفوظة لين ترجعون.") },
            { k: tr("ادعوا فريق ثاني"), v: tr("أول ما يشتركون: شهر مجاني لكم ولهم.") },
            { k: tr("ظروفك ما تسمح؟"), v: tr("عندنا منحة محدودة — اطلبوها واتساب بدون إحراج.") },
          ].map((perk) => (
            <div key={perk.k} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 text-start">
              <div className="text-sm font-bold text-[#FFB444]">{perk.k}</div>
              <div className="mt-1 text-sm text-[#BDAFA3]">{perk.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="relative mx-auto max-w-[820px] scroll-mt-4 px-6 pb-20 pt-10 sm:px-9">
        <h2 {...fx()} className={`ld-fx ${font} mb-8 text-center text-[34px] font-extrabold md:text-[40px]`}>{tr("قبل ما تبدأون")}</h2>
        <div className="flex flex-col gap-2.5">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0} className="ld-faq border-b border-white/[0.12] px-1 py-5">
              <summary className="flex items-center justify-between gap-3 text-[19px] font-semibold">
                {f.q}
                <ChevronDown size={18} className="ld-faq-chev shrink-0 text-[#FFB444] transition-transform" />
              </summary>
              <p className="mt-2.5 text-[#BDAFA3]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden px-6 pb-[200px] pt-[140px] text-center sm:px-9">
        <div aria-hidden className="ld-breath absolute -bottom-[360px] start-1/2 h-[620px] w-[1300px] -translate-x-1/2 rounded-full bg-[#E8400A] opacity-75 blur-[90px]" />
        <div aria-hidden className="absolute -bottom-[220px] start-1/2 h-[360px] w-[900px] -translate-x-1/2 rounded-full bg-[#FFC85A] blur-[80px]" />
        <div {...fx()} className="ld-fx relative">
          <h2 className={`${font} text-[38px] font-extrabold leading-[1.3] md:text-[60px]`}>{tr("الليلة الأخيرة قبل التسليم؟")}<br />
            <span className="font-normal">{tr("خلّوها ليلة عادية.")}</span>
          </h2>
          <p className="mx-auto mb-9 mt-[18px] max-w-xl text-lg font-light text-[#E6DBD1] md:text-xl">{trx("{0} يوم مجانًا بدون بطاقة. ادعوا فريقكم ومشرفكم في دقيقة.", TRIAL_DAYS)}</p>
          <CtaButton big>{tr("ابدأوا فريقكم")}</CtaButton>
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-[1280px] border-t border-white/10 px-6 pb-12 pt-7 text-sm text-[#BDAFA3] sm:px-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className={`${font} flex items-center gap-2.5 font-semibold text-[#F6F1EC]`}><Logo size={26} /> Wesync</div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/legal/terms" className="hover:text-[#FFB444]">{tr("شروط الاستخدام")}</Link>
            <Link to="/legal/privacy" className="hover:text-[#FFB444]">{tr("سياسة الخصوصية")}</Link>
            <Link to="/legal/refund" className="hover:text-[#FFB444]">{tr("الإلغاء والاسترداد")}</Link>
            <Link to="/legal/contact" className="hover:text-[#FFB444]">{tr("تواصل معنا")}</Link>
          </nav>
          <div>© {new Date().getFullYear()} Wesync</div>
        </div>
        <ShareSiteRow />
      </footer>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}`}
        target="_blank"
        rel="noreferrer"
        aria-label={tr("تواصلوا معنا عبر واتساب")}
        className="ld-glass fixed bottom-7 z-20 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#2FBF6B]/90 shadow-[0_12px_30px_rgba(47,191,107,0.4)] start-7"
      >
        <MessageCircle size={26} className="text-[#06210F]" strokeWidth={2} />
      </a>
    </div>
  );
}
