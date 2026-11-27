// منطق تذكيرات الدفع (بدون أي اتصال) — مبني على الدراسات:
// • التوقيت أهم شي: يوم الانتهاء نفسه يرجّع أكثر بكثير من بعد شهر (Baremetrics)
// • اسم الشخص بالرسالة يرفع الدفع (تجارب فواتير المستشفى والقروض)
// • «زملاؤك دفعوا» (تجربة ضرائب UK) — بس لصاحب الحصة، مو بقروب الفريق
// • التهديد بالخسارة ما يفرق عن الصياغة العادية → ما نخوّف
// • صياغة الدفع كقرار («تبي تكمل؟ اختر») ضاعفت السداد (Hallsworth 2023)
// • يوم 27 = يوم صرف المكافأة الجامعية

export type NudgeKind = "pre7" | "payday" | "day0" | "post3" | "post7";

/** أي تذكير اليوم؟ daysLeft = نهاية الاشتراك − اليوم (سالب = منتهي) */
export function nudgeKind(daysLeft: number, isPayday: boolean): NudgeKind | null {
  if (daysLeft === 7) return "pre7";
  if (daysLeft === 0) return "day0";
  if (daysLeft === -3) return "post3";
  if (daysLeft === -7) return "post7";
  if (isPayday && daysLeft <= 20 && daysLeft >= -30) return "payday";
  return null;
}

export interface PayRow {
  profile_id: string | null;
  period?: string | null;
  for_team?: boolean | null;
  created_at: string;
}
const PLAN_DAYS: Record<string, number> = { month: 30, semester: 120, year: 270 };

/** مين حصته مغطّاة الحين — نفس src/hooks/useTeamPayments.ts */
export function coveredIds(rows: PayRow[], memberIds: string[], now = Date.now()): Set<string> {
  const ids = new Set<string>();
  for (const r of rows) {
    const days = PLAN_DAYS[r.period ?? "month"] ?? 30;
    if (new Date(r.created_at).getTime() + days * 86_400_000 < now) continue;
    if (r.for_team) memberIds.forEach((m) => ids.add(m));
    else if (r.profile_id) ids.add(r.profile_id);
  }
  return ids;
}

/** «نورة» · «نورة وأحمد» · «نورة وأحمد وسارة» */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join("، ")} و${names[names.length - 1]}`;
}

export interface NudgeInput {
  kind: NudgeKind;
  firstName: string;
  female: boolean;
  teamName: string;
  paidNames: string[];
  onTrial: boolean;
  endLabel: string;
}
export interface NudgeMessage {
  title: string;
  body: string;
}

export function nudgeMessage(i: NudgeInput): NudgeMessage {
  const g = (f: string, m: string) => (i.female ? f : m);
  const what = i.onTrial ? "تجربة فريق" : "اشتراك فريق";
  const team = `«${i.teamName}»`;
  // بدون فعل مذكّر/مؤنث (ما نعرف جنس الزملاء هنا): «حصة نورة مدفوعة» · «حصص نورة وأحمد مدفوعة»
  const social = i.paidNames.length ? `${i.paidNames.length > 1 ? "حصص" : "حصة"} ${joinNames(i.paidNames)} مدفوعة ✓ ` : "";
  switch (i.kind) {
    case "pre7":
      return {
        title: `${i.onTrial ? "تجربتكم" : "اشتراككم"} ينتهي بعد أسبوع`,
        body: `هلا ${i.firstName} 👋 ${what} ${team} ينتهي ${i.endLabel}. ${g("ادفعي", "ادفع")} حصتك بضغطتين والفريق يكمل.`,
      };
    case "payday":
      return {
        title: "نزلت المكافأة؟ 🎉",
        body: `${i.firstName}، ${g("جدّدي", "جدّد")} حصتك بضغطتين، أو ${g("خذي", "خذ")} السنة الدراسية ${g("ووفّري", "ووفّر")} أكثر.`,
      };
    case "day0":
      return {
        title: `${what} ${team} ينتهي اليوم`,
        body: social
          ? `${i.firstName}، ${social}باقي حصتك عشان الفريق يكمل بكامل أيامه.`
          : `${i.firstName}، ${g("ادفعي", "ادفع")} حصتك والفريق يكمل بدون توقف.`,
      };
    case "post3":
      return {
        title: `${g("تبين تكملين", "تبي تكمل")} مع فريقك؟`,
        body: `${i.firstName}، ${g("اختاري", "اختر")}: ${g("ادفعي", "ادفع")} حصتك الحين · ${g("اطلبي", "اطلب")} منحة · أو ${g("أوقفي", "أوقف")} اشتراكك. ${social ? social.trim() : ""}`.trim(),
      };
    case "post7":
      return {
        title: "بياناتكم محفوظة كلها 🤍",
        body: `${i.firstName}، فريق ${team} قراءة بس الحين. إذا الظروف ما تسمح، المنحة موجودة بدون إحراج — ${g("كلّمينا", "كلّمنا")} من صفحة الاشتراك.`,
      };
  }
}
