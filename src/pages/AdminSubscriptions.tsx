import { useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle2, RefreshCw, ShieldCheck, Users } from "lucide-react";
import clsx from "clsx";
import Card, { CardHeader } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useAdminTeams } from "../hooks/useAdminTeams";
import { formatDateLong } from "../lib/date";
import { getTeamSubscriptionState, subscriptionStateLabel } from "../lib/subscription";

const stateBadge: Record<string, string> = {
  active: "bg-brand-50 text-brand-600",
  "expiring-soon": "bg-amber-accent-50 text-amber-accent-600",
  expired: "bg-rose-50 text-rose-600",
  none: "bg-surface-muted text-brand-950/45",
};

export default function AdminSubscriptions() {
  const { isSuperAdmin } = useAuth();
  const { teams, loading, extendSubscription } = useAdminTeams();
  const [extendingId, setExtendingId] = useState<string | null>(null);

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const handleExtend = async (teamId: string) => {
    setExtendingId(teamId);
    await extendSubscription(teamId);
    setExtendingId(null);
  };

  const activeCount = teams.filter(
    (t) => getTeamSubscriptionState(t.subscriptionEndDate) === "active",
  ).length;
  const expiringCount = teams.filter(
    (t) => getTeamSubscriptionState(t.subscriptionEndDate) === "expiring-soon",
  ).length;
  const expiredCount = teams.filter((t) => {
    const s = getTeamSubscriptionState(t.subscriptionEndDate);
    return s === "expired" || s === "none";
  }).length;

  return (
    <div className="space-y-5">
      <Card tone="teal" className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h1 className="font-display text-xl font-extrabold text-brand-950">
            إدارة الاشتراكات
          </h1>
          <p className="text-sm text-brand-950/55">
            كل الفرق المسجّلة بالنظام — فعّلي اشتراك أي فريق بعد ما تتأكدين من تحويل STC Pay.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card tone="cream">
          <p className="text-sm font-semibold text-brand-950/60">فرق نشطة</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-brand-950">
            {activeCount}
          </p>
        </Card>
        <Card tone="amber">
          <p className="text-sm font-semibold text-brand-950/60">على وشك الانتهاء (7 أيام)</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-brand-950">
            {expiringCount}
          </p>
        </Card>
        <Card tone="rose">
          <p className="text-sm font-semibold text-brand-950/60">منتهية / غير مفعّلة</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-brand-950">
            {expiredCount}
          </p>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-5 pb-0">
          <CardHeader title="كل الفرق" subtitle="Teams" />
        </div>
        <ul className="divide-y divide-brand-50">
          {teams.map((team) => {
            const state = getTeamSubscriptionState(team.subscriptionEndDate);
            const isExtending = extendingId === team.id;
            return (
              <li key={team.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand-950">{team.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-950/45">
                    <Users size={12} />
                    {team.memberCount} أعضاء
                  </p>
                </div>
                <div className="text-sm text-brand-950/60">
                  {team.subscriptionEndDate
                    ? `ينتهي ${formatDateLong(team.subscriptionEndDate)}`
                    : "ما فُعّل بعد"}
                </div>
                <span
                  className={clsx(
                    "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
                    stateBadge[state],
                  )}
                >
                  {subscriptionStateLabel[state]}
                </span>
                <button
                  onClick={() => handleExtend(team.id)}
                  disabled={isExtending}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {isExtending ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  تمديد الاشتراك
                </button>
              </li>
            );
          })}
          {!loading && teams.length === 0 && (
            <li className="py-10 text-center text-sm text-brand-950/40">
              ولا فريق مسجّل بعد
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
