import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, MessageCircle } from "lucide-react";
import { useWhatsAppAvoid } from "../hooks/useWhatsAppAvoid";
import { SUPPORT_WHATSAPP } from "../lib/legal";
import { faqs } from "./landingFaqs";
import { FOUNDING_TEAMS, TIER_PRICES, TRIAL_DAYS } from "../lib/plans";
import LangToggle from "../components/ui/LangToggle";
import { AppleLogo, GoogleCalendarLogo, GoogleDriveLogo } from "../components/ui/BrandLogos";
import { isEn, tr, trx } from "../lib/i18n";
import "../styles/bright.css";

/** صفحة الهبوط الفاتحة الملوّنة (موافقة المالك 2026-11-28): صور حقيقية + ألوان مكسورة + حركة.
    كل الأسعار من lib/plans. رقم التقدّم في الهيرو مكتوب عليه «مثال». */

const PH = (k: string) => `/lux/ph-${k}.webp`;
const FACE = "/lux/wesy-face.webp";

/** يظهّر العناصر [data-rise] لما توصلها الشاشة */
function useRise() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-rise]") ?? [];
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return root;
}

/** عدّاد يطلع من صفر للرقم (يتوقف لو المستخدم طالب حركة أقل) */
function useCount(to: number, ms = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + 500;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

/** إزاحة خفيفة مع السكرول للكولاج (parallax) */
function useParallax() {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(Math.min(window.scrollY, 900)));
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

const Arrow = () => (isEn ? <ArrowRight size={18} aria-hidden /> : <ArrowLeft size={18} aria-hidden />);

function WesyBubble({ text, width = 320 }: { text: string; width?: number }) {
  return (
    <div className="bl-card bl-bub" style={{ width }}>
      <img src={FACE} alt="" />
      <div>
        <b>{tr("ويسي")}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}

function MeetCard() {
  return (
    <div className="bl-card bl-meet">
      <span className="bl-ic" style={{ background: "var(--pu)" }}>{isEn ? "4" : "٤"}</span>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 15 }}>{tr("اجتماع مع المشرف/ة")}</b>
        <div className="bl-mut" style={{ fontSize: 12 }}>{tr("ويسي جهّز الأجندة · مثال")}</div>
      </div>
      <b style={{ fontSize: 13, color: "var(--or)" }}>{tr("بعد ٣ س")}</b>
    </div>
  );
}

export default function BrightLanding() {
  const root = useRise();
  const pct = useCount(29);
  const py = useParallax();
  const waRef = useRef<HTMLAnchorElement>(null);
  useWhatsAppAvoid(waRef);
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarOn(true), 50);
    const d = setTimeout(() => root.current?.classList.add("done"), 2500);
    return () => {
      clearTimeout(t);
      clearTimeout(d);
    };
  }, []);

  const prices = [
    { k: "solo" as const, n: tr("لحالك"), s: trx("الفصل {0} · السنة {1} ر.س", TIER_PRICES.solo.semester, TIER_PRICES.solo.year) },
    { k: "team" as const, n: tr("للطالب مع فريقه"), s: trx("الفصل {0} · السنة {1} ر.س", TIER_PRICES.team.semester, TIER_PRICES.team.year), on: true },
    { k: "founding" as const, n: tr("الفرق المؤسِّسة"), s: trx("لأول {0} فريق، وسعركم ثابت لين تتخرجون", FOUNDING_TEAMS) },
  ];

  return (
    <div className="bl" ref={root}>
      <div className="bl-wrap">
        <nav className="bl-nav" aria-label="Wesync">
          <Link to="/" className="bl-brand"><span className="bl-logo">W</span>Wesync</Link>
          <a className="lk" href="#feats">{tr("المميزات")}</a>
          <a className="lk" href="#how">{tr("كيف يشتغل")}</a>
          <a className="lk" href="#price">{tr("الأسعار")}</a>
          <a className="lk" href="#faq">{tr("الأسئلة")}</a>
          <span className="sp" />
          <LangToggle className="border-black/15 !bg-white !text-[#141414]" />
          <Link to="/login" className="bl-pill line" style={{ minHeight: 44 }}>{tr("دخول")}</Link>
          <Link to="/login?signup=1" className="bl-pill ink cta" style={{ minHeight: 44 }}>{tr("ابدأوا مجانًا")}</Link>
        </nav>

        {/* الهيرو */}
        <header className="bl-hero">
          <div>
            <span className="bl-kick bl-pop"><i />{tr("لفرق بحث التخرج في التمريض والصحة")}</span>
            <h1 className="bl-h1 bl-pop" style={{ marginTop: 22, animationDelay: ".1s" }}>
              {tr("بحث التخرج،")}<br />
              <span className={`bl-mark${barOn ? " in" : ""}`} style={{ ["--m" as string]: "var(--ye)" }}>{tr("بدون فوضى")}</span>
            </h1>
            <p className="bl-lead bl-pop" style={{ marginTop: 22, maxWidth: 520, animationDelay: ".25s" }}>
              {tr("فريقكم، ومشرفكم، وويسي في مكان واحد. من الفكرة لين يوم المناقشة، خطوة وحدة كل يوم.")}
            </p>
            <div className="bl-pop" style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap", animationDelay: ".4s" }}>
              <Link to="/login?signup=1" className="bl-pill or lg">{trx("ابدأوا {0} يوم مجانًا", TRIAL_DAYS)}<Arrow /></Link>
              <a href="#how" className="bl-pill line lg">{tr("شوفوه يشتغل")}</a>
            </div>
            <div className="bl-mut bl-pop" style={{ fontSize: 14, marginTop: 14, animationDelay: ".5s" }}>{tr("بدون بطاقة · المشرف/ة مجانًا دايمًا")}</div>
            <div className="bl-ints bl-pop" style={{ animationDelay: ".6s" }}>
              <span className="bl-mut" style={{ fontSize: 13, fontWeight: 700 }}>{tr("يشتغل مع")}</span>
              <span className="bl-chip"><GoogleDriveLogo size={18} />Google Drive</span>
              <span className="bl-chip"><GoogleCalendarLogo size={18} />{tr("تقويم Google")}</span>
              <span className="bl-chip"><AppleLogo size={16} />{tr("تقويم Apple")}</span>
            </div>
          </div>

          <div className="bl-col" aria-hidden>
            <div className="bl-tile a bl-pop" style={{ animationDelay: ".15s", translate: `0 ${py * -0.06}px` }}><img src={PH("purple")} alt="" style={{ objectPosition: "center 30%" }} /></div>
            <div className="bl-tile b bl-pop" style={{ animationDelay: ".35s", translate: `0 ${py * -0.12}px` }}><img src={PH("team")} alt="" style={{ objectPosition: "center 40%" }} /></div>
            <div className="bl-tile c bl-pop" style={{ animationDelay: ".55s", translate: `0 ${py * -0.18}px` }}><img src={PH("yellow")} alt="" style={{ objectPosition: "center 30%" }} /></div>
            <div className="p1 bl-pop" style={{ animationDelay: ".8s" }}>
              <div className="bl-card bl-prog bl-fl">
                <div className="bl-mut" style={{ fontSize: 13, fontWeight: 700 }}>{tr("بحثكم (مثال)")}</div>
                <div className="n">{isEn ? `${pct}%` : `${pct.toLocaleString("ar-EG")}٪`}</div>
                <div className="bl-bar"><i style={{ width: barOn ? "29%" : 0 }} /></div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{tr("الخطوة الجاية:")} <span style={{ color: "var(--pu)" }}>{tr("الفجوة البحثية")}</span></div>
              </div>
            </div>
            <div className="p2 bl-pop" style={{ animationDelay: "1.1s" }}>
              <div className="bl-fl" style={{ animationDelay: "1.4s" }}><MeetCard /></div>
            </div>
            <svg className="bl-star" viewBox="0 0 70 70"><path d="M35 4l7 22 22 7-22 7-7 22-7-22-22-7 22-7z" fill="#FF7AA8" /></svg>
            <svg className="bl-ring" viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="#3ED6A0" strokeWidth="8" strokeDasharray="40 12" /></svg>
          </div>
        </header>

        {/* المميزات الملوّنة */}
        <section id="feats" style={{ padding: "20px 0 100px" }}>
          <div style={{ textAlign: "center" }} data-rise>
            <span className="bl-kick" style={{ ["--k" as string]: "var(--pu)" }}><i />{tr("وش يسوي لكم")}</span>
            <h2 className="bl-h2" style={{ marginTop: 16 }}>
              {tr("كل اللي يحتاجه بحثكم،")}<br />
              <span className="bl-mark" style={{ ["--m" as string]: "var(--pi)" }}>{tr("في مكان واحد")}</span>
            </h2>
          </div>
          <div className="bl-feats">
            <article className="bl-feat" style={{ background: "var(--or)", color: "#fff" }} data-rise>
              <span className="bl-kick inv" style={{ alignSelf: "flex-start", ["--k" as string]: "#fff" }}><i />{tr("للفريق كامل")}</span>
              <h3>{tr("كل واحد يعرف خطوته")}</h3>
              <p>{tr("كل مهمة لها صاحب وموعد، وتنقفل بدليل. ما فيه «مين بيسوي وش؟».")}</p>
              <div className="gap" />
              <div className="pic"><img src={PH("team")} alt={tr("فريق طالبات يشتغلن على البحث")} loading="lazy" style={{ objectPosition: "center 40%" }} /></div>
            </article>
            <article className="bl-feat" style={{ background: "var(--pi)" }} data-rise data-d="1">
              <span className="bl-kick" style={{ alignSelf: "flex-start", ["--k" as string]: "var(--ink)" }}><i />{tr("للمشرفين")}</span>
              <h3>{tr("المشرف/ة يتابع كل شي بدون حساب")}</h3>
              <p>{tr("رابط واحد بالإيميل: يعتمد المحضر، ويرد على الأسئلة، ويتابع التقدّم.")}</p>
              <div className="gap" />
              <div className="pic"><img src={PH("pink")} alt={tr("مشرفة تراجع مع طالبتين")} loading="lazy" style={{ objectPosition: "center 35%" }} /></div>
              <div className="fx bl-card bl-fl" style={{ bottom: 250, insetInlineEnd: 24, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <span className="bl-ic" style={{ background: "var(--mi)", width: 32, height: 32 }}><Check size={18} /></span>
                <b style={{ fontSize: 14 }}>{tr("اعتُمد المحضر")}</b>
              </div>
            </article>
            <article className="bl-feat" style={{ background: "var(--pu)", color: "#fff" }} data-rise data-d="2">
              <span className="bl-kick inv" style={{ alignSelf: "flex-start", ["--k" as string]: "var(--ye)" }}><i />{tr("ويسي الذكي")}</span>
              <h3>{tr("مساعد يعرف بحثكم كامل")}</h3>
              <p>{tr("يدوّر الدراسات، يرتّب كلامكم، ويكتب المحضر وأنتم في الاجتماع.")}</p>
              <div className="gap" />
              <div className="pic"><img src={PH("purple")} alt={tr("طالبة تكتب بحثها")} loading="lazy" style={{ objectPosition: "center 55%" }} /></div>
              <div className="fx bl-fl" style={{ bottom: 24, insetInlineStart: 20, color: "var(--ink)", animationDelay: ".8s" }}>
                <WesyBubble width={290} text={tr("لقيت لكم ٣ دراسات جديدة عن موضوعكم. أضيفها للمكتبة؟")} />
              </div>
            </article>
          </div>
        </section>
      </div>

      {/* كيف يشتغل */}
      <section id="how" className="bl-dark">
        <div className="bl-wrap">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }} data-rise>
            <div>
              <span className="bl-kick inv" style={{ ["--k" as string]: "var(--mi)" }}><i />{tr("كيف يشتغل")}</span>
              <h2 className="bl-h2" style={{ marginTop: 16 }}>
                {tr("ثلاث خطوات،")}<br />
                <span className="bl-mark" style={{ ["--m" as string]: "var(--or)" }}>{tr("وبحثكم يمشي")}</span>
              </h2>
            </div>
            <Link to="/login?signup=1" className="bl-pill wh">{tr("جربوه مجانًا")}</Link>
          </div>
          <div className="bl-steps">
            {[
              { k: "mint", c: "var(--mi)", t: tr("اكتبوا فكرتكم"), d: tr("ويسي يحوّلها لعنوان، وأسئلة بحث، ومقترح فصل فصل."), n: isEn ? "1" : "١" },
              { k: "turq", c: "var(--tq)", t: tr("اجمعوا الدراسات"), d: tr("ابحثوا في PubMed وGoogle Scholar، وكل دراسة تنحفظ في مكتبة الفريق."), n: isEn ? "2" : "٢" },
              { k: "poster", c: "var(--pu)", t: tr("قدّموها بثقة"), d: tr("المحاضر والقرارات والإحصاء جاهزة، وويسي يدرّبكم للمناقشة."), n: isEn ? "3" : "٣" },
            ].map((s, i) => (
              <div key={s.k} className="bl-step" data-rise data-d={String(i + 1)}>
                <div className="pic" style={{ background: s.c }}>
                  <img src={PH(s.k)} alt="" loading="lazy" style={{ objectPosition: s.k === "poster" ? "center 25%" : "center 35%" }} />
                  <span className="bl-num">{s.n}</span>
                </div>
                <div style={{ padding: "24px 26px 28px" }}>
                  <div style={{ fontWeight: 900, fontSize: 28 }}>{s.t}</div>
                  <p className="bl-mut" style={{ fontSize: 16, lineHeight: 1.75, margin: "8px 0 0" }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bl-wrap">
        {/* السعر */}
        <section id="price" style={{ padding: "110px 0 40px", textAlign: "center" }}>
          <div data-rise>
            <span className="bl-kick" style={{ ["--k" as string]: "var(--ye)" }}><i />{tr("الأسعار")}</span>
            <h2 className="bl-h2" style={{ marginTop: 16 }}>
              {tr("بسعر")} <span className="bl-mark" style={{ ["--m" as string]: "var(--mi)" }}>{tr("قهوة")}</span> {tr("بالشهر")}
            </h2>
          </div>
          <div className="bl-prices">
            {prices.map((p, i) => (
              <div key={p.k} className={`bl-price${p.on ? " on" : ""}`} data-rise data-d={String(i + 1)}>
                <b style={{ fontSize: 18 }}>{p.n}</b>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
                  <span className="bl-big">{TIER_PRICES[p.k].month}</span>
                  <span className="bl-mut">{tr("ر.س للطالب بالشهر")}</span>
                </div>
                <div className="bl-mut" style={{ fontSize: 14, marginTop: 8 }}>{p.s}</div>
              </div>
            ))}
          </div>
          <div className="bl-mut" style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 22, fontSize: 14, fontWeight: 700 }} data-rise>
            <span>{trx("{0} يوم تجربة مجانية", TRIAL_DAYS)}</span>
            <span>{tr("بدون تجديد تلقائي")}</span>
            <span>{tr("المشرف/ة مجانًا دايمًا")}</span>
          </div>
        </section>

        {/* الأسئلة */}
        <section id="faq" className="bl-faq" style={{ padding: "70px 0 40px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }} data-rise>
            <span className="bl-kick" style={{ ["--k" as string]: "var(--tq)" }}><i />{tr("الأسئلة")}</span>
            <h2 className="bl-h2" style={{ marginTop: 16 }}>{tr("قبل")} <span className="bl-mark" style={{ ["--m" as string]: "var(--ye)" }}>{tr("لا تسألون")}</span></h2>
          </div>
          <div data-rise>
            {faqs.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* الختام */}
      <section className="bl-final">
        <div className="bl-wrap" style={{ width: "100%" }}>
          <div style={{ maxWidth: 620, marginInlineStart: 0 }} data-rise>
            <h2 className="bl-h2" style={{ fontSize: "clamp(46px,6vw,76px)" }}>{tr("جاهزين")}<br />{tr("تبدأون؟")}</h2>
            <p className="bl-lead" style={{ marginTop: 16 }}>{trx("{0} يوم مجانًا لكل الفريق. بدون بطاقة.", TRIAL_DAYS)}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Link to="/login?signup=1" className="bl-pill ink lg">{tr("ابدأوا مجانًا")}<Arrow /></Link>
              <Link to="/login" className="bl-pill line lg">{tr("عندي حساب")}</Link>
            </div>
          </div>
        </div>
        <div className="arch" data-rise><img src={PH("poster")} alt={tr("طالبة تعرض بحثها")} loading="lazy" /></div>
        <div className="bub bl-fl"><WesyBubble width={270} text={tr("بالتوفيق في المناقشة. أنا معكم لآخر خطوة.")} /></div>
      </section>

      <footer className="bl-wrap bl-mut" style={{ display: "flex", alignItems: "center", gap: 24, padding: "30px 24px 40px", fontSize: 14, flexWrap: "wrap" }}>
        <span className="bl-brand" style={{ color: "var(--ink)", fontSize: 18 }}><span className="bl-logo" style={{ width: 30, height: 30, fontSize: 16 }}>W</span>Wesync</span>
        <span>{tr("صُنع لطلاب التمريض في السعودية")}</span>
        <span style={{ flex: 1 }} />
        <Link to="/legal/terms">{tr("الشروط")}</Link>
        <Link to="/legal/privacy">{tr("الخصوصية")}</Link>
      </footer>

      <a
        ref={waRef}
        href={`https://wa.me/${SUPPORT_WHATSAPP}`}
        target="_blank"
        rel="noreferrer"
        aria-label={tr("تواصلوا معنا عبر واتساب")}
        className="fixed bottom-6 start-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_12px_30px_rgba(37,211,102,0.35)] transition-[opacity,transform] duration-200"
      >
        <MessageCircle size={26} className="text-[#06210F]" strokeWidth={2} />
      </a>
    </div>
  );
}
