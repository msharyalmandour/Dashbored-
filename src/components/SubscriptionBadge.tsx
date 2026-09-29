import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { subscriptionStateLabel } from "../lib/subscription";
import { daysUntil } from "../lib/date";
import CheckoutModal from "./CheckoutModal";

const toneClasses: Record<string, string> = {
  active: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  "expiring-soon": "bg-amber-accent-100 text-amber-accent-700 hover:bg-amber-accent-200",
  expired: "bg-rose-50 text-rose-600 hover:bg-rose-100",
  none: "bg-surface-muted text-brand-950/50 hover:bg-brand-100/50",
};

/** شارة مضغوطة بحالة الاشتراك تظهر بالهيدر — تفتح نافذة الدفع مباشرة لو
    القائد محتاج يفعّل، أو تنقل لصفحة الباقات لباقي الأعضاء. تظهر فقط
    بوضع Supabase الحقيقي (نفس شرط اللافتات بـ Layout.tsx) عشان ما تظهر
    بوضع العرض التجريبي اللي ما فيه اشتراك حقيقي أصلًا. */
export default function SubscriptionBadge() {
  const { mode, team, isLeader, subscriptionState } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (mode !== "supabase" || !team) return null;

  const daysLeft = team.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;
  const needsAction = subscriptionState === "expired" || subscriptionState === "none";

  const label =
    subscriptionState === "active"
      ? subscriptionStateLabel.active
      : subscriptionState === "expiring-soon"
        ? `${Math.max(daysLeft, 0)} ${daysLeft === 1 ? "يوم" : "أيام"} متبقية`
        : subscriptionStateLabel[subscriptionState];

  const content = (
    <span
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
        toneClasses[subscriptionState],
      )}
    >
      <CalendarClock size={13} />
      {label}
    </span>
  );

  return (
    <>
      {isLeader && needsAction ? (
        <button onClick={() => setCheckoutOpen(true)}>{content}</button>
      ) : (
        <Link to="/pricing">{content}</Link>
      )}
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </>
  );
}
