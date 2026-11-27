import { useState } from "react";
import { BadgeCheck, Building2, CalendarClock, Check, CreditCard, HeartHandshake, ShieldCheck, Wand2 } from "lucide-react";
import {
  BEST_PLAN,
  GRANT_DONATION,
  MAX_TEAM_MEMBERS,
  PLAN_OPTIONS,
  PRICE_PER_PERSON,
  TRIAL_DAYS,
  aiFeatures,
  basicHighlights,
  perMonth,
  planSaving,
  type BillingPeriod,
} from "../lib/plans";
import { SUPPORT_WHATSAPP } from "../lib/legal";
import Card, { CardHeader } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import GrowingPlant from "../components/GrowingPlant";
import CheckoutModal from "../components/CheckoutModal";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTeamPayments } from "../hooks/useTeamPayments";
import { getTeamSubscriptionState, subscriptionStateLabel } from "../lib/subscription";
import { daysUntil, formatDateLong } from "../lib/date";
import { tr, trx } from "../lib/i18n";

const PLAN_NAME: Record<BillingPeriod, () => string> = {
  month: () => tr("شهري"),
  semester: () => tr("فصل دراسي"),
  year: () => tr("السنة الدراسية"),
};
const PLAN_SPAN: Record<BillingPeriod, () => string> = {
  month: () => tr("شهر واحد"),
  semester: () => tr("4 شهور"),
  year: () => tr("9 شهور — المشروع كامل"),
};

export default function Pricing() {
  const { team, currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const { paidProfileIds } = useTeamPayments(roster.map((m) => m.id));
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payFor, setPayFor] = useState<string | undefined>(undefined);

  const state = getTeamSubscriptionState(team?.subscriptionEndDate);
  const daysLeft = team?.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;
  const memberCount = roster.length || 1;
  const isActive = state === "active";
  const iPaid = currentUser ? paidProfileIds.has(currentUser.id) : false;
  const paidCount = roster.filter((m) => paidProfileIds.has(m.id)).length;
  const openCheckout = (forId?: string) => {
    setPayFor(forId);
    setCheckoutOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-[2rem] bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
        <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-gradient-to-b from-brand-50 to-paper px-6 py-10 text-center sm:px-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-[blob-drift_11s_ease-in-out_3] rounded-full bg-amber-accent-200/40 blur-3xl motion-reduce:animate-none" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-brand-200/30 blur-3xl" />

          <span className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-accent-300/60 bg-white/60 px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.18em] text-amber-accent-700 backdrop-blur-sm">
            <Wand2 size={12} />
            Wesync Premium
          </span>

          <h1 className="relative mt-4 font-display text-2xl font-extrabold leading-snug text-brand-950 sm:text-3xl">{tr("بحثكم يستحق مساحة تواكبه")}<br />
            <span className="bg-gradient-to-l from-brand-600 to-amber-accent-600 bg-clip-text text-transparent">{tr("من أول فكرة، لآخر صفحة")}</span>
          </h1>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-brand-950/55">{trx("{0} ريال للشخص بالشهر — يعني نص ريال باليوم. كل شي داخل، حتى ويسي المساعد الذكي، والدكتورة مجانًا دايمًا 🌱 (الفريق حتى {1} أعضاء)", PRICE_PER_PERSON, MAX_TEAM_MEMBERS)}</p>

          <div className="relative mx-auto mt-7 flex w-fit items-center justify-center">
            <GrowingPlant className="h-32 w-32 opacity-95 sm:h-40 sm:w-40" />
          </div>
        </div>
      </div>

      {/* الباقات الثلاث — «الفصل» يبيّن إن «السنة الدراسية» هي الأوفر */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PLAN_OPTIONS.map((p) => {
          const best = p.id === BEST_PLAN;
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-[1.5rem] p-[1.5px] ${best ? "bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 shadow-lg shadow-brand-950/10" : "bg-brand-100/60"}`}
            >
              <div className="flex h-full flex-col rounded-[calc(1.5rem-1.5px)] bg-paper p-5">
                {best && (
                  <span className="mb-2 w-fit rounded-full bg-amber-accent-100 px-3 py-1 text-[12px] font-extrabold text-amber-accent-700">{tr("الأوفر · الأكثر اختيارًا")}</span>
                )}
                <p className="font-display text-lg font-extrabold text-brand-950">{PLAN_NAME[p.id]()}</p>
                <p className="text-xs text-brand-950/50">{PLAN_SPAN[p.id]()}</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-brand-950">{p.price}</span>
                  <span className="text-sm font-semibold text-brand-950/50">{tr("ريال للشخص")}</span>
                </div>
                <p className="mt-1 text-[12px] font-semibold text-brand-950/50">
                  {p.id === "month" ? tr("نص ريال باليوم") : trx("يعني {0} بالشهر · توفّر {1} ريال", perMonth(p.id), planSaving(p.id))}
                </p>
                <p className="mt-1 text-[12px] text-brand-950/40">{trx("فريق من {0}: {1} ريال", memberCount, p.price * memberCount)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* الحالة + زر الدفع */}
      <div className="rounded-[1.75rem] bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
        <div className="relative overflow-hidden rounded-[calc(1.75rem-1.5px)] bg-paper p-6 sm:p-8">
          <p className="flex items-center gap-1.5 text-xs font-bold text-brand-950/50">
            <BadgeCheck size={14} className="text-brand-500" />
            {trx("حالة الاشتراك: {0}", subscriptionStateLabel[state])}
          </p>
          <p className="mt-2 font-display text-xl font-extrabold text-brand-950">
            {iPaid ? tr("حصتك مدفوعة ✓") : trx("حصتك من {0} ريال بس", PRICE_PER_PERSON)}
          </p>
          {memberCount > 1 && <p className="mt-1 text-xs text-brand-950/50">{trx("{0} من {1} بفريقكم دفعوا حصتهم", paidCount, memberCount)}</p>}

          {team?.subscriptionEndDate && (
            <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-brand-950/60">
              <CalendarClock size={14} className="text-brand-500" />
              {isActive
                ? tr("متبقٍ {0} {1} — ينتهي {2}", Math.max(daysLeft, 0), daysLeft === 1 ? tr("يوم") : tr("أيام"), formatDateLong(team.subscriptionEndDate))
                : tr("انتهى بتاريخ {0}", formatDateLong(team.subscriptionEndDate))}
            </p>
          )}

          <button
            onClick={() => openCheckout()}
            className="relative mt-6 flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-l from-brand-500 to-brand-600 py-3.5 text-sm font-extrabold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_6px_16px_-4px_rgba(0,0,0,0.25)]"
          >
            <CreditCard size={16} />
            {iPaid ? tr("مدّدوا أو ادفعوا عن زميل") : tr("ادفعوا حصتكم الآن")}
          </button>

          <p className="mt-3 text-center text-[12px] text-brand-950/40">{trx("{0} يوم تجربة مجانية بدون بطاقة · بدون تجديد تلقائي · Apple Pay وSTC Pay ومدى", TRIAL_DAYS)}</p>
          <div className="mt-4 grid gap-2 text-[12px] font-semibold text-brand-950/60 sm:grid-cols-2">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-500" />{tr("ضمان أول شهر: ما عجبكم؟ نرجّع فلوسكم")}</span>
            <span className="flex items-center gap-1.5"><BadgeCheck size={14} className="text-brand-500" />{tr("سعرك ثابت لين تتخرجون")}</span>
          </div>
        </div>
      </div>

      {/* مين دفع حصته — مع «ادفع عنه» */}
      <Card>
        <CardHeader title={tr("حصص الأعضاء")} subtitle="Who's paid" />
        <ul className="space-y-2.5">
          {roster.map((member) => {
            const hasPaid = paidProfileIds.has(member.id);
            const me = member.id === currentUser?.id;
            return (
              <li key={member.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={member.initials} color={member.color} size="sm" />
                  <span className="truncate text-sm font-semibold text-brand-950">{me ? tr("أنت") : member.name}</span>
                </div>
                {hasPaid ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-[12px] font-bold text-brand-700">
                    <Check size={12} />
                    {tr("مدفوعة")}
                  </span>
                ) : me ? (
                  <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-[12px] font-bold text-brand-950/40">{tr("لسا")}</span>
                ) : (
                  <button type="button" onClick={() => openCheckout(member.id)} className="flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-brand-200 bg-paper px-3 text-[12px] font-bold text-brand-700">
                    <HeartHandshake size={13} />
                    {member.gender === "female" ? tr("ادفع عنها") : tr("ادفع عنه")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-brand-950/45">{tr("كل عضو يدفع حصته بنفسه، أو أحد يدفع عن زميله أو عن الفريق كامل. كل دفعة تمدد اشتراك الفريق مباشرة.")}</p>
      </Card>

      {/* كل شي داخل الاشتراك */}
      <Card>
        <CardHeader title={tr("كل شي داخل الاشتراك")} subtitle="All-inclusive" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 md:grid-cols-2">
          <ul className="space-y-2.5">
            {basicHighlights.map((label) => (
              <li key={label} className="flex items-start gap-2.5 text-sm text-brand-950/70">
                <Check size={15} className="mt-0.5 shrink-0 text-brand-500" />
                {label}
              </li>
            ))}
          </ul>
          <ul className="space-y-2.5">
            {aiFeatures.map((f) => (
              <li key={f.title} className="flex items-start gap-2.5 text-sm text-brand-950/70">
                <Wand2 size={15} className="mt-0.5 shrink-0 text-amber-accent-500" />
                <span>
                  <b className="font-bold text-brand-950">{f.title}</b> — {f.desc}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* اشتراك القسم */}
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-brand-100 bg-paper p-5 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-50 text-amber-accent-700">
          <Building2 size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-brand-950">{tr("اشتراك القسم أو النادي")}</p>
          <p className="text-sm text-brand-950/55">{tr("القسم أو النادي الطلابي يشترك لكل فرق الدفعة دفعة وحدة، بسعر أقل وفاتورة وحدة.")}</p>
        </div>
        <a
          href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(tr("السلام عليكم، أبغى أعرف عن اشتراك القسم في Wesync"))}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-brand-200 px-4 text-sm font-bold text-brand-700"
        >
          {tr("كلّمونا")}
        </a>
      </div>

      <Card>
        <CardHeader title={tr("أسئلة شائعة")} subtitle="FAQ" />
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-bold text-brand-950">{tr("كم السعر؟")}</p>
            <p className="mt-1 text-brand-950/55">{trx("{0} ريال للشخص بالشهر، أو فصل (4 شهور) بـ 49، أو السنة الدراسية (9 شهور) بـ 99 — يعني 11 بالشهر. كل شي داخل حتى المساعد الذكي، والدكتورة مجانًا ولا تنحسب.", PRICE_PER_PERSON)}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("لو واحد بالفريق ما دفع؟")}</p>
            <p className="mt-1 text-brand-950/55">{tr("الفريق يكمل شغله عادي، بس أيام الاشتراك تكون أقل لأن كل دفعة تمدد الفريق بنصيبها. وتقدرون تدفعون عن زميلكم بضغطة «ادفع عنه».")}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("ضمان أول شهر؟")}</p>
            <p className="mt-1 text-brand-950/55">{tr("إذا ما حسيتوا بفرق خلال أول 30 يوم من أول دفعة، راسلونا واتساب ونرجّع المبلغ لنفس البطاقة. مرة وحدة لكل شخص.")}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("السعر بيزيد علينا؟")}</p>
            <p className="mt-1 text-brand-950/55">{tr("لا. سعرك ثابت لين تتخرجون، حتى لو تغيّر السعر للفرق الجديدة.")}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("خصم الاستمرار؟")}</p>
            <p className="mt-1 text-brand-950/55">{trx("الفريق اللي يشتغل على Wesync كل أسبوع لمدة 4 أسابيع، يصير الشهري له بـ 12 بدل {0}. يطلع لكم تلقائيًا بنافذة الدفع.", PRICE_PER_PERSON)}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("وش طرق الدفع؟")}</p>
            <p className="mt-1 text-brand-950/55">{tr("Apple Pay وSTC Pay ومدى والبطاقات عبر Moyasar، ويتفعّل الاشتراك خلال ثوانٍ. ما نخزّن أي بيانات دفع.")}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("وش يصير بالإجازة؟")}</p>
            <p className="mt-1 text-brand-950/55">{tr("ما فيه تجديد تلقائي ولا سحب من بطاقتكم. إذا ما دفعتم يتجمّد الفريق مجانًا (قراءة فقط) وبياناتكم محفوظة، وترجعون تكملون متى ما بغيتوا.")}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("ادعوا فريق ثاني؟")}</p>
            <p className="mt-1 text-brand-950/55">{tr("إذا فريق دخل من رابطكم ودفع أول مرة، تاخذون شهر مجاني أنتم وهم.")}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("ظروفي ما تسمح بالدفع؟")}</p>
            <p className="mt-1 text-brand-950/55">
              {trx("عندنا منحة يموّلها صندوق زملائكم — {0} وقولوا لنا عن وضعكم بدون إحراج.", (
                <a
                  key="wa"
                  href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(tr("السلام عليكم، أبغى أطلب منحة Wesync لفريقي"))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-brand-600 underline"
                >
                  {tr("راسلونا واتساب")}
                </a>
              ))}
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
            <HeartHandshake size={16} className="mt-0.5 shrink-0 text-amber-accent-600" />
            <p className="text-xs text-brand-950/55">{trx("صندوق المنح: عند الدفع تقدرون تضيفون {0} ريال تروح كلها لطلاب ظروفهم ما تسمح.", GRANT_DONATION)}</p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-500" />
            <p className="text-xs text-brand-950/55">{tr("معلومات بطاقتكم ما تمر إلا عبر Moyasar مباشرة — الموقع ما يخزّن أي بيانات دفع.")}</p>
          </div>
        </div>
      </Card>

      {checkoutOpen && <CheckoutModal forProfileId={payFor} onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}
