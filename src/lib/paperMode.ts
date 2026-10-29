import { useEffect, useState } from "react";
import { saveProfilePref } from "./profilePrefs";

/** «وضع الورقة» بمحررات الكتابة: يتحفظ لكل مستخدم بالجهاز وبحسابه (profiles.paper_mode)، ويتزامن بين الصفحات المفتوحة. */
const key = (userId: string | null | undefined) => `wesync.paperMode.${userId || "guest"}`;
const EVENT = "wesync:paper-mode";

/** يكتب القيمة بالجهاز ويبلّغ الصفحات المفتوحة (من غير ما يحفظ بالحساب) */
export function storePaperMode(userId: string | null | undefined, on: boolean) {
  try {
    localStorage.setItem(key(userId), on ? "1" : "0");
  } catch {
    // بدون تخزين: لهالصفحة بس
  }
  window.dispatchEvent(new Event(EVENT));
}

export function getPaperMode(userId?: string | null): boolean {
  try {
    return localStorage.getItem(key(userId)) === "1";
  } catch {
    return false;
  }
}

export function usePaperMode(userId?: string | null): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => getPaperMode(userId));
  useEffect(() => {
    setOn(getPaperMode(userId));
    const sync = () => setOn(getPaperMode(userId));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);
  const set = (next: boolean) => {
    setOn(next);
    storePaperMode(userId, next);
    saveProfilePref(userId, "paper_mode", next);
  };
  return [on, set];
}
