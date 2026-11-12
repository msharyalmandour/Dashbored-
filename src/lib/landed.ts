import { useEffect, useState } from "react";
import { journeySections, workSections, isPathIn } from "./navSections";

/* هيرو «ارموا» · انحطت بأماكنها: شارة +N تنبض مرتين جنب القسم اللي راح له الشي بالقائمة الجانبية */

export const LANDED_EVENT = "wesync:landed";
const SHOW_MS = 9000;

/** المسار (بدون ?…) → القسم بالقائمة */
export function sectionOf(route: string): string | null {
  const path = route.split("?")[0];
  for (const s of [...journeySections, ...workSections]) if (s.pages.some((p) => isPathIn(path, p.to.split("?")[0]))) return s.id;
  return null;
}

/** counts: القسم → كم شي انحط فيه */
export function announceLanded(counts: Record<string, number>) {
  window.dispatchEvent(new CustomEvent(LANDED_EVENT, { detail: counts }));
}

export function useLandedBadges(): Record<string, number> {
  const [badges, setBadges] = useState<Record<string, number>>({});
  useEffect(() => {
    let t = 0;
    const on = (e: Event) => {
      setBadges((e as CustomEvent<Record<string, number>>).detail ?? {});
      window.clearTimeout(t);
      t = window.setTimeout(() => setBadges({}), SHOW_MS);
    };
    window.addEventListener(LANDED_EVENT, on);
    return () => {
      window.removeEventListener(LANDED_EVENT, on);
      window.clearTimeout(t);
    };
  }, []);
  return badges;
}
