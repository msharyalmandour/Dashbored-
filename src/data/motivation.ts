import type { GreetingPeriod } from "../lib/date";
import { tr } from "../lib/i18n";

export const motivationalQuotes: string[] = [
  tr("التعب مؤقت، بس اسمك على غلاف البحث يبقى للأبد."),
  tr("كل فقرة تكتبها اليوم خطوة أقرب للتخرج."),
  tr("خذ نفس عميق، اشرب قهوتك، وارجع أقوى ☕"),
  tr("البحث رحلة مو سباق — امشِ بخطاك وثق بنفسك."),
  tr("ما فيه باحث بدأ بمقترح مثالي — البداية دايمًا مسودة."),
  tr("استراحتك جزء من إنتاجيتك، مو ضدها."),
  tr("مهما طال الطريق، كل سطر تكتبه اليوم يُحسب لك."),
  tr("أنت أقرب لتحقيق حلمك من أمس بخطوة."),
  tr("لو تعبت اليوم، تذكر ليش بدأت."),
  tr("أعظم الأبحاث بدأت بسؤال بسيط وفنجان قهوة."),
];

/** بدون كافيين — تُستخدم بعد المساء عشان ما تشجّع سهر زايد */
export const nightQuotes: string[] = [
  tr("لو تقدر تنام بدري الليلة، بكرة تركيزك يفرق."),
  tr("خذ نفس عميق، اشرب مويه، وكمّل بهدوء."),
  tr("النوم الكافي جزء من خطة البحث، مو رفاهية."),
  tr("سطر أو سطرين الحين، والباقي يوفّرله بكرة وأنت مرتاح."),
  tr("لو تحس بالتعب، خلها آخر خطوة الليلة وارجع بنشاط بكرة."),
];

export function getDailyQuote(date: Date = new Date(), period?: GreetingPeriod): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  if (period === "night") {
    return nightQuotes[dayOfYear % nightQuotes.length];
  }
  return motivationalQuotes[dayOfYear % motivationalQuotes.length];
}
