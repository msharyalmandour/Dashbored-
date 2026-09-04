import { useState } from "react";
import { BadgeCheck, CalendarClock, CheckCircle2, Gift, Sparkles } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import { ActionCard, InsightCard } from "../components/ui/cards";
import CheckoutModal from "../components/CheckoutModal";
import { useAuth } from "../context/AuthContext";
import { getTeamSubscriptionState, subscriptionStateLabel } from "../lib/subscription";
import { daysUntil, formatDateLong } from "../lib/date";

const freeFeatures = [
  "كل صفحات إدارة البحث (مقترح، منهجية، مهام، أدلة)",
  "دعوة كل أعضاء الفريق بدون حد",
  "تصدير المستندات والتقويم",
  "٧ أيام تجربة مجانية كاملة المزايا",
];

const premiumFeatures = [
  "كل مزايا التجربة المجانية، بدون توقف",
  "تفعيل فوري بالبطاقة عبر Moyasar",
  "دعم أولوية لفريقكم",
  "السعر يتغيّر تلقائيًا حسب عدد الأعضاء",
];

export default function Pricing() {
  const { team, isLeader } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const state = getTeamSubscriptionState(team?.subscriptionEndDate);
  const daysLeft = team?.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;
  const pricePerPerson = team?.monthlyPrice ?? 40;

  return (
    <div className="space-y-5">
      <Card tone="teal" className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
          <Sparkles size={20} />
        </span>
        <div>
          <h1 className="font-display text-xl font-extrabold text-brand-950">
            الباقات والاشتراك
          </h1>
          <p className="text-sm text-brand-950/55">
            باقة واحدة بسيطة — {pricePerPerson} ريال شهريًا لكل عضو بالفريق.
          </p>
        </div>
      </Card>

      {team && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InsightCard
            icon={BadgeCheck}
            label="حالة الاشتراك"
            value={subscriptionStateLabel[state]}
          />
          <InsightCard
            icon={CalendarClock}
            label={team.subscriptionEndDate ? "الأيام المتبقية" : "تاريخ الانتهاء"}
            value={
              team.subscriptionEndDate
                ? `${Math.max(daysLeft, 0)} ${daysLeft === 1 ? "يوم" : "أيام"}`
                : "لم يُفعّل بعد"
            }
            trend={
              team.subscriptionEndDate ? formatDateLong(team.subscriptionEndDate) : undefined
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActionCard icon={Gift} tone="sky" title="تجربة مجانية" description="مثالية عشان تجربون الموقع بكل مزاياه بدون أي التزام.">
          <ul className="mt-4 space-y-2.5">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-brand-950/70">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sky-accent-500" />
                {f}
              </li>
            ))}
          </ul>
        </ActionCard>

        <ActionCard
          icon={Sparkles}
          tone="cream"
          title="الاشتراك المميز"
          description={`${pricePerPerson} ريال شهريًا لكل عضو — يتفعّل فورًا بعد الدفع.`}
          highlighted
          actionLabel={
            isLeader ? (state === "active" ? "اشتراككم مفعّل ✓" : "فعّلوا الاشتراك الآن") : undefined
          }
          actionDisabled={state === "active"}
          onAction={() => setCheckoutOpen(true)}
        >
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-accent-400 px-3 py-1 text-[11px] font-extrabold text-white">
            الأكثر شيوعًا
          </span>
          <ul className="mt-1 space-y-2.5">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-brand-950/70">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-amber-accent-600" />
                {f}
              </li>
            ))}
          </ul>
          {!isLeader && (
            <p className="mt-4 text-xs font-semibold text-brand-950/45">
              خلّوا قائد فريقكم يفعّل الاشتراك بالبطاقة.
            </p>
          )}
        </ActionCard>
      </div>

      <Card>
        <CardHeader title="أسئلة شائعة" subtitle="FAQ" />
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-bold text-brand-950">هل السعر ثابت مهما كان عدد الفريق؟</p>
            <p className="mt-1 text-brand-950/55">
              لا، السعر {pricePerPerson} ريال لكل شخص، فيتغيّر تلقائيًا حسب عدد أعضاء فريقكم.
            </p>
          </div>
          <div>
            <p className="font-bold text-brand-950">كيف يتفعّل الاشتراك بعد الدفع؟</p>
            <p className="mt-1 text-brand-950/55">
              فورًا خلال ثوانٍ بعد نجاح الدفع بالبطاقة — بدون انتظار مراجعة يدوية.
            </p>
          </div>
        </div>
      </Card>

      {checkoutOpen && isLeader && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}
