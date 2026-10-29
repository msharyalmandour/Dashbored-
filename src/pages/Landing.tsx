import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Copy, MessageCircle } from "lucide-react";
import Logo from "../components/Logo";
import HeroVideo from "../components/HeroVideo";
import WelcomeVoice from "../components/WelcomeVoice";
import InstallAppButton from "../components/InstallAppButton";
import { FaqV2, FeaturesBento, Integrations, PricingV2, Problems, useWhatsAppAvoid } from "../components/landing/LandingV2";
import {
  DUO_PRICE,
  MAX_TEAM_MEMBERS,
  SOLO_PRICE,
  TEAM_PRICE,
  TRIAL_DAYS,
} from "../lib/plans";
import { SUPPORT_WHATSAPP } from "../lib/legal";
import LangToggle from "../components/ui/LangToggle";
import { tr, trx } from "../lib/i18n";
import { publicBase } from "../lib/publicUrl";


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
  const siteUrl = publicBase();
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

const pillars = [
  { n: tr("٠١"), k: tr("وضوح"), t: tr("لكل مهمة صاحب وموعد."), d: tr("انتهى سؤال «مين عليه هذا الجزء؟». كل بند من الاجتماع يصير مهمة باسم صاحبها.") },
  { n: tr("٠٢"), k: tr("عدالة"), t: tr("العبء موزّع، والجهد ظاهر."), d: tr("ترون من يحمل أكثر من طاقته ومن يقدر يساعد، مع تقرير مساهمة جاهز للمشرف/ة.") },
  { n: tr("٠٣"), k: tr("جاهزية"), t: tr("الأوراق الرسمية، بقوالب عربية."), d: tr("الاستبيان والموافقة المستنيرة وخطاب الجهة، تتعبأ ببيانات بحثكم وتنزّل Word.") },
];

const HERO_STUDENTS_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3DcLf2tK7FaVBL9vPr6KijocE5E/hf_20261023_175737_302ddc3a-e909-4c3d-bb47-1e307440dab7.mp4";

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const waRef = useRef<HTMLAnchorElement>(null);
  useScrollFx(rootRef);
  useWhatsAppAvoid(waRef);
  return (
    <div ref={rootRef} className="relative min-h-screen overflow-x-clip bg-[#0B0806] text-[#F7EFE6]">
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

      {/* ================= المزايا ================= */}
      <FeaturesBento />

      {/* ================= المشاكل ================= */}
      <Problems />

      {/* ================= يشتغل مع أدواتكم ================= */}
      <Integrations />

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

      {/* ================= الأسعار ================= */}
      <PricingV2 />

      {/* ================= الأسئلة ================= */}
      <FaqV2 faqs={faqs} />

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
        ref={waRef}
        href={`https://wa.me/${SUPPORT_WHATSAPP}`}
        target="_blank"
        rel="noreferrer"
        aria-label={tr("تواصلوا معنا عبر واتساب")}
        className="ld-glass fixed bottom-7 z-20 transition-[opacity,transform] duration-200 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#2FBF6B]/90 shadow-[0_12px_30px_rgba(47,191,107,0.4)] start-7"
      >
        <MessageCircle size={26} className="text-[#06210F]" strokeWidth={2} />
      </a>
    </div>
  );
}
