import type { Tile } from "../../hooks/useMeetRoom";

/** عرض تجريبي (للتطوير والصور فقط): 4 طلاب + المشرف/ة */
export const DEMO_TILES: Tile[] = [
  { identity: "u0", name: "مشاري", role: "leader", isLocal: true, speaking: false, mic: true, cam: false, video: null, screen: null, hand: false },
  { identity: "s", name: "د. إسراء", role: "supervisor", isLocal: false, speaking: true, mic: true, cam: false, video: null, screen: null, hand: false },
  { identity: "u1", name: "ريان", role: "student", isLocal: false, speaking: false, mic: false, cam: false, video: null, screen: null, hand: true },
  { identity: "u2", name: "خالد", role: "student", isLocal: false, speaking: false, mic: true, cam: false, video: null, screen: null, hand: false },
  { identity: "u3", name: "أحمد", role: "student", isLocal: false, speaking: false, mic: true, cam: false, video: null, screen: null, hand: false },
];

/** نص تجريبي للعرض (الوقت نسبةً للحين) */
export function demoLines(now: number) {
  const L = (who: string, name: string, role: string, text: string, ago: number) => ({ id: `${who}-${ago}`, who, name, role, text, at: now - ago * 1000, mine: who === "u0" });
  return [
    L("s", "د. إسراء", "supervisor", "خلونا نبدأ بالعينة. كم وصلتوا للحين؟", 300),
    L("u2", "خالد", "student", "وصلنا 86 ممرضة من مستشفيين، والهدف 120.", 280),
    L("s", "د. إسراء", "supervisor", "زين. أضيفوا مستشفى ثالث عشان توصلون 120 قبل نهاية الشهر.", 250),
    L("u0", "مشاري", "leader", "تمام، أنا أكلم مستشفى الملك فهد هالأسبوع.", 220),
    L("u1", "ريان", "student", "وأنا أعدل الاستبيان حسب ملاحظات اللجنة وأرسله للدكتورة يوم الخميس.", 6),
  ];
}
