import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Calendar, Check, CreditCard, Gauge, ShieldCheck, Smartphone, UserPlus, Users } from "lucide-react";
import clsx from "clsx";
import { GaugeSvg, JourneyMini, type JourneyStep } from "../home/GlassHome";
import AgentWave from "../ui/AgentWave";
import { GmailLogo, GoogleCalendarLogo, GoogleDriveLogo, WhatsAppLogo } from "../ui/BrandLogos";
import PlanComparison from "../PlanComparison";
import {
  AI_ADDON_FOUNDER,
  AI_ADDON_SOLO,
  AI_ADDON_TEAM,
  DUO_PRICE,
  MAX_TEAM_MEMBERS,
  SOLO_PRICE,
  TEAM_PRICE,
  TRIAL_DAYS,
  aiFeatures,
  basicHighlights,
  memberShare,
  teamMonthlyTotal,
} from "../../lib/plans";
import { SUPPORT_WHATSAPP } from "../../lib/legal";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { tr, trx } from "../../lib/i18n";

/* أقسام صفحة الهبوط الجديدة. نفس حركة الظهور بالصفحة (data-fx → .ld-in) — مرة وحدة لما يظهر القسم. */

const FOUNDER_SEATS = 15;
const fx = (d = 0) => ({ "data-fx": "", style: { ["--d" as string]: `${d}ms` } as CSSProperties });

function SectionHead({ badge, title, desc, children }: { badge: string; title: ReactNode; desc?: ReactNode; children?: ReactNode }) {
  return (
    <div {...fx()} className="ld-fx mx-auto max-w-[760px] text-center">
      <span className="lv-badge">{badge}</span>
      <h2 className="lv-title">{title}</h2>
      {desc && <p className="lv-desc">{desc}</p>}
      {children}
    </div>
  );
}

/** «بداية» أول كلمتين bold من سطر الميزة */
function boldLead(text: string) {
  const parts = text.split(" ");
  return (
    <>
      <b className="font-bold text-[#F7EFE6]">{parts.slice(0, 2).join(" ")}</b> {parts.slice(2).join(" ")}
    </>
  );
}

// ───────────────────────────── ١) المزايا (Bento) ─────────────────────────────

const demoJourney: JourneyStep[] = [
  { key: "topic", label: tr("الموضوع"), state: "done", long: tr("خلص ✓"), short: "✓", to: "/" },
  { key: "proposal", label: tr("المقترح"), state: "now", long: tr("٥ من ٧ أقسام"), short: tr("٥ من ٧"), to: "/" },
  { key: "lit", label: tr("الأدبيات"), state: "todo", long: tr("٢ من ١٢ دراسة"), short: tr("٢ من ١٢"), to: "/" },
  { key: "method", label: tr("المنهجية"), state: "todo", long: tr("ما بدأت"), short: "—", to: "/" },
  { key: "deliver", label: tr("التسليم"), state: "deliver", long: tr("٢١ نوفمبر"), short: tr("٢١ نوف"), to: "/" },
];

function DemoTodo() {
  const rows = [
    { t: tr("أسئلة البحث"), kind: "done", due: tr("خلصت ✓"), c: "#7FE0A6", av: tr("م"), bg: "linear-gradient(160deg,#FFE08A,#FFB444)" },
    { t: tr("صياغة هدف الدراسة"), kind: "late", due: tr("متأخرة يومين"), c: "#FF8A7A", av: tr("أ"), bg: "linear-gradient(160deg,#FFC27A,#FF8A2A)" },
    { t: tr("كتابة خلفية البحث"), kind: "today", due: tr("اليوم"), c: "#FFC777", av: tr("س"), bg: "linear-gradient(160deg,#FFF3E2,#E7D3BC)" },
  ];
  return (
    <div aria-hidden className="mt-3">
      <div className="hg-prog !mt-0">
        <div className="hg-tr">
          <i style={{ width: "33%" }} />
        </div>
        <span className="whitespace-nowrap text-[13px] text-[#ABA095]">
          <b className="hg-num text-[#EAE3DC]">1</b> {tr("من")} <b className="hg-num text-[#EAE3DC]">3</b> {tr("خلصت")}
        </span>
      </div>
      <ul className="m-0 mt-2 list-none p-0">
        {rows.map((r) => (
          <li key={r.t} className={clsx("hg-td !py-2.5", r.kind === "late" && "late", r.kind === "done" && "done")}>
            <span className="hg-cb">
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="hg-tt min-w-0 flex-1">{r.t}</span>
            <span className="hg-due" style={{ color: r.c }}>
              {r.due}
            </span>
            <span className="hg-tav" style={{ background: r.bg }}>
              {r.av}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeaturesBento() {
  return (
    <section id="how" className="lv-sec mx-auto max-w-[1180px] scroll-mt-4 px-4 sm:px-9">
      <SectionHead badge={tr("المزايا")} title={tr("كل اللي يحتاجه بحثكم، في مكان واحد")} desc={tr("هذي نفس الكروت اللي بتشوفونها داخل Wesync — مو صور تسويقية.")} />
      <div className="lv-bento mt-12">
        {/* لوحة الفريق + العدّاد البرتقالي طالع من تحت */}
        <div {...fx(0)} className="ld-fx lv-glass lv-bcard lv-b-2x2 min-h-[440px] lg:min-h-0">
          <div className="lv-bk">{tr("لوحة الفريق")}</div>
          <div className="lv-bt">{tr("كل شي بنظرة وحدة")}</div>
          <p className="m-0 mt-2 max-w-[38ch] text-[15px] leading-[1.7] text-[#ABA095]">{tr("وين وصلتوا، مين عليه وش، وكم باقي على التسليم — أول ما تفتحون.")}</p>
          <div className="lv-gauge hg-orange" aria-hidden>
            <div className="flex items-center gap-2.5 text-[16px] font-bold text-[#2A0E02]">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/30">
                <Gauge size={16} strokeWidth={1.8} />
              </span>
              {tr("تقدّم البحث")}
            </div>
            <GaugeSvg pct={65} />
          </div>
        </div>

        {/* المهام */}
        <div {...fx(90)} className="ld-fx lv-glass lv-bcard lv-b-2x1">
          <div className="lv-bk">{tr("المهام")}</div>
          <div className="lv-bt">{tr("كلٍّ يعرف وش عليه")}</div>
          <DemoTodo />
        </div>

        <div className="lv-pair">
          {/* الموعد */}
          <div {...fx(180)} className="ld-fx lv-glass lv-bcard">
            <div className="lv-bk">{tr("الموعد")}</div>
            <div className="lv-bt">{tr("ما يفاجئكم")}</div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-2">
                <span className="lv-num text-[64px] text-[#F7EFE6] lg:text-[84px]">24</span>
                <span className="text-[20px] font-extrabold">{tr("يوم")}</span>
              </div>
              <div className="mt-1 text-[13px] font-bold text-[#FF9A3C]">{tr("الأحد ٢١ نوفمبر")}</div>
            </div>
          </div>

          {/* المشرفة */}
          <div {...fx(260)} className="ld-fx lv-glass lv-bcard">
            <div className="lv-bk">{tr("المشرفة")}</div>
            <div className="lv-bt">{tr("ملاحظاتها تصير مهام")}</div>
            <div className="mt-auto flex flex-col items-start gap-2.5" aria-hidden>
              <div className="lv-bubble">{tr("«وضّحوا العيّنة، وزيدوا مرجعين سعوديين.»")}</div>
              <span className="lv-white-btn">{tr("حوّلها لمهام ✓")}</span>
            </div>
          </div>
        </div>

        {/* رحلة البحث */}
        <div {...fx(120)} className="ld-fx lv-glass lv-bcard lv-b-2x1">
          <div className="lv-bk">{tr("رحلة البحث")}</div>
          <div className="lv-bt">{tr("من الموضوع للتسليم")}</div>
          <div className="mt-auto" aria-hidden>
            <JourneyMini steps={demoJourney} long />
          </div>
        </div>

        {/* الكوتش الذكي */}
        <div {...fx(200)} className="ld-fx lv-coach lv-bcard lv-b-2x1 relative overflow-hidden rounded-[26px] md:rounded-[30px]">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#FFD9A8]">
            <AgentWave size={16} /> {tr("الكوتش الذكي · باقة AI")}
          </div>
          <div className="lv-bt !text-[#FFF3E8]">{tr("يقول لكم وش تسوون الحين")}</div>
          <div className="lv-coach-box" aria-hidden>
            <div className="text-[14px] font-semibold text-[#FFEBDD]">{tr("وش أهم شي نسويه هالأسبوع؟")}</div>
            <div className="mt-2 text-[14px] leading-[1.7] text-[rgba(255,235,220,.82)]">{tr("خلّصوا «هدف الدراسة» أول لأنه متأخر يومين — سارة تقدر تساعد أحمد. بعدها ابدأوا الأدبيات.")}</div>
          </div>
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-[#ABA095]">{tr("الأقسام نفسها اللي بالمنصّة، والبيانات أمثلة للتوضيح.")}</p>
    </section>
  );
}

// ───────────────────────────── ٢) المشاكل ─────────────────────────────

const pains = [
  { n: "500", t: tr("رسالة بالقروب، ولا وحدة مهمة."), fix: tr("المهام والملفات والقرارات بمكانها، مو ضايعة بين الستيكرز.") },
  { n: "1", t: tr("واحد شايل البحث كله، والباقي «إن شاء الله»."), fix: tr("الكل يشوف مين سوّى وش، بدون إحراج ولا مواجهة.") },
  { n: "?", t: tr("المشرفة رسلت ملاحظات، ومحد يدري مين يعدّل وش."), fix: tr("كل ملاحظة تصير مهمة باسم صاحبها وموعدها.") },
  { n: "2", t: tr("انتبهتوا للتسليم قبله بيومين."), fix: tr("مخطط الموعد يوزّع الأسابيع من يوم التسليم للخلف.") },
];

export function Problems() {
  return (
    <section className="lv-sec mx-auto max-w-[1180px] px-4 sm:px-9">
      <SectionHead badge={tr("تعرفون هالمواقف؟")} title={tr("مشكلة بحث التخرج مو البحث.. الفوضى اللي حوله.")} />
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-[18px]">
        {pains.map((p, i) => (
          <div key={p.t} {...fx(i * 110)} className="ld-fx lv-pain flex flex-col">
            <span className="lv-pain-n">{p.n}</span>
            <p className="lv-pain-t m-0">{p.t}</p>
            <p className="lv-pain-fix m-0 mt-auto">
              <Check size={16} className="mt-1 shrink-0" aria-hidden />
              {p.fix}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── ٣) يشتغل مع أدواتكم ─────────────────────────────

type Integration = { key: string; name: string; line: string; logo: ReactNode; ready: boolean };

/** كلها شغّالة بالكود: درايف (drive-team)، الإيميل (team-digest)، التقويم (calendar-feed + webcal)، التطبيق (PWA + push-notify)، دعوة واتساب */
const integrations: Integration[] = [
  { key: "drive", name: "Google Drive", line: tr("ملفات البحث تنحفظ بمجلد الفريق تلقائيًا"), logo: <GoogleDriveLogo size={26} />, ready: true },
  { key: "gmail", name: "Gmail", line: tr("تذكير بالإيميل قبل الموعد وتقرير كل أسبوع"), logo: <GmailLogo size={26} />, ready: true },
  { key: "gcal", name: "Google Calendar", line: tr("الاجتماعات والمواعيد تنزل بتقويمكم"), logo: <GoogleCalendarLogo size={24} />, ready: true },
  { key: "acal", name: "Apple Calendar", line: tr("نفس المواعيد على الآيفون والماك"), logo: <Calendar size={24} strokeWidth={1.8} className="text-[#E5463B]" />, ready: true },
  { key: "iphone", name: "iPhone", line: tr("ثبّتوه كتطبيق وتجيكم الإشعارات"), logo: <Smartphone size={24} strokeWidth={1.8} />, ready: true },
  { key: "wa", name: "WhatsApp", line: tr("رابط دعوة للفريق بضغطة"), logo: <WhatsAppLogo size={26} />, ready: true },
];

function IntCard({ it, style, className }: { it: Integration; style?: CSSProperties; className?: string }) {
  return (
    <div className={clsx("lv-int lv-glass", className)} style={style}>
      <span className="lv-int-logo">{it.logo}</span>
      <span className="min-w-0">
        <b>
          {it.name} {!it.ready && <span className="lv-soon">{tr("قريبًا")}</span>}
        </b>
        <span>{it.line}</span>
      </span>
    </div>
  );
}

export function Integrations() {
  // مواقع البطاقات بالكمبيوتر (من ١١٠٠×٥٦٠): ٣ يمين و٣ يسار، والخطوط من الكرة لحافة كل بطاقة
  const ys = [92, 280, 468];
  const W = 1100;
  const H = 560;
  const edge = 44 + 220;
  return (
    <section className="lv-sec mx-auto max-w-[1180px] px-4 sm:px-9">
      <SectionHead badge={tr("يشتغل مع أدواتكم")} title={tr("ما تغيّرون عاداتكم")} desc={tr("Wesync يتصل باللي تستخدمونه أصلًا. فعّلوها مرة وحدة من الإعدادات وخلاص.")} />

      {/* كمبيوتر: كرة بالنص وخطوط منقطة للبطاقات */}
      <div {...fx(100)} className="ld-fx lv-glass lv-int-map mt-12 hidden !rounded-[36px] lg:block">
        <div aria-hidden className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,110,20,.22), transparent)" }} />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          {ys.flatMap((y, i) => [
            <path key={`r${i}`} className="lv-dash" d={`M${W / 2 + 78} ${H / 2} C ${W / 2 + 170} ${H / 2}, ${W - edge - 90} ${y}, ${W - edge} ${y}`} />,
            <path key={`l${i}`} className="lv-dash" d={`M${W / 2 - 78} ${H / 2} C ${W / 2 - 170} ${H / 2}, ${edge + 90} ${y}, ${edge} ${y}`} />,
          ])}
          {ys.flatMap((y, i) => [<circle key={`cr${i}`} cx={W - edge} cy={y} r="3.5" fill="#FFC777" />, <circle key={`cl${i}`} cx={edge} cy={y} r="3.5" fill="#FFC777" />])}
        </svg>
        <div className="lv-orb absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 text-[22px]">Wesync</div>
        {integrations.map((it, i) => {
          const right = i < 3;
          const y = ys[i % 3];
          return <IntCard key={it.key} it={it} style={{ top: `calc(${((y / H) * 100).toFixed(2)}% - 44px)`, [right ? "right" : "left"]: "4%" }} />;
        })}
      </div>

      {/* جوال وتابلت: الكرة فوق والبطاقات عمودين */}
      <div className="mt-10 lg:hidden">
        <div {...fx(60)} className="ld-fx lv-orb mx-auto h-[110px] w-[110px] text-[17px]">
          Wesync
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {integrations.map((it, i) => (
            <div key={it.key} {...fx(i * 70)} className="ld-fx">
              <IntCard it={it} className="h-full flex-col !items-start sm:flex-row" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────── ٤) الأسعار ─────────────────────────────

/** رقم يتغير بحركة عدّ قصيرة (يحترم تقليل الحركة) */
function useCountTo(target: number, ms = 380) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";
    const start = from.current;
    if (reduced || start === target) {
      from.current = target;
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const val = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
      setV(val);
      from.current = val;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function useFounderSeats() {
  const [taken, setTaken] = useState<number | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let alive = true;
    supabase.rpc("founder_seats_taken").then(({ data, error }) => {
      if (alive && !error && typeof data === "number") setTaken(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return taken;
}

type Size = 1 | 2 | 5;

export function PricingV2() {
  const [size, setSize] = useState<Size>(5);
  const teamPrice = useCountTo(teamMonthlyTotal("basic", false, size));
  const aiPrice = useCountTo(teamMonthlyTotal("ai", false, size));
  const seats = useFounderSeats();
  const perMember =
    size === 5
      ? trx("يعني {0} ريال بس لكل عضو لو كنتم {1}", memberShare(TEAM_PRICE, MAX_TEAM_MEMBERS), MAX_TEAM_MEMBERS)
      : size === 2
        ? trx("يعني {0} ريال بس لكل واحد منكم", memberShare(DUO_PRICE, 2))
        : trx("{0} ريال لك لحالك", SOLO_PRICE);
  const sizes: { k: Size; label: string; price: number }[] = [
    { k: 1, label: tr("لحالك"), price: SOLO_PRICE },
    { k: 2, label: tr("شخصين"), price: DUO_PRICE },
    { k: 5, label: tr("الفريق ٣–٥"), price: TEAM_PRICE },
  ];
  const seatsFull = seats !== null && seats >= FOUNDER_SEATS;

  return (
    <section id="pricing" className="lv-sec mx-auto max-w-[1100px] scroll-mt-4 px-4 sm:px-9">
      <SectionHead badge={tr("الأسعار")} title={trx("الفريق كامل بـ{0} ريال.", TEAM_PRICE)}>
        <p className="m-0 mt-2 text-[20px] font-bold text-[#FFC777] md:text-[24px]">{tr("نصيبك أقل من كوب قهوة.")}</p>
        <p className="lv-desc">{trx("اشتراك واحد للفريق كامل حتى {0} أعضاء — مو لكل شخص.", MAX_TEAM_MEMBERS)}</p>
        <div className="mt-7 flex justify-center">
          <div className="lv-seg" role="group" aria-label={tr("حجم الفريق")}>
            {sizes.map((s) => (
              <button key={s.k} type="button" aria-pressed={size === s.k} onClick={() => setSize(s.k)}>
                <span>{s.label}</span>
                <bdi className="lv-num font-extrabold">{s.price}</bdi>
              </button>
            ))}
          </div>
        </div>
      </SectionHead>

      <div className="mt-10 grid items-start gap-5 md:grid-cols-2 md:gap-[22px]">
        {/* الفريق + المساعد الذكي (أول بالجوال) */}
        <div {...fx(260)} className="ld-fx lv-ai-card order-1 md:order-2">
          <span className="lv-popular">{tr("الأكثر اختيارًا")}</span>
          <div className="text-[24px] font-extrabold">{tr("الفريق + المساعد الذكي")}</div>
          <div className="text-[15px] text-[#E6DBD1]">{tr("مساعد يرتّب ويشرح ويقترح — مو بديل عنكم")}</div>
          <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="lv-price lv-gold-num" aria-live="polite">
              {aiPrice}
            </span>
            <span className="pb-2 text-[15px] leading-snug text-[#E6DBD1]">
              {tr("ريال شهريًا")}
              <br />
              <span className="text-[#ABA095]">{tr("للفريق كامل")}</span>
            </span>
          </div>
          <div className="lv-founders mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b className="text-[15px] text-[#FFD9A8]">{trx("سعر المؤسسين: المساعد بـ{0} بس", AI_ADDON_FOUNDER)}</b>
              <span className="text-[13px] text-[#ABA095]">{trx("لأول {0} فريق", FOUNDER_SEATS)}</span>
            </div>
            {seats !== null && (
              <div className="mt-2.5">
                <div className="lv-fbar" role="progressbar" aria-valuemin={0} aria-valuemax={FOUNDER_SEATS} aria-valuenow={seats} aria-label={tr("مقاعد المؤسسين")}>
                  <i style={{ width: `${(seats / FOUNDER_SEATS) * 100}%` }} />
                </div>
                <div className="mt-1.5 text-[12px] text-[#ABA095]">
                  {seatsFull ? tr("اكتملت مقاعد المؤسسين") : trx("انحجز {0} من {1} — باقي {2}", seats, FOUNDER_SEATS, FOUNDER_SEATS - seats)}
                </div>
              </div>
            )}
            <div className="mt-2 text-[13px] text-[#E6DBD1]">{trx("اشتراك الفريق + المساعد بـ{0} ريال (لحالك +{1})", AI_ADDON_TEAM, AI_ADDON_SOLO)}</div>
          </div>
          <Link to="/login?signup=1" data-wa-avoid className="lv-cream-btn mt-6">
            {tr("جرّبوا المساعد مجانًا")}
          </Link>
          <ul className="m-0 mt-6 list-none space-y-3 border-t border-white/[0.12] p-0 pt-6">
            <li className="text-[15px] text-[#FFD9A8]">{tr("كل اللي باشتراك الفريق، وفوقه:")}</li>
            {aiFeatures.map((f) => (
              <li key={f.title} className="lv-feat">
                <i aria-hidden>
                  <Check size={13} strokeWidth={3} />
                </i>
                <span>
                  <b className="font-bold text-[#F7EFE6]">{f.title}</b> — {f.desc}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* اشتراك الفريق */}
        <div {...fx(120)} className="ld-fx lv-glass lv-price-card order-2 md:order-1 md:!rounded-[34px]">
          <div className="text-[24px] font-extrabold">{tr("اشتراك الفريق")}</div>
          <div className="text-[15px] text-[#ABA095]">{tr("كل أدوات تنظيم البحث للفريق كامل")}</div>
          <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="lv-price text-[#F7EFE6]" aria-live="polite">
              {teamPrice}
            </span>
            <span className="pb-2 text-[15px] leading-snug text-[#E6DBD1]">
              {tr("ريال شهريًا")}
              <br />
              <span className="text-[#ABA095]">{size === 1 ? tr("لك لحالك") : tr("للفريق كامل")}</span>
            </span>
          </div>
          <div className="lv-green-chip mt-4">
            <Users size={15} aria-hidden />
            {perMember}
          </div>
          <Link to="/login?signup=1" data-wa-avoid className="lv-ghost-btn mt-6">
            {trx("ابدأوا {0} يوم مجانًا", TRIAL_DAYS)}
          </Link>
          <ul className="m-0 mt-6 list-none space-y-3 border-t border-white/[0.1] p-0 pt-6">
            {basicHighlights.map((item) => (
              <li key={item} className="lv-feat">
                <i aria-hidden>
                  <Check size={13} strokeWidth={3} />
                </i>
                <span>{boldLead(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div {...fx(80)} className="ld-fx lv-free-strip mt-6">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[rgba(127,224,166,.14)] text-[#7FE0A6]" aria-hidden>
          <ShieldCheck size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[17px] text-[#BFF3D3]">{tr("المشرفة مجانًا، دايمًا")}</b>
          <span className="text-[14px] text-[#ABA095]">{tr("رابط واحد تشوف فيه تقدّمكم وتعتمد وتعلّق، بدون حساب ولا اشتراك.")}</span>
        </div>
      </div>

      <ul className="m-0 mt-5 flex list-none flex-wrap justify-center gap-x-6 gap-y-2 p-0 text-[14px] text-[#E6DBD1]">
        {[
          { icon: Check, t: trx("{0} يوم تجربة بدون بطاقة", TRIAL_DAYS) },
          { icon: Check, t: tr("توقفون أي وقت") },
          { icon: CreditCard, t: tr("دفع آمن") },
          { icon: UserPlus, t: tr("تضيفون وتشيلون أعضاء بأي وقت") },
        ].map(({ icon: Icon, t }, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <Icon size={15} className="text-[#7FE0A6]" aria-hidden />
            {t}
          </li>
        ))}
      </ul>

      <details className="ld-faq mx-auto mt-10 max-w-3xl rounded-[24px] bg-[#140E0B] px-6 py-4 shadow-[inset_0_0_0_1px_rgba(255,240,225,.07)]">
        <summary className="flex min-h-[44px] items-center justify-between gap-3 font-semibold">
          {tr("وش يضيف المساعد الذكي بالتفصيل؟")}
          <span className="lv-plus !h-[22px] !w-[22px]" aria-hidden />
        </summary>
        <div className="mt-5">
          <PlanComparison variant="dark" />
        </div>
      </details>

      <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
        {[
          { k: tr("بالإجازة؟"), v: tr("الفريق يتجمّد مجانًا، وبياناتكم محفوظة لين ترجعون.") },
          { k: tr("ادعوا فريق ثاني"), v: tr("أول ما يشتركون: شهر مجاني لكم ولهم.") },
          { k: tr("ظروفك ما تسمح؟"), v: tr("عندنا منحة محدودة — اطلبوها واتساب بدون إحراج.") },
        ].map((perk) => (
          <div key={perk.k} className="rounded-[20px] bg-[#140E0B] px-5 py-4 text-start shadow-[inset_0_0_0_1px_rgba(255,240,225,.07)]">
            <div className="text-sm font-bold text-[#FFC777]">{perk.k}</div>
            <div className="mt-1 text-sm text-[#ABA095]">{perk.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── ٥) الأسئلة ─────────────────────────────

export function FaqV2({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="lv-sec mx-auto max-w-[1100px] scroll-mt-4 px-4 sm:px-9">
      <div {...fx()} className="ld-fx flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
        <h2 className="lv-faq-word m-0">{tr("أسئلة")}</h2>
        <p className="m-0 hidden max-w-[34ch] pb-3 text-[17px] leading-[1.7] text-[#ABA095] md:block">
          {tr("اللي يسألونه كل الفرق قبل ما يبدون. ما لقيت سؤالك؟")}{" "}
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" className="font-bold text-[#FFC777] underline underline-offset-4">
            {tr("كلّمنا")}
          </a>
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} {...fx(Math.min(i, 5) * 60)} className="ld-fx lv-q" data-open={isOpen}>
              <button type="button" className="lv-q-btn" aria-expanded={isOpen} aria-controls={`lv-a-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                <span>{f.q}</span>
                <span className="lv-plus" aria-hidden />
              </button>
              <div className="lv-a" id={`lv-a-${i}`} role="region" aria-hidden={!isOpen}>
                <div>
                  <p>{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-[15px] text-[#ABA095] md:hidden">
        {tr("ما لقيت سؤالك؟")}{" "}
        <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" className="font-bold text-[#FFC777] underline underline-offset-4">
          {tr("كلّمنا")}
        </a>
      </p>
    </section>
  );
}

/** زر الواتساب العائم يختفي لما يغطي زر باقة (الجوال) */
export function useWhatsAppAvoid(ref: React.RefObject<HTMLAnchorElement | null>) {
  useEffect(() => {
    let raf = 0;
    const check = () => {
      const fab = ref.current;
      if (!fab) return;
      const f = fab.getBoundingClientRect();
      const hit = Array.from(document.querySelectorAll<HTMLElement>("[data-wa-avoid]")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > f.top - 12 && r.top < f.bottom + 12 && r.right > f.left - 12 && r.left < f.right + 12;
      });
      fab.classList.toggle("lv-wa-hide", hit);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

