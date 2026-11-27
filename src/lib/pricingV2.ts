/** تسعيرة صفحة الهبوط الجديدة (قرار المالك 2026-11-27): للطالب، والوكيل داخل السعر.
    - لحالك: PER_MEMBER_MONTHLY بالشهر.
    - فريق (2+): FOUNDING_TEAM_MONTHLY للطالب لأول FOUNDING_TEAMS فريق، ثابت طول بحثهم، وبعدها TEAM_MONTHLY.
    - باقة البحث كامل: دفعة وحدة للطالب تغطي RESEARCH_MONTHS شهور.
    تنبيه: الدفع الفعلي (lib/plans + public.team_monthly_total + moyasar-webhook) لازم يطابق هذي الأرقام. */
export const PER_MEMBER_MONTHLY = 37;
export const TEAM_MONTHLY = 29;
export const FOUNDING_TEAM_MONTHLY = 27;
export const FOUNDING_TEAMS = 50;
export const RESEARCH_MONTHS = 8;
export const PER_MEMBER_RESEARCH = 249;
export const TEAM_RESEARCH = 199;
export const FOUNDING_TEAM_RESEARCH = 179;

export function monthlyFor(members: number, founding: boolean): number {
  if (members <= 1) return PER_MEMBER_MONTHLY;
  return founding ? FOUNDING_TEAM_MONTHLY : TEAM_MONTHLY;
}
export function researchFor(members: number, founding: boolean): number {
  if (members <= 1) return PER_MEMBER_RESEARCH;
  return founding ? FOUNDING_TEAM_RESEARCH : TEAM_RESEARCH;
}
/** التوفير بالباقة مقارنة بالدفع الشهري طول مدة البحث، للطالب */
export function researchSaving(members: number, founding: boolean): number {
  return monthlyFor(members, founding) * RESEARCH_MONTHS - researchFor(members, founding);
}
