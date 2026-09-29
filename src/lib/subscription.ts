export type TeamSubscriptionState = "active" | "expiring-soon" | "expired" | "none";

const EXPIRING_SOON_DAYS = 7;

/** يحدد حالة اشتراك الفريق من تاريخ الانتهاء المخزّن بقاعدة البيانات */
export function getTeamSubscriptionState(
  subscriptionEndDate: string | null | undefined,
): TeamSubscriptionState {
  if (!subscriptionEndDate) return "none";
  const end = new Date(subscriptionEndDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "expired";
  if (diffDays <= EXPIRING_SOON_DAYS) return "expiring-soon";
  return "active";
}

/** فريقه بحالة "none" أو "expired" يتحول تلقائيًا لوضع قراءة فقط */
export function canTeamWrite(state: TeamSubscriptionState): boolean {
  return state === "active" || state === "expiring-soon";
}

export const subscriptionStateLabel: Record<TeamSubscriptionState, string> = {
  active: "نشط",
  "expiring-soon": "على وشك الانتهاء",
  expired: "منتهي",
  none: "لم يُفعّل بعد",
};
