import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import clsx from "clsx";
import Card, { CardHeader } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useAdminTeams } from "../hooks/useAdminTeams";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { formatDateLong } from "../lib/date";
import { getTeamSubscriptionState, subscriptionStateLabel } from "../lib/subscription";

interface TeamMemberRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

const stateBadge: Record<string, string> = {
  active: "bg-brand-50 text-brand-600",
  "expiring-soon": "bg-amber-accent-50 text-amber-accent-600",
  expired: "bg-rose-50 text-rose-600",
  none: "bg-surface-muted text-brand-950/45",
};

const monthOptions = [1, 3, 6, 12];

export default function AdminSubscriptions() {
  const { isSuperAdmin } = useAuth();
  const { teams, loading, extendSubscription, refresh } = useAdminTeams();
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [months, setMonths] = useState<Record<string, number>>({});
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, TeamMemberRow[]>>({});
  const [membersLoading, setMembersLoading] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<Record<string, string>>({});
  const [movingMemberId, setMovingMemberId] = useState<string | null>(null);

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const handleExtend = async (teamId: string) => {
    setExtendingId(teamId);
    await extendSubscription(teamId, months[teamId] ?? 1);
    setExtendingId(null);
  };

  const loadMembers = async (teamId: string) => {
    setMembersLoading(teamId);
    const { data } = await supabase!.rpc("admin_list_team_members", { p_team_id: teamId });
    if (data) setMembersByTeam((prev) => ({ ...prev, [teamId]: data as TeamMemberRow[] }));
    setMembersLoading(null);
  };

  const toggleExpand = (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      return;
    }
    setExpandedTeamId(teamId);
    if (!membersByTeam[teamId]) loadMembers(teamId);
  };

  const handleMoveMember = async (memberId: string, currentTeamId: string) => {
    const targetTeamId = moveTarget[memberId];
    if (!targetTeamId) return;
    setMovingMemberId(memberId);
    const { error } = await supabase!.rpc("admin_move_member", {
      p_member_id: memberId,
      p_target_team_id: targetTeamId,
    });
    if (!error) {
      await Promise.all([loadMembers(currentTeamId), loadMembers(targetTeamId), refresh()]);
    }
    setMovingMemberId(null);
  };

  const activeStates = new Set(["active", "expiring-soon"]);
  const activeTeams = teams.filter((t) =>
    activeStates.has(getTeamSubscriptionState(t.subscriptionEndDate)),
  );
  const expiringCount = teams.filter(
    (t) => getTeamSubscriptionState(t.subscriptionEndDate) === "expiring-soon",
  ).length;
  const expiredCount = teams.filter((t) => {
    const s = getTeamSubscriptionState(t.subscriptionEndDate);
    return s === "expired" || s === "none";
  }).length;
  const monthlyRevenue = activeTeams.reduce(
    (sum, t) => sum + t.monthlyPrice * t.memberCount,
    0,
  );

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
            ٢٥ ريال شهريًا لكل شخص — فعّلي اشتراك أي فريق بعد ما تتأكدين من تحويل STC Pay.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card tone="cream">
          <p className="text-sm font-semibold text-brand-950/60">فرق نشطة</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-brand-950">
            {activeTeams.length}
          </p>
        </Card>
        <Card tone="violet">
          <p className="text-sm font-semibold text-brand-950/60">الإيراد الشهري الحالي</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-brand-950">
            {monthlyRevenue} <span className="text-base font-medium text-brand-950/40">ريال</span>
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
            const selectedMonths = months[team.id] ?? 1;
            const isExpanded = expandedTeamId === team.id;
            return (
              <li key={team.id} className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold text-brand-950">
                    {team.name}
                    {team.isFounder && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-accent-100 px-2 py-0.5 text-[11px] font-bold text-amber-accent-700">
                        <Trophy size={11} />
                        مؤسس
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-3 text-xs text-brand-950/45">
                    <span className="flex items-center gap-1.5">
                      <Users size={12} />
                      {team.memberCount} أعضاء
                    </span>
                    <span>
                      {team.monthlyPrice} ريال/شخص —{" "}
                      <span className="font-bold text-brand-700">
                        {team.monthlyPrice * team.memberCount} ريال/شهر
                      </span>
                    </span>
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
                <select
                  value={selectedMonths}
                  onChange={(e) =>
                    setMonths((prev) => ({ ...prev, [team.id]: Number(e.target.value) }))
                  }
                  className="rounded-xl border border-brand-100 px-2.5 py-2 text-sm font-semibold text-brand-950/70 outline-none focus:border-brand-300"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? "شهر" : "أشهر"}
                    </option>
                  ))}
                </select>
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
                {isSupabaseConfigured && (
                  <button
                    onClick={() => toggleExpand(team.id)}
                    className="flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold text-brand-950/45 hover:bg-surface-muted"
                  >
                    <ChevronDown
                      size={15}
                      className={clsx("transition-transform", isExpanded && "rotate-180")}
                    />
                    الأعضاء
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 rounded-2xl bg-surface-muted p-3">
                  {membersLoading === team.id ? (
                    <p className="py-2 text-center text-xs text-brand-950/40">جارٍ التحميل...</p>
                  ) : (
                    <ul className="space-y-2">
                      {(membersByTeam[team.id] ?? []).map((member) => (
                        <li
                          key={member.id}
                          className="flex flex-wrap items-center gap-2.5 rounded-xl bg-paper px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-brand-950">
                              {member.name}{" "}
                              {member.role === "leader" && (
                                <span className="text-[11px] font-bold text-amber-accent-600">
                                  (قائد)
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-brand-950/45">{member.email}</p>
                          </div>
                          <select
                            value={moveTarget[member.id] ?? ""}
                            onChange={(e) =>
                              setMoveTarget((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                            className="rounded-lg border border-brand-100 px-2 py-1.5 text-xs font-semibold text-brand-950/70 outline-none focus:border-brand-300"
                          >
                            <option value="">نقل لفريق...</option>
                            {teams
                              .filter((t) => t.id !== team.id)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleMoveMember(member.id, team.id)}
                            disabled={!moveTarget[member.id] || movingMemberId === member.id}
                            className="flex items-center gap-1 rounded-lg bg-brand-100 px-2.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-200 disabled:opacity-50"
                          >
                            {movingMemberId === member.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <ArrowLeftRight size={12} />
                            )}
                            نقل
                          </button>
                        </li>
                      ))}
                      {(membersByTeam[team.id] ?? []).length === 0 && (
                        <li className="py-2 text-center text-xs text-brand-950/40">
                          ولا عضو بهالفريق
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
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
