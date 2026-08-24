import type { TeamMember } from "../data/types";

/**
 * تحدد إذا كان اشتراك الحساب فعّال — تُستخدم فقط في وضع Supabase الحقيقي.
 * وضع العرض التجريبي (mock) دايمًا "فعّال" لأنه مو مرتبط باشتراك حقيقي.
 */
export function isSubscriptionActive(user: Pick<TeamMember, "subscriptionStatus" | "trialEndsAt"> | null): boolean {
  if (!user || !user.subscriptionStatus) return true;
  if (user.subscriptionStatus === "active") return true;
  if (user.subscriptionStatus === "trial") {
    if (!user.trialEndsAt) return true;
    return new Date(user.trialEndsAt).getTime() > Date.now();
  }
  return false;
}
