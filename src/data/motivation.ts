export const motivationalQuotes: string[] = [
  "التعب مؤقت، بس اسمك على غلاف البحث يبقى للأبد.",
  "كل فقرة تكتبها اليوم خطوة أقرب للتخرج.",
  "خذ نفس عميق، اشرب قهوتك، وارجع أقوى ☕",
  "البحث رحلة مو سباق — امشِ بخطاك وثق بنفسك.",
  "ما فيه باحث بدأ بمقترح مثالي — البداية دايمًا مسودة.",
  "استراحتك جزء من إنتاجيتك، مو ضدها.",
  "مهما طال الطريق، كل سطر تكتبه اليوم يُحسب لك.",
  "أنت أقرب لتحقيق حلمك من أمس بخطوة.",
  "لو تعبت اليوم، تذكر ليش بدأت.",
  "أعظم الأبحاث بدأت بسؤال بسيط وفنجان قهوة.",
];

export function getDailyQuote(date: Date = new Date()): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return motivationalQuotes[dayOfYear % motivationalQuotes.length];
}
