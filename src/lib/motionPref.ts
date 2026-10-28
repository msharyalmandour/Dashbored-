/** مفتاح «قلّل الحركة»: يتحفظ لكل مستخدم بالجهاز (بدون أي تغيير بالقاعدة)، ويشتغل حتى لو الجهاز ما فيه الإعداد.
    يحط data-reduce-motion على <html>، و tokens.css توقف كل حركة وانتقال لما يكون مفعّل. */

const key = (userId: string | null | undefined) => `wesync.reduceMotion.${userId || "guest"}`;
const LAST = "wesync.reduceMotion.last";

function read(k: string): boolean | null {
  try {
    const v = localStorage.getItem(k);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}

export function getReduceMotion(userId?: string | null): boolean {
  return read(key(userId)) ?? read(LAST) ?? false;
}

export function applyReduceMotion(on: boolean) {
  if (on) document.documentElement.setAttribute("data-reduce-motion", "true");
  else document.documentElement.removeAttribute("data-reduce-motion");
}

export function setReduceMotion(userId: string | null | undefined, on: boolean) {
  try {
    localStorage.setItem(key(userId), on ? "1" : "0");
    localStorage.setItem(LAST, on ? "1" : "0");
  } catch {
    // بدون تخزين: يشتغل لهالجلسة بس
  }
  applyReduceMotion(on);
  window.dispatchEvent(new CustomEvent("wesync:reduce-motion", { detail: on }));
}

/** هل الحركة لازم توقف الحين؟ (إعداد الجهاز أو مفتاح الموقع) — للحركات اللي تنحسب بالـ JS */
export function motionReduced(): boolean {
  if (document.documentElement.getAttribute("data-reduce-motion") === "true") return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
