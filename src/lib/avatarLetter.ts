/** حرف صورة الاسم. الألف لحالها («ا» «إ» «أ») تطلع خط أو مثل علامة تعجب، فناخذ أول حرفين («أح»، «إس») */
export function avatarLetter(name: string | null | undefined, fallback = "؟"): string {
  const n = (name ?? "").replace(/^(د\.|Dr\.?)\s*/i, "").trim();
  if (!n) return fallback;
  return /^[اأإآ]/.test(n) ? n.slice(0, 2) : n.charAt(0).toUpperCase();
}
