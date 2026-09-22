import { useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FolderClosed,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import GrowingPlant from "../components/GrowingPlant";
import CheckoutModal from "../components/CheckoutModal";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { getTeamSubscriptionState, subscriptionStateLabel } from "../lib/subscription";
import { daysUntil, formatDateLong } from "../lib/date";

const includedFeatures = [
  { icon: FolderClosed, label: "كل صفحات إدارة البحث — مقترح، منهجية، مهام، أدلة" },
  { icon: Users2, label: "دعوة كل أعضاء الفريق بدون حد" },
  { icon: GraduationCap, label: "رابط قراءة لمشرفكم بدون أي اشتراك منها" },
  { icon: Sparkles, label: "تصدير المستندات والتقويم، ومساعد ذكي مدمج" },
];

export default function Pricing() {
  const { team, isLeader } = useAuth();
  const { roster } = useTeamRoster();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const state = getTeamSubscriptionState(team?.subscriptionEndDate);
  const daysLeft = team?.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;
  const pricePerPerson = team?.monthlyPrice ?? 40;
  const memberCount = roster.length || 1;
  const total = pricePerPerson * memberCount;
  const isActive = state === "active";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-[2rem] bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
        <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-gradient-to-b from-brand-50 to-paper px-6 py-10 text-center sm:px-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-[blob-drift_11s_ease-in-out_infinite] rounded-full bg-amber-accent-200/40 blur-3xl motion-reduce:animate-none" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-brand-200/30 blur-3xl" />

          <span className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-accent-300/60 bg-white/60 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-accent-700 backdrop-blur-sm">
            <Sparkles size={12} />
            Wesync Premium
          </span>

          <h1 className="relative mt-4 font-display text-2xl font-extrabold leading-snug text-brand-950 sm:text-3xl">
            بحثكم يستحق مساحة تواكبه
            <br />
            <span className="bg-gradient-to-l from-brand-600 to-amber-accent-600 bg-clip-text text-transparent">
              من أول فكرة، لآخر صفحة
            </span>
          </h1>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-brand-950/55">
            باقة واحدة بسيطة تجمع فريقكم كامل — {pricePerPerson} ريال شهريًا لكل عضو، وجنبكم من أول يوم لآخر تسليم 🌱
          </p>

          <div className="relative mx-auto mt-7 flex w-fit items-center justify-center">
            <GrowingPlant className="h-32 w-32 opacity-95 sm:h-40 sm:w-40" />
          </div>
        </div>
      </div>

      {/* Feature checklist */}
      <Card>
        <CardHeader title="كل هذا مشمول" subtitle="What's included" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {includedFeatures.map((f) => (
            <div key={f.label} className="flex items-start gap-3 rounded-2xl bg-surface-muted p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/30">
                <f.icon size={15} />
              </span>
              <p className="mt-1 text-sm font-semibold text-brand-950/75">{f.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Price card */}
      <div className="rounded-[1.75rem] bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
        <div className="relative overflow-hidden rounded-[calc(1.75rem-1.5px)] bg-paper p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-950/10 to-transparent" />
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-amber-accent-100/70 blur-3xl" />
          <span className="absolute end-6 top-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-accent-400 to-amber-accent-500 px-3 py-1 text-[11px] font-extrabold text-white shadow-sm shadow-amber-accent-400/30">
            الأكثر قيمة
          </span>

          <div className="relative flex flex-col items-start gap-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-brand-950/50">
              <BadgeCheck size={14} className="text-brand-500" />
              حالة الاشتراك: {subscriptionStateLabel[state]}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-extrabold text-brand-950">{total}</span>
              <span className="text-sm font-semibold text-brand-950/50">ريال / شهريًا</span>
            </div>
            <p className="text-xs text-brand-950/45">
              {pricePerPerson} ريال × {memberCount} {memberCount === 1 ? "عضو" : "أعضاء"} بفريقكم
            </p>
          </div>

          {team?.subscriptionEndDate && (
            <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-brand-950/60">
              <CalendarClock size={14} className="text-brand-500" />
              {isActive
                ? `متبقٍ ${Math.max(daysLeft, 0)} ${daysLeft === 1 ? "يوم" : "أيام"} — ينتهي ${formatDateLong(team.subscriptionEndDate)}`
                : `انتهى بتاريخ ${formatDateLong(team.subscriptionEndDate)}`}
            </p>
          )}

          {isLeader ? (
            <button
              onClick={() => setCheckoutOpen(true)}
              disabled={isActive}
              className="relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-l from-brand-500 to-brand-600 py-3.5 text-sm font-extrabold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_6px_16px_-4px_rgba(0,0,0,0.25)] transition-shadow hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_8px_20px_-4px_rgba(0,0,0,0.3)] disabled:cursor-default disabled:opacity-70 disabled:shadow-none"
            >
              <CreditCard size={16} />
              {isActive ? "اشتراككم مفعّل ✓" : "فعّلوا الاشتراك الآن"}
            </button>
          ) : (
            <p className="mt-6 rounded-2xl bg-surface-muted px-3.5 py-3 text-center text-xs font-semibold text-brand-950/50">
              خلّوا قائد فريقكم يفعّل الاشتراك بالبطاقة.
            </p>
          )}

          <p className="mt-3 text-center text-[11px] text-brand-950/40">
            ٧ أيام تجربة مجانية كاملة المزايا عند بداية الفريق · دفع آمن عبر Moyasar
          </p>
        </div>
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
          <div className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-500" />
            <p className="text-xs text-brand-950/55">
              معلومات بطاقتكم ما تمر إلا عبر Moyasar مباشرة — الموقع ما يخزّن أي بيانات دفع.
            </p>
          </div>
        </div>
      </Card>

      {checkoutOpen && isLeader && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}
