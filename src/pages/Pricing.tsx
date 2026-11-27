import { useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import {
  FOUNDING_TEAMS,
  MAX_TEAM_MEMBERS,
  RESEARCH_MONTHS,
  TEAM_MONTHLY,
  TRIAL_DAYS,
  aiFeatures,
  basicHighlights,
  memberShare,
  perMemberMonthly,
  perMemberResearch,
  researchSaving,
  teamMonthlyTotal,
  teamResearchTotal,
  type PlanId,
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

export default function Pricing() {
  const { team } = useAuth();
  const { roster } = useTeamRoster();
  const { paidProfileIds } = useTeamPayments();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const state = getTeamSubscriptionState(team?.subscriptionEndDate);
  const daysLeft = team?.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;
  const currentPlan: PlanId = team?.plan ?? "ai";
  const isFounder = team?.isFounder ?? false;

  const memberCount = roster.length || 1;
  // نحسب من نفس معادلة السيرفر (team_monthly_total) بدل monthly_price المخزّن
  const total = teamMonthlyTotal(currentPlan, isFounder, memberCount);
  const share = memberShare(total, memberCount);
  const isActive = state === "active";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
        <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-gradient-to-b from-brand-50 to-paper px-6 py-10 text-center sm:px-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-[blob-drift_11s_ease-in-out_3] rounded-full bg-amber-accent-200/40 blur-3xl motion-reduce:animate-none" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-brand-200/30 blur-3xl" />

          <span className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-accent-300/60 bg-white/60 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-accent-700 backdrop-blur-sm">
            <Wand2 size={12} />
            Wesync Premium
          </span>

          <h1 className="relative mt-4 font-display text-2xl font-extrabold leading-snug text-brand-950 sm:text-3xl">{tr("بحثكم يستحق مساحة تواكبه")}<br />
            <span className="bg-gradient-to-l from-brand-600 to-amber-accent-600 bg-clip-text text-transparent">{tr("من أول فكرة، لآخر صفحة")}</span>
          </h1>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-brand-950/55">{trx("سعر للطالب، والوكيل داخل السعر. الفريق حتى {0} أعضاء، والمشرفة تدخل مجانًا دايمًا.", MAX_TEAM_MEMBERS)}</p>

          <div className="relative mx-auto mt-7 flex w-fit items-center justify-center">
            <GrowingPlant className="h-32 w-32 opacity-95 sm:h-40 sm:w-40" />
          </div>
        </div>
      </div>

      {/* الباقة: وحدة، والوكيل داخلها — شهري أو للبحث كامل */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["monthly", "research"] as const).map((period) => {
          const research = period === "research";
          const per = research ? perMemberResearch(memberCount, isFounder) : perMemberMonthly(memberCount, isFounder);
          const teamTotal = research ? teamResearchTotal(isFounder, memberCount) : total;
          return (
            <Card key={period} className="flex flex-col">
              <p className="flex flex-wrap items-center gap-2 font-display text-lg font-extrabold text-brand-950">
                {research ? trx("البحث كامل · {0} شهور", RESEARCH_MONTHS) : tr("شهري")}
                {research && (
                  <span className="rounded-full bg-amber-accent-100 px-2.5 py-0.5 text-xs font-bold text-amber-accent-700">{trx("توفّرون {0} ريال للطالب", researchSaving(memberCount, isFounder))}</span>
                )}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-extrabold text-brand-950">{per}</span>
                <span className="text-sm font-semibold text-brand-950/50">{research ? tr("ريال للطالب، دفعة وحدة") : tr("ريال للطالب بالشهر")}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-brand-950/45">
                {memberCount > 1 ? trx("الفريق كامل ({0} أعضاء): {1} ريال", memberCount, teamTotal) : tr("سعر الطالب لحاله — ينزل لما ينضم لكم فريقكم")}
              </p>
            </Card>
          );
        })}
      </div>
      {isFounder && memberCount > 1 && (
        <p className="rounded-2xl bg-amber-accent-50 px-4 py-3 text-xs font-bold text-amber-accent-700">{trx("أنتم من أول {0} فريق: سعركم ثابت طول بحثكم، بدل {1} ريال للطالب.", FOUNDING_TEAMS, TEAM_MONTHLY)}</p>
      )}
      <Card>
        <CardHeader title={tr("وش داخل الاشتراك")} subtitle="Included" />
        <ul className="space-y-2.5">
          {basicHighlights.map((label) => (
            <li key={label} className="flex items-start gap-2.5 text-sm text-brand-950/70">
              <Check size={16} className="mt-0.5 shrink-0 text-brand-500" />
              {label}
            </li>
          ))}
          {aiFeatures.map((f) => (
            <li key={f.title} className="flex items-start gap-2.5 text-sm text-brand-950/70">
              <Wand2 size={16} className="mt-0.5 shrink-0 text-amber-accent-500" />
              <span>
                <b className="font-bold text-brand-950">{f.title}</b> — {f.desc}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Price card */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
        <div className="relative overflow-hidden rounded-[calc(1.75rem-1.5px)] bg-paper p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-950/10 to-transparent" />
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-amber-accent-100/70 blur-3xl" />
          <span className="absolute end-6 top-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-accent-400 to-amber-accent-500 px-3 py-1 text-xs font-extrabold text-white shadow-sm shadow-amber-accent-400/30">
            {tr("الاشتراك + الوكيل")}
          </span>

          <div className="relative flex flex-col items-start gap-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-brand-950/50">
              <BadgeCheck size={14} className="text-brand-500" />{trx("حالة الاشتراك: {0}", subscriptionStateLabel[state])}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-extrabold text-brand-950">{total}</span>
              <span className="text-sm font-semibold text-brand-950/50">{tr("ريال بالشهر للفريق كامل")}</span>
            </div>
            {memberCount > 1 && (
              <p className="text-xs text-brand-950/45">{trx("نصيب كل عضو {0} ريال — {1} أعضاء بفريقكم", share, memberCount)}</p>
            )}
          </div>

          {team?.subscriptionEndDate && (
            <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-brand-950/60">
              <CalendarClock size={14} className="text-brand-500" />
              {isActive
                ? tr("متبقٍ {0} {1} — ينتهي {2}", Math.max(daysLeft, 0), daysLeft === 1 ? tr("يوم") : tr("أيام"), formatDateLong(team.subscriptionEndDate))
                : tr("انتهى بتاريخ {0}", formatDateLong(team.subscriptionEndDate))}
            </p>
          )}

          <button
            onClick={() => setCheckoutOpen(true)}
            disabled={isActive}
            className="relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-l from-brand-500 to-brand-600 py-3.5 text-sm font-extrabold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_6px_16px_-4px_rgba(0,0,0,0.25)] transition-shadow hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_8px_20px_-4px_rgba(0,0,0,0.3)] disabled:cursor-default disabled:opacity-70 disabled:shadow-none"
          >
            <CreditCard size={16} />
            {isActive ? tr("اشتراككم مفعّل ✓") : tr("ادفعوا حصتكم الآن")}
          </button>

          <p className="mt-3 text-center text-xs text-brand-950/40">{trx("{0} يوم تجربة مجانية بدون بطاقة · بدون تجديد تلقائي · Apple Pay وSTC Pay ومدى عبر Moyasar", TRIAL_DAYS)}</p>
        </div>
      </div>

      {/* Split payment roster — مين دفع حصته */}
      <Card>
        <CardHeader title={tr("حصص الأعضاء هالشهر")} subtitle="Who's paid" />
        <ul className="space-y-2.5">
          {roster.map((member) => {
            const hasPaid = paidProfileIds.has(member.id);
            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={member.initials} color={member.color} size="sm" />
                  <span className="truncate text-sm font-semibold text-brand-950">
                    {member.name}
                  </span>
                </div>
                {hasPaid ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-l from-brand-500 to-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm shadow-brand-500/30">
                    <Check size={12} />{tr("دفع حصته")}</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-brand-950/40">{tr("لسا")}</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-brand-950/45">{trx("كل عضو يدفع نصيبه ({0} ريال) بشكل مستقل — يمدد اشتراك الفريق بحصته مباشرة، بدون انتظار البقية.", share)}</p>
      </Card>

      <Card>
        <CardHeader title={tr("أسئلة شائعة")} subtitle="FAQ" />
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-bold text-brand-950">{tr("السعر لكل شخص ولا للفريق؟")}</p>
            <p className="mt-1 text-brand-950/55">{trx("للطالب: لحالك {0} ريال بالشهر، وفي فريق {1} ريال للطالب (وأول {2} فريق {3} ثابت). الوكيل داخل السعر، وفيه باقة للبحث كامل دفعة وحدة أوفر. المشرفة مجانًا دايمًا ولا تنحسب.", perMemberMonthly(1, false), TEAM_MONTHLY, FOUNDING_TEAMS, perMemberMonthly(2, true))}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("لازم قائد الفريق يدفع، ولا أي عضو يقدر؟")}</p>
            <p className="mt-1 text-brand-950/55">{tr("اللي يريحكم: كل عضو يدفع نصيبه بنفسه بأي وقت، أو قائد الفريق يدفع عن الفريق كامل دفعة وحدة.")}</p>
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
            <p className="font-bold text-brand-950">{tr("الشهري ولا البحث كامل؟")}</p>
            <p className="mt-1 text-brand-950/55">{trx("الشهري تدفعونه شهر بشهر. البحث كامل دفعة وحدة تغطي {0} شهور وأوفر، وتختارونه وقت الدفع.", RESEARCH_MONTHS)}</p>
          </div>
          <div>
            <p className="font-bold text-brand-950">{tr("ظروفي ما تسمح بالدفع؟")}</p>
            <p className="mt-1 text-brand-950/55">
              {trx("عندنا منحة لعدد محدود من الطلاب — {0} وقولوا لنا عن وضعكم بدون إحراج.", (
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
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-500" />
            <p className="text-xs text-brand-950/55">{tr("معلومات بطاقتكم ما تمر إلا عبر Moyasar مباشرة — الموقع ما يخزّن أي بيانات دفع.")}</p>
          </div>
        </div>
      </Card>

      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}
