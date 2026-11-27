import type { Tile } from "../../hooks/useMeetRoom";

/** عرض تجريبي (للتطوير والصور فقط): 4 طلاب + المشرف/ة */
export const DEMO_TILES: Tile[] = [
  { identity: "u0", name: "مشاري", role: "leader", isLocal: true, speaking: false, mic: true, cam: false, video: null, screen: null, hand: false },
  { identity: "s", name: "د. إسراء", role: "supervisor", isLocal: false, speaking: true, mic: true, cam: false, video: null, screen: null, hand: false },
  { identity: "u1", name: "ريان", role: "student", isLocal: false, speaking: false, mic: false, cam: false, video: null, screen: null, hand: true },
  { identity: "u2", name: "خالد", role: "student", isLocal: false, speaking: false, mic: true, cam: false, video: null, screen: null, hand: false },
  { identity: "u3", name: "أحمد", role: "student", isLocal: false, speaking: false, mic: true, cam: false, video: null, screen: null, hand: false },
];
