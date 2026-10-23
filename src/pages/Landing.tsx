import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Copy, MessageCircle } from "lucide-react";
import Logo from "../components/Logo";
import WelcomeVoice from "../components/WelcomeVoice";
import InstallAppButton from "../components/InstallAppButton";
import PlanComparison from "../components/PlanComparison";
import { AI_PRICE, BASIC_PRICE, FOUNDER_AI_PRICE, aiFeatures, basicHighlights } from "../lib/plans";
import { SUPPORT_WHATSAPP } from "../lib/legal";

const TEAM_SIZE = 5;

const font = "font-display";
const glassBtn = "ld-btn ld-glass rounded-full border border-white/20 bg-white/[0.08] px-7 py-3.5 text-[17px] text-white";
/** الزر الأبيض الدافئ بدائرة سهم — الزر الرئيسي بكل الصفحة */
function CtaButton({ children, big = false }: { children: React.ReactNode; big?: boolean }) {
  return (
    <Link
      to="/login"
      className={`ld-btn inline-flex items-center gap-3.5 rounded-full bg-[#F6F1EC] font-semibold text-[#1A0F00] shadow-[0_18px_50px_rgba(255,120,0,0.35)] ${
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
    a: `أكيد، السعر لكل شخص (${BASIC_PRICE} ريال Basic، أو ${AI_PRICE} ريال AI)، فتقدرون تضيفون أو تحذفون أعضاء ويتغيّر السعر تلقائيًا حسب عدد فريقكم.`,
  },
  {
    q: "لو واجهنا مشكلة أو سؤال، كيف الدعم؟",
    a: "تراسلوننا مباشرة من داخل التطبيق أو عبر التواصل المتاح، ونرد عليكم خلال نفس اليوم غالبًا.",
  },
];


const pillars = [
  { n: "٠١", k: "وضوح", t: "لكل مهمة صاحب وموعد.", d: "انتهى سؤال «مين عليه هذا الجزء؟». كل بند من الاجتماع يصير مهمة باسم صاحبها." },
  { n: "٠٢", k: "عدالة", t: "العبء موزّع، والجهد ظاهر.", d: "ترون من يحمل أكثر من طاقته ومن يقدر يساعد، مع تقرير مساهمة جاهز للمشرف/ة." },
  { n: "٠٣", k: "جاهزية", t: "الأوراق الرسمية، بقوالب عربية.", d: "الاستبيان والموافقة المستنيرة وخطاب الجهة، تتعبأ ببيانات بحثكم وتنزّل Word." },
];

const sideCard =
  "ld-glass hidden shrink-0 flex-col justify-between rounded-[30px] border border-white/20 bg-gradient-to-br from-white/[0.16] to-orange-400/10 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.45)] md:flex";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#080808] text-[#F6F1EC]">
      <div aria-hidden className="ld-grain absolute inset-0 z-[9]" />

      {/* ================= HERO ================= */}
      <section className="relative isolate min-h-[820px] overflow-hidden bg-[#260600] md:min-h-[940px]">
        <div aria-hidden className="ld-breath absolute top-[120px] h-[720px] w-[720px] rounded-full bg-[#E8400A] opacity-[0.85] blur-[90px] end-[8%]" />
        <div aria-hidden className="ld-breath absolute top-[300px] h-[380px] w-[460px] rounded-full bg-[#FFB444] blur-[110px] end-[16%]" />
        <div aria-hidden className="absolute top-[380px] h-[240px] w-[300px] rounded-full bg-[#FFE27A] opacity-90 blur-[70px] end-[20%]" />
        {/* على الجوال الصورة تقعد بالنص السفلي تحت الكلام عشان الشخص ما يختفي ورا العنوان */}
        <picture>
          <source media="(max-width: 767px)" srcSet="/landing/hero-m.webp" />
          <img
            src="/landing/hero.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-x-0 bottom-0 h-[58%] w-full object-cover object-[25%_center] md:inset-0 md:h-full md:object-left"
          />
        </picture>
        <div aria-hidden className="absolute inset-x-0 top-[36%] h-52 bg-gradient-to-b from-[#260600] via-[#260600]/70 to-transparent md:hidden" />
        <div
          aria-hidden
          className="absolute inset-0 hidden md:block"
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
            <a href="#how" className="rounded-full bg-white/[0.12] px-5 py-2">المنصّة</a>
            <a href="#supervisor" className="rounded-full px-5 py-2 text-[#D9CFC6] hover:text-white">المشرف/ة</a>
            <a href="#pricing" className="rounded-full px-5 py-2 text-[#D9CFC6] hover:text-white">الباقات</a>
            <a href="#faq" className="rounded-full px-5 py-2 text-[#D9CFC6] hover:text-white">أسئلة</a>
          </div>
          <div className="flex items-center gap-2">
            <WelcomeVoice />
            <span className="hidden lg:inline-flex">
              <InstallAppButton />
            </span>
            <Link to="/login" className="px-4 py-2.5 text-[15px] text-[#D9CFC6] hover:text-white">دخول</Link>
            <Link to="/login" className="ld-btn rounded-full bg-[#F6F1EC] px-[22px] py-2.5 text-[15px] font-semibold text-[#1A0F00]">ابدأوا</Link>
          </div>
        </nav>

        <div className="relative z-[3] mx-auto max-w-[1280px] px-6 pt-20 sm:px-9 md:pt-[130px]">
          <div className="max-w-[600px]">
            <div className="ld-glass inline-block rounded-full border border-white/[0.16] bg-white/[0.08] px-[18px] py-[7px] text-sm text-[#F1D9C4]">
              لفِرَق بحوث التخرّج
            </div>
            <h1 className={`${font} mt-7 text-[52px] font-extrabold leading-[1.2] tracking-[-1px] md:text-[76px]`}>
              بحث التخرّج،
              <br />
              <span className="bg-gradient-to-l from-[#FFE3A3] to-[#FFB444] bg-clip-text text-transparent">بلا فوضى.</span>
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg font-light text-[#E6DBD1] [text-shadow:0_2px_18px_rgba(0,0,0,0.55)] md:text-[21px]">
              مساحة واحدة تجمع فريقكم ومشرفكم وكل مراحل البحث، من أول فكرة حتى يوم التسليم.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <CtaButton>ابدأوا فريقكم</CtaButton>
              <a href="#how" className={glassBtn}>شاهدوا كيف يعمل</a>
            </div>
            <p className="mt-5 text-sm text-[#BDAFA3]">
              تجربة مجانية ٧ أيام كاملة المزايا · الباقات تبدأ من {BASIC_PRICE} ريال شهريًا لكل عضو
            </p>
          </div>
        </div>
      </section>

      {/* ================= COVERFLOW ================= */}
      <section id="how" className="relative scroll-mt-4 overflow-hidden px-6 pb-[110px] pt-10">
        <div aria-hidden className="absolute start-1/2 top-10 h-[560px] w-[1000px] -translate-x-1/2 rounded-full blur-[20px]" style={{ background: "radial-gradient(ellipse,rgba(255,107,0,.28),rgba(0,0,0,0) 65%)" }} />
        <div className="relative mx-auto mb-14 max-w-[640px] text-center">
          <div className="text-[15px] font-semibold text-[#FF9A3C]">كل ما يحتاجه فريقكم</div>
          <h2 className={`${font} mt-2.5 text-[34px] font-extrabold leading-[1.35] md:text-[46px]`}>أدوات كثيرة. منصّة واحدة.</h2>
        </div>

        <div className="relative flex min-h-[430px] items-center justify-center" style={{ perspective: "1800px" }}>
          {/* far right (RTL start) */}
          <div className={`${sideCard} h-[300px] w-[210px] justify-end opacity-55 -me-[50px]`} style={{ transform: "rotateY(-28deg) scale(.8)" }}>
            <div className={`${font} text-lg font-semibold`}>الإحصاء</div>
            <div className="text-[13px] text-[#CDBFB3]">نتائج مكتوبة وجاهزة</div>
          </div>
          <div className={`${sideCard} z-[1] h-[350px] w-[250px] -me-10`} style={{ transform: "rotateY(-18deg) scale(.9)" }}>
            <div className="space-y-2">
              <div className="h-2.5 w-[70%] rounded-full bg-white/25" />
              <div className="flex items-center gap-2 rounded-xl bg-black/25 p-2"><span className="h-2 w-2 rounded-full bg-[#FFB444]" /><span className="text-xs">قرار: اعتماد المحاور</span></div>
              <div className="flex items-center gap-2 rounded-xl bg-black/25 p-2"><span className="h-2 w-2 rounded-full bg-[#FFB444]" /><span className="text-xs">مهمة: مها · قبل الأحد</span></div>
            </div>
            <div><div className={`${font} text-[19px] font-semibold`}>الاجتماعات</div><div className="text-[13px] text-[#CDBFB3]">قرارات لا تضيع في القروب</div></div>
          </div>

          {/* center */}
          <div
            className="ld-glass ld-float relative z-[3] flex h-[420px] w-[290px] shrink-0 flex-col justify-between rounded-[34px] border border-[#FFDCAA]/40 p-7 md:w-[310px]"
            style={{
              background: "linear-gradient(165deg,rgba(255,180,68,.35),rgba(255,107,0,.18) 40%,rgba(30,12,4,.75))",
              boxShadow: "0 50px 100px rgba(0,0,0,.55),0 0 80px rgba(255,107,0,.25),inset 0 1px 0 rgba(255,240,210,.35)",
            }}
          >
            <div className="flex items-center justify-between"><span className="text-[13px] text-[#F1D9C4]">رحلة البحث</span><span className="rounded-full bg-black/30 px-2.5 py-[3px] text-xs">٣ / ٤</span></div>
            <div className="flex h-[170px] w-[170px] items-center justify-center self-center rounded-full shadow-[0_0_60px_rgba(255,180,68,0.35)]" style={{ background: "conic-gradient(#FFE3A3 0 72%,rgba(255,255,255,.14) 0)" }}>
              <div className="flex h-[138px] w-[138px] flex-col items-center justify-center rounded-full bg-[#1E0A03]">
                <div className={`${font} text-[38px] font-extrabold leading-[1.1]`}>72%</div>
                <div className="text-xs text-[#CDBFB3]">من الطريق</div>
              </div>
            </div>
            <div><div className={`${font} text-[22px] font-extrabold`}>اجمع وحلّل</div><div className="text-sm text-[#E6DBD1]">مثال توضيحي لمرحلة بالمنصّة</div></div>
          </div>

          <div className={`${sideCard} z-[1] h-[350px] w-[250px] -ms-10`} style={{ transform: "rotateY(18deg) scale(.9)" }}>
            <div className="space-y-2.5">
              {[["س", 82, "#FFB444"], ["ل", 91, "#FFB444"], ["ع", 54, "#FF8A5C"]].map(([l, w, c]) => (
                <div key={String(l)} className="flex items-center gap-2">
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] text-xs" style={{ borderColor: String(c) }}>{l}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-white/15"><div className="h-full rounded-full" style={{ width: `${w}%`, background: String(c) }} /></div>
                </div>
              ))}
            </div>
            <div><div className={`${font} text-[19px] font-semibold`}>الفريق</div><div className="text-[13px] text-[#CDBFB3]">من أنجز، ومن يحتاج مساعدة</div></div>
          </div>
          <div className={`${sideCard} h-[300px] w-[210px] justify-end opacity-55 -ms-[50px]`} style={{ transform: "rotateY(28deg) scale(.8)" }}>
            <div className={`${font} text-lg font-semibold`}>الاستبيان</div>
            <div className="text-[13px] text-[#CDBFB3]">جاهز بموافقاته</div>
          </div>
        </div>
        <p className="relative mt-6 text-center text-xs text-[#BDAFA3]">الأمثلة بالبطاقات للتوضيح فقط.</p>
      </section>

      {/* ================= STATEMENT ================= */}
      <section
        className="relative overflow-hidden px-6 pb-[140px] pt-[150px] text-center sm:px-9"
        style={{
          background:
            "linear-gradient(180deg,#080808 0,#080808 6%,rgba(8,8,8,0) 30%),repeating-linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.05) 22px,rgba(255,255,255,0) 54px),linear-gradient(180deg,#080808 0,#3A1204 30%,#C24A0A 62%,#FF9A3C 84%,#FFE3B0 100%)",
        }}
      >
        <div className="relative mx-auto max-w-[900px]">
          <div className="text-sm tracking-[2px] text-[#F1D9C4]">فلسفتنا</div>
          <h2 className={`${font} mt-[18px] text-[40px] font-extrabold leading-[1.3] md:text-[62px]`}>Wesync لا يكتب بحثكم.</h2>
          <p className={`${font} mt-3 text-[22px] leading-[1.6] text-[#2A0E04] md:text-[30px]`}>
            يرتّب كل ما حوله،
            <br />
            لتتفرّغوا لما يهمّ فعلًا.
          </p>
        </div>
      </section>

      {/* ================= PILLARS ================= */}
      <section className="relative mx-auto max-w-[1280px] px-6 pb-16 pt-[120px] sm:px-9">
        <div className="flex flex-wrap gap-6">
          {pillars.map((p) => (
            <div key={p.n} className="min-w-[280px] flex-1 border-t border-[#FFB444]/40 pt-[26px]">
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
            <div className="min-w-[280px] flex-[1_1_420px]">
              <div className="text-sm font-semibold tracking-[0.3px] text-[#2A0E04]">ما لا تلقونه عند غيرنا</div>
              <h2 className={`${font} mb-3.5 mt-2.5 text-[38px] font-extrabold leading-[1.3] text-[#1A0F00] md:text-[48px]`}>
                مشرفكم معكم،
                <br />
                بلا حسابات.
              </h2>
              <p className="max-w-[42ch] text-[19px] text-[#2A0E04]">رابط واحد يفتح له تقدّم الفريق ومحاضر الاجتماعات، فيعتمد ويعلّق ويجاوب على أسئلتكم بضغطة.</p>
            </div>
            <div className="flex min-w-[280px] flex-[1_1_380px] flex-col gap-3.5">
              <div className="ld-glass flex items-center justify-between rounded-full border border-white/35 bg-white/[0.18] px-[22px] py-3.5 text-[#1A0F00]"><span className="font-semibold">تقدّم الفريق</span><span className="flex gap-1.5">●●●<span className="opacity-35">●●</span></span><span className="font-bold">مثال</span></div>
              <div className="ld-glass flex items-center justify-between rounded-full border border-white/35 bg-white/[0.18] px-[22px] py-3.5 text-[#1A0F00]"><span className="font-semibold">محضر الاجتماع</span><span className="rounded-full bg-[#1A0F00] px-3.5 py-1 text-sm text-[#F6F1EC]">اعتمد</span></div>
              <div className="ld-glass rounded-[28px] border border-white/20 bg-[#1A0F00]/55 px-[22px] py-[18px] text-[#F6F1EC]"><div className="text-[13px] text-[#F1D9C4]">ملاحظة المشرف/ة</div><div className="mt-0.5 text-lg">«ركّزوا على المحاور قبل الاجتماع القادم.»</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section id="pricing" className="relative mx-auto max-w-[1100px] scroll-mt-4 px-6 pb-24 pt-14 sm:px-9">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="text-[15px] font-semibold text-[#FF9A3C]">الباقات</div>
          <h2 className={`${font} mb-2 mt-2.5 text-[34px] font-extrabold md:text-[46px]`}>اختاروا ما يناسب فريقكم.</h2>
          <p className="text-[#BDAFA3]">
            الأسعار شهريًا لكل عضو — فريق من {TEAM_SIZE} أعضاء يدفع {BASIC_PRICE * TEAM_SIZE} ريال بـ Basic أو {AI_PRICE * TEAM_SIZE} ريال بـ AI. تجربة ٧ أيام كاملة المزايا لأي فريق جديد.
          </p>
        </div>

        <div className="mt-14 grid items-stretch gap-[22px] md:grid-cols-2">
          <div className="ld-glass flex flex-col gap-[22px] rounded-[34px] border border-white/[0.12] bg-white/[0.04] p-[34px]">
            <div><div className={`${font} text-[22px] font-semibold`}>Basic</div><div className="text-[15px] text-[#BDAFA3]">كل أدوات إدارة البحث، بدون ذكاء اصطناعي</div></div>
            <div className="flex items-baseline gap-2"><span className={`${font} text-[60px] font-extrabold leading-none`}>{BASIC_PRICE}</span><span className="text-[#BDAFA3]">ريال شهريًا لكل عضو</span></div>
            <Link to="/login" className="ld-btn rounded-full border border-white/20 bg-white/[0.08] p-3.5 text-center font-semibold">ابدأوا بـ Basic</Link>
            <ul className="space-y-3 border-t border-white/10 pt-5 text-[15px] text-[#E6DBD1]">
              {basicHighlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5"><Check size={15} className="mt-1 shrink-0 text-[#FFB444]" />{item}</li>
              ))}
            </ul>
          </div>

          <div
            className="ld-glass relative flex flex-col gap-[22px] rounded-[34px] border border-[#FFC882]/55 p-[34px]"
            style={{
              background: "linear-gradient(170deg,rgba(255,180,68,.3),rgba(255,107,0,.14) 35%,rgba(30,12,4,.85) 75%)",
              boxShadow: "0 40px 100px rgba(255,107,0,.28),inset 0 1px 0 rgba(255,240,210,.35)",
            }}
          >
            <span className="absolute end-[22px] top-[22px] rounded-full bg-[#F6F1EC] px-3.5 py-[5px] text-xs font-semibold text-[#1A0F00]">أول ١٥ فريق: {FOUNDER_AI_PRICE} ريال ثابتة</span>
            <div><div className={`${font} text-[22px] font-semibold`}>AI</div><div className="text-[15px] text-[#E6DBD1]">كل شي بالإضافة لمساعد بحثي ذكي</div></div>
            <div className="flex items-baseline gap-2"><span className={`${font} text-[60px] font-extrabold leading-none`}>{AI_PRICE}</span><span className="text-[#E6DBD1]">ريال شهريًا لكل عضو</span></div>
            <Link to="/login" className="ld-btn rounded-full bg-[#F6F1EC] p-[15px] text-center font-bold text-[#1A0F00] shadow-[0_14px_40px_rgba(255,140,0,0.35)]">ابدأوا تجربة AI المجانية</Link>
            <ul className="space-y-3 border-t border-white/[0.18] pt-5 text-[15px] text-[#F6F1EC]">
              <li className="text-[#F1D9C4]">كل مزايا Basic، إضافةً إلى:</li>
              {aiFeatures.map((f) => (
                <li key={f.title} className="flex items-start gap-2.5"><Check size={15} className="mt-1 shrink-0 text-[#FFE3A3]" /><span><b className="font-semibold">{f.title}</b> — {f.desc}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <details className="ld-faq mx-auto mt-10 max-w-3xl rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-4">
          <summary className="flex items-center justify-between gap-3 font-semibold">
            وش الفرق بين Basic وAI بالتفصيل؟
            <ChevronDown size={18} className="ld-faq-chev shrink-0 text-[#FFB444] transition-transform" />
          </summary>
          <div className="mt-5"><PlanComparison variant="dark" /></div>
        </details>

        <div className="mx-auto mt-8 max-w-md text-start text-sm text-white/50">
          <p className="mb-3 font-bold text-white">كيف يتم الدفع؟</p>
          <ol className="space-y-2.5">
            {["حوّلوا عبر STC Pay وأرسلوا لنا إثبات التحويل من داخل التطبيق", "نفعّل اشتراك فريقكم خلال ساعة كحد أقصى", "الدفع المباشر بالبطاقة قريبًا"].map((step, i) => (
              <li key={step} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFB444]/15 text-[11px] font-bold text-[#FFB444]">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="relative mx-auto max-w-[820px] scroll-mt-4 px-6 pb-20 pt-10 sm:px-9">
        <h2 className={`${font} mb-8 text-center text-[34px] font-extrabold md:text-[40px]`}>قبل ما تبدأون</h2>
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
        <div className="relative">
          <h2 className={`${font} text-[38px] font-extrabold leading-[1.3] md:text-[60px]`}>
            الليلة الأخيرة قبل التسليم؟
            <br />
            <span className="font-normal">خلّوها ليلة عادية.</span>
          </h2>
          <p className="mx-auto mb-9 mt-[18px] max-w-xl text-lg font-light text-[#E6DBD1] md:text-xl">ابدأوا اليوم، وادعوا فريقكم ومشرفكم في دقيقة.</p>
          <CtaButton big>ابدأوا فريقكم</CtaButton>
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-[1280px] border-t border-white/10 px-6 pb-12 pt-7 text-sm text-[#BDAFA3] sm:px-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className={`${font} flex items-center gap-2.5 font-semibold text-[#F6F1EC]`}><Logo size={26} /> Wesync</div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/legal/terms" className="hover:text-[#FFB444]">شروط الاستخدام</Link>
            <Link to="/legal/privacy" className="hover:text-[#FFB444]">سياسة الخصوصية</Link>
            <Link to="/legal/refund" className="hover:text-[#FFB444]">الإلغاء والاسترداد</Link>
            <Link to="/legal/contact" className="hover:text-[#FFB444]">تواصل معنا</Link>
          </nav>
          <div>© {new Date().getFullYear()} Wesync</div>
        </div>
        <ShareSiteRow />
      </footer>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}`}
        target="_blank"
        rel="noreferrer"
        aria-label="تواصلوا معنا عبر واتساب"
        className="ld-glass fixed bottom-7 z-20 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#2FBF6B]/90 shadow-[0_12px_30px_rgba(47,191,107,0.4)] start-7"
      >
        <MessageCircle size={26} className="text-[#06210F]" strokeWidth={2} />
      </a>
    </div>
  );
}
