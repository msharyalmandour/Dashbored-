import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import { useWhatsAppAvoid } from "../hooks/useWhatsAppAvoid";
import { SUPPORT_WHATSAPP } from "../lib/legal";
import { faqs } from "./landingFaqs";
import { BEST_PLAN, FOUNDING_TEAMS, MAX_TEAM_MEMBERS, PLAN_OPTIONS, TIER_PRICES, TRIAL_DAYS, perMonth, planSaving, type BillingPeriod } from "../lib/plans";
import LangToggle from "../components/ui/LangToggle";
import { tr, trx } from "../lib/i18n";
import "../styles/lux-landing.css";

/** صفحة الهبوط الفخمة: للزوار بدون تسجيل على «/». كل الأرقام من lib/plans، والشاشات لقطات حقيقية من التطبيق. */

const IMG = "/lux/";

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
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return root;
}

function Cta({ children = tr("ابدأوا مجانًا") }: { children?: React.ReactNode }) {
  return (
    <Link to="/login?signup=1" className="ll-cta">
      {children}
      <ArrowLeft size={18} className="ltr:rotate-180" aria-hidden />
    </Link>
  );
}

const TOUR = [
  { img: "home", t: tr("الرئيسية"), d: tr("أول ما تدخلون: وش المطلوب اليوم، ومين عليه، وكم باقي على التسليم. وويسي يقول لكم الخطوة الجاية.") },
  { img: "chat", t: tr("المحادثة"), d: tr("قروبين: واحد مع الدكتورة، وواحد للفريق بس. والدكتورة ما تشوف قروبكم أبد.") },
  { img: "library", t: tr("مكتبة الأدلة"), d: tr("كل الدراسات اللي لقيتوها بمكان واحد، بتصنيفها، ومراجع APA جاهزة للنسخ.") },
  { img: "team", t: tr("الفريق"), d: tr("نسبة إنجاز كل عضو، والمتأخر والمكتمل، بدون ما أحد يسأل بالقروب.") },
  { img: "supervisor", t: tr("ملاحظات الدكتورة"), d: tr("رسائلها وملاحظاتها تتحوّل لمهام واضحة لها صاحب وموعد.") },
];

const STAGES = [tr("أبحث"), tr("أكتب"), tr("أجمع وأحلل")];
const WEIGHT = [3, 4, 2];

function planFor(deadline: string, stage: number) {
  const days = deadline ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000) : 63;
  const weeks = Math.max(1, Math.ceil(days / 7));
  const left = WEIGHT.map((w, i) => (i >= stage ? w : 0));
  const sum = left.reduce((a, b) => a + b, 0);
  let start = 1;
  return STAGES.map((name, i) => {
    if (!left[i]) return { name, range: tr("خلصت"), pct: 100 };
    const n = Math.max(1, Math.round((weeks * left[i]) / sum));
    const end = i === STAGES.length - 1 ? Math.max(start, weeks) : Math.min(weeks, start + n - 1);
    const range = start >= end ? trx("الأسبوع {0}", start) : trx("الأسابيع {0}–{1}", start, end);
    start = end + 1;
    return { name, range, pct: Math.round((left[i] / sum) * 100) };
  });
}

export default function LuxLanding() {
  const root = useRise();
  const waRef = useRef<HTMLAnchorElement>(null);
  useWhatsAppAvoid(waRef);
  const [shot, setShot] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [stage, setStage] = useState(0);
  const [members, setMembers] = useState(4);
  const [split, setSplit] = useState(4);
  const [group, setGroup] = useState(true);
  const [period, setPeriod] = useState<BillingPeriod>(BEST_PLAN);
  const plan = useMemo(() => planFor(deadline, stage), [deadline, stage]);
  const share = useMemo(() => {
    const lines = plan.map((p) => `${p.name}: ${p.range}`).join("\n");
    return `https://wa.me/?text=${encodeURIComponent(`${tr("خطة فريقنا للبحث")}\n${lines}\n${tr("من Wesync")}`)}`;
  }, [plan]);
  const cur = TOUR[shot];

  return (
    <div className="ll" ref={root}>
      {/* ٠١ الهيرو */}
      <header className="ll-hero">
        <div className="ll-wrap">
          <nav className="ll-nav" aria-label={tr("التنقل")}>
            <div className="ll-logo">
              Wesync <small>{tr("ويسينك")}</small>
            </div>
            <div className="ll-navlinks">
              <a href="#what">{tr("وش هو؟")}</a>
              <a href="#tour">{tr("الجولة")}</a>
              <a href="#price">{tr("السعر")}</a>
              <a href="#faq">{tr("الأسئلة")}</a>
            </div>
            <div className="flex items-center gap-2">
              <LangToggle />
              <Link to="/login" className="ll-login">
                {tr("دخول")}
              </Link>
            </div>
          </nav>
          <div className="ll-hero-grid">
            <div data-rise>
              <div className="ll-kicker">
                <i aria-hidden />
                {tr("لفرق بحوث التخرّج في التمريض")}
              </div>
              <h1 className="ll-h1">
                {tr("بحث التخرّج،")}
                <span>{tr("بدون قروب ضايع.")}</span>
              </h1>
              <p className="ll-hero-p">{tr("فريقكم ومهامكم ودراساتكم والدكتورة، بمكان واحد هادئ. ويسي يرتّب لكم يومكم، وأنتم تكتبون.")}</p>
              <div className="ll-hero-act">
                <Cta />
                <a href="#tour" className="ll-link">
                  {tr("شوفوا من جوّا")}
                </a>
              </div>
              <div className="ll-trust">
                <span>{tr("الدكتورة مجانًا")}</span>
                <span>{trx("{0} يوم تجربة مجانية", TRIAL_DAYS)}</span>
                <span>{tr("بدون تجديد تلقائي")}</span>
              </div>
            </div>
            <div className="ll-hero-fig" data-rise>
              <div className="ll-arch">
                <img src={`${IMG}w1.webp`} alt={tr("ويسي واقف يسلّم عليكم")} />
              </div>
              <div className="ll-bubble">
                <small>{tr("ويسي · ٨:٠٠ الصبح")}</small>
                {tr("«صباح الخير يا فريق. عندنا خطوة وحدة اليوم، وأنا متابعها معكم.»")}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ٠٢ الإحساس */}
        <section className="ll-sec text-center">
          <div className="ll-wrap" data-rise>
            <div className="ll-eb">{tr("الإحساس اللي تعرفونه")}</div>
            <h2 className="ll-h2">
              {tr("كل فريق تمريض مرّ")} <b>{tr("بهذا الأسبوع.")}</b>
            </h2>
            <p className="ll-p mx-auto">{tr("الملفات بكل مكان، والدكتورة تسأل وين وصلتوا، والتسليم يقرّب، وما أحد متأكد مين عليه الجزء الجاي.")}</p>
          </div>
          <div className="ll-arc" data-rise>
            <img src={`${IMG}walk.webp`} alt={tr("طالب يمشي مستعجل وقت الغروب")} loading="lazy" />
            <img src={`${IMG}write.webp`} alt={tr("طالب يكتب ملاحظاته")} loading="lazy" />
            <img src={`${IMG}books.webp`} alt={tr("طالب يحمل كتبه في المكتبة")} loading="lazy" />
            <img src={`${IMG}coffee.webp`} alt={tr("طالب يقرأ مع قهوته")} loading="lazy" />
            <img src={`${IMG}pair.webp`} alt={tr("زميلين يشتغلون على لابتوب")} loading="lazy" />
          </div>
        </section>

        {/* ٠٣ وش هو */}
        <section id="what" className="ll-sec ll-cream">
          <div className="ll-wrap">
            <div className="ll-what-top" data-rise>
              <div>
                <div className="ll-eb">{tr("وش هو Wesync؟")}</div>
                <h2 className="ll-h2">
                  {tr("منصة واحدة لفريق البحث:")} <b>{tr("المهام، الدراسات، الكتابة، والدكتورة.")}</b>
                </h2>
              </div>
              <div className="ll-what-side">
                <div className="ll-arch">
                  <img src={`${IMG}w4.webp`} alt={tr("ويسي ماسك قائمة المهام")} loading="lazy" />
                </div>
                <p className="m-0">{tr("مو أداة تكتب عنكم. Wesync يرتّب الشغل حولكم، عشان وقتكم يروح للبحث نفسه.")}</p>
              </div>
            </div>
            <div className="ll-trio" data-rise>
              <div>
                <div className="k">{tr("ترتّبون")}</div>
                <div className="t">{tr("كل مهمة لها صاحب وموعد")}</div>
                <div className="d">{tr("ما فيه «مين بيسوي؟». ويسي يذكّر قبل الموعد بهدوء، بدون إزعاج.")}</div>
              </div>
              <div>
                <div className="k">{tr("تكتبون")}</div>
                <div className="t">{tr("الأقسام والمراجع بمكان واحد")}</div>
                <div className="d">{tr("الدراسات اللي لقيتوها، ملخصاتها، ومراجع APA جاهزة.")}</div>
              </div>
              <div>
                <div className="k">{tr("الدكتورة تتابع")}</div>
                <div className="t">{tr("رابط واحد، بدون حساب مدفوع")}</div>
                <div className="d">{tr("تشوف وين وصلتوا وتعلّق على القسم نفسه.")}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ٠٤ الرحلة */}
        <section className="ll-sec">
          <div className="ll-wrap">
            <div data-rise>
              <div className="ll-eb">{tr("رحلة البحث")}</div>
              <h2 className="ll-h2">
                {tr("ثلاث مراحل.")} <b>{tr("نفس اللي داخل المنصة.")}</b>
              </h2>
            </div>
            <div className="ll-steps" data-rise>
              {STAGES.map((s, i) => (
                <div key={s} className={i === 0 ? "on" : undefined}>
                  <small>{[tr("المرحلة الأولى"), tr("المرحلة الثانية"), tr("المرحلة الثالثة")][i]}</small>
                  <b>{s}</b>
                </div>
              ))}
            </div>
            <div className="ll-journey" data-rise>
              <div className="ll-tools">
                <div className="ll-eb">{tr("أدوات «أبحث»")}</div>
                <div>
                  <b>{tr("مكتبة الأدلة")}</b>
                  <span>{tr("الدراسات اللي لقيتوها بمكان واحد، ومين أضاف كل وحدة.")}</span>
                </div>
                <div>
                  <b>{tr("مراجعة الأدبيات")}</b>
                  <span>{tr("ملخص كل دراسة: وش سوّت، ووش طلعت فيه.")}</span>
                </div>
                <div>
                  <b>{tr("المراجع APA")}</b>
                  <span>{tr("تنضاف لحالها، بدون ترتيب يدوي آخر ليلة.")}</span>
                </div>
              </div>
              <div className="ll-shot">
                <img src={`${IMG}tasks.webp`} alt={tr("شاشة المهام الحقيقية من المنصة")} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* ٠٥ الجولة */}
        <section id="tour" className="ll-sec ll-dark2">
          <div className="ll-wrap">
            <div data-rise>
              <div className="ll-eb">{tr("من جوّا")}</div>
              <h2 className="ll-h2">
                {tr("جولة بـ ٣٠ ثانية.")} <b>{tr("شاشات حقيقية.")}</b>
              </h2>
            </div>
            <div className="ll-tour" data-rise>
              <div>
                <div className="ll-tour-n">{trx("{0} / {1}", shot + 1, TOUR.length)}</div>
                <div className="ll-tour-t">{cur.t}</div>
                <p className="ll-tour-d" aria-live="polite">
                  {cur.d}
                </p>
                <div className="ll-dots" role="tablist" aria-label={tr("شاشات الجولة")}>
                  {TOUR.map((s, i) => (
                    <button key={s.img} type="button" role="tab" aria-current={i === shot} aria-selected={i === shot} aria-label={s.t} onClick={() => setShot(i)}>
                      <i />
                    </button>
                  ))}
                </div>
                <div className="ll-tour-act">
                  <button type="button" className="ws-btn-secondary" onClick={() => setShot((shot + 1) % TOUR.length)}>
                    {shot === TOUR.length - 1 ? tr("من البداية") : tr("التالي")}
                  </button>
                </div>
              </div>
              <div className="ll-phone">
                <img src={`${IMG}tour-${cur.img}.webp`} alt={tr("شاشة {0} الحقيقية من التطبيق", cur.t)} />
                <p className="m-0 mt-2 text-center text-xs text-ws-muted">{tr("لقطة من التطبيق ببيانات تجريبية")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ٠٦ الخطة */}
        <section className="ll-sec">
          <div className="ll-wrap ll-plan">
            <div data-rise>
              <div className="ll-eb">{tr("جرّبوا قبل التسجيل")}</div>
              <h2 className="ll-h2">
                <b>{tr("خطتكم بدقيقة.")}</b>
              </h2>
              <p className="ll-p">{tr("ثلاث إجابات، وتطلع لكم خطة الأسابيع الباقية. ترسلونها لقروبكم بضغطة.")}</p>
              <div className="ll-form">
                <label>
                  <span>{tr("موعد التسليم")}</span>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </label>
                <div>
                  <span className="lab">{tr("مرحلتكم الحين")}</span>
                  <div className="ll-seg">
                    {STAGES.map((s, i) => (
                      <button key={s} type="button" aria-pressed={stage === i} onClick={() => setStage(i)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="lab">{tr("كم واحد أنتم؟")}</span>
                  <div className="ll-seg">
                    {[2, 3, 4, 5].filter((n) => n <= MAX_TEAM_MEMBERS).map((n) => (
                      <button key={n} type="button" aria-pressed={members === n} onClick={() => setMembers(n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="ws-card ll-plancard" data-rise>
              <div className="ll-arch" aria-hidden>
                <img src={`${IMG}w5.webp`} alt="" loading="lazy" />
              </div>
              <h3>{tr("خطة فريقكم")}</h3>
              <div className="sub">{deadline ? trx("تنحسب من إجاباتكم · {0} أعضاء", members) : tr("اختاروا موعد التسليم وتنحسب لكم")}</div>
              {plan.map((p) => (
                <div key={p.name} className="ll-bar">
                  <div className="row">
                    <b>{p.name}</b>
                    <span>{p.range}</span>
                  </div>
                  <div className="track">
                    <div className="fill" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="foot">
                <span>{tr("تقدير مبدئي، وداخل التطبيق تتعدّل حسب شغلكم")}</span>
                <a href={share} target="_blank" rel="noopener noreferrer" className="ws-btn-secondary">
                  {tr("أرسلوها لقروبكم")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ٠٧ المقارنة */}
        <section className="ll-sec ll-dark2">
          <div className="ll-wrap">
            <div data-rise>
              <div className="ll-eb">{tr("الفرق")}</div>
              <h2 className="ll-h2">
                {tr("قروب الواتساب،")} <b>{tr("ولا Wesync؟")}</b>
              </h2>
            </div>
            <div className="ll-vs" data-rise>
              <div className="them">
                <h3>{tr("قروب الواتساب")}</h3>
                <ul className="m-0 list-none p-0">
                  <li>{tr("«مين بيسوي المراجع؟» ضايعة بين الرسائل")}</li>
                  <li>{tr("«ارفعوا الملف مرة ثانية»")}</li>
                  <li>{tr("الموعد؟ أحد يتذكر، أو لا")}</li>
                  <li>{tr("ملاحظات الدكتورة متفرقة")}</li>
                  <li>{tr("كل واحد يكتب المراجع بطريقته")}</li>
                </ul>
              </div>
              <div className="us">
                <h3>
                  Wesync
                  <img src={`${IMG}w2.webp`} alt="" aria-hidden loading="lazy" />
                </h3>
                <ul className="m-0 list-none p-0">
                  {[tr("كل مهمة لها صاحب وموعد"), tr("ملف واحد، آخر نسخة دايمًا"), tr("ويسي يذكّركم قبلها بيوم"), tr("تعليقها على القسم نفسه"), tr("مراجع APA جاهزة")].map((t) => (
                    <li key={t}>
                      <Check size={18} aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ٠٨ الدكتورة */}
        <section className="ll-sec">
          <div className="ll-wrap ll-doc">
            <div data-rise>
              <div className="ll-eb">{tr("للدكتورة")}</div>
              <h2 className="ll-h2">
                {tr("الدكتورة ما تدفع.")}
                <br />
                <span>{tr("ولا تحتاج تسجّل.")}</span>
              </h2>
              <p className="ll-p">{tr("ترسلون لها رابط واحد: تشوف وين وصلتوا، وتعلّق على القسم نفسه. بدون إيميلات، وبدون «النسخة الأخيرة ٣».")}</p>
            </div>
            <div className="ll-docfig" data-rise>
              <div className="ll-arch">
                <img src={`${IMG}books.webp`} alt={tr("طالب في المكتبة يحمل كتبه")} loading="lazy" />
              </div>
              <div className="ll-note">
                <small>{tr("تعليق من الدكتورة · مثال")}</small>
                {tr("«المنهجية واضحة، زيدوا مصدرين في الإطار النظري.»")}
              </div>
            </div>
          </div>
        </section>

        {/* ٠٩ السعر: لحالك أو مع فريقك، وثلاث مدد — كلها من lib/plans */}
        <section id="price" className="ll-sec ll-cream ll-price">
          <div className="ll-wrap" data-rise>
            <div className="ll-eb">{tr("السعر")}</div>
            <h2 className="ll-h2">
              {tr("للطالب،")} <b>{tr("والوكيل داخل السعر.")}</b>
            </h2>
            <div className="ll-switch" role="group" aria-label={tr("لمين الاشتراك؟")}>
              <button type="button" aria-pressed={!group} onClick={() => setGroup(false)}>
                {tr("لحالي")}
              </button>
              <button type="button" aria-pressed={group} onClick={() => setGroup(true)}>
                {tr("مع فريقي")}
              </button>
            </div>
            {group && (
              <div className="ll-split">
                <span>{tr("كم واحد أنتم؟")}</span>
                <div className="ll-seg">
                  {[2, 3, 4, 5].filter((n) => n <= MAX_TEAM_MEMBERS).map((n) => (
                    <button key={n} type="button" aria-pressed={split === n} onClick={() => setSplit(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {group && (
              <p className="ll-founding">
                <b>{trx("سعر الفرق المؤسِّسة: أول {0} فريق", FOUNDING_TEAMS)}</b>
                {trx("{0} ر.س للطالب بالشهر بدل {1}، ثابت لكم طول بحثكم.", TIER_PRICES.founding.month, TIER_PRICES.team.month)}
              </p>
            )}
            <div className="ll-plans ll-plans-3">
              {PLAN_OPTIONS.map((p) => {
                const tier = group ? "founding" : "solo";
                const price = TIER_PRICES[tier][p.id];
                const best = p.id === BEST_PLAN;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={period === p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`ll-planbox${best ? " best" : ""}${period === p.id ? " on" : ""}`}
                  >
                    <div className="k">
                      {p.id === "month" ? tr("شهري") : p.id === "semester" ? tr("فصل · 4 شهور") : tr("السنة الدراسية · 9 شهور")}
                      {p.id !== "month" && <em>{trx("توفّرون {0} ر.س", planSaving(p.id, tier))}</em>}
                    </div>
                    <div className="ll-big">
                      {group && p.id === "month" && <s>{TIER_PRICES.solo.month}</s>}
                      <b>{price}</b>
                      <span>{tr("ر.س للطالب")}</span>
                    </div>
                    <div className="tot">
                      {p.id === "month" ? tr("بالشهر") : trx("يعني {0} بالشهر", perMonth(p.id, tier))}
                      {group && <> · {trx("الفريق: {0} ر.س", price * split)}</>}
                    </div>
                  </button>
                );
              })}
            </div>
            <ul className="ll-incl">
              {[tr("الوكيل: يقرا الدراسات ويلخّصها ويرتّب المراجع"), tr("المهام والمحادثة والملفات للفريق"), tr("رابط الدكتورة، وهي مجانًا دايمًا")].map((t) => (
                <li key={t}>
                  <Check size={16} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <div className="ll-terms">
              <span>{trx("{0} يوم تجربة مجانية", TRIAL_DAYS)}</span>
              <span>{tr("بدون تجديد تلقائي")}</span>
              <span>{tr("سعرك ثابت لين تتخرجون")}</span>
              {group && <span>{trx("بعد أول {0} فريق: {1} ر.س للطالب بالشهر", FOUNDING_TEAMS, TIER_PRICES.team.month)}</span>}
            </div>
            <Cta />
          </div>
        </section>

        {/* ١٠ الأسئلة */}
        <section id="faq" className="ll-sec">
          <div className="ll-wrap ll-faq">
            <div data-rise>
              <div className="ll-eb">{tr("الأسئلة")}</div>
              <h2 className="ll-h2">
                {tr("قبل")} <b>{tr("لا تسألون.")}</b>
              </h2>
              <div className="ll-arch">
                <img src={`${IMG}w7.webp`} alt={tr("ويسي مرتاح مع قهوته بالليل")} loading="lazy" />
              </div>
            </div>
            <div data-rise>
              {faqs.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ١١ الختام */}
        <section className="ll-close">
          <img src={`${IMG}door.webp`} alt="" aria-hidden loading="lazy" />
          <div className="ll-wrap" data-rise>
            <div className="max-w-[640px] me-auto">
              <h2>{tr("خلّوا القروب للسوالف.")}</h2>
              <div className="s">{tr("والبحث في Wesync.")}</div>
              <Cta />
            </div>
          </div>
        </section>
      </main>

      <footer className="ll-wrap ll-foot">
        <span>{tr("Wesync · صُنع لطلاب التمريض في السعودية")}</span>
        <span className="flex gap-4">
          <Link to="/legal/terms">{tr("الشروط")}</Link>
          <Link to="/legal/privacy">{tr("الخصوصية")}</Link>
        </span>
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
