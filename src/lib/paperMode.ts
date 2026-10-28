import { useEffect, useState } from "react";

/** «وضع الورقة» بمحررات الكتابة: يتحفظ لكل مستخدم بالجهاز، ويتزامن بين الصفحات المفتوحة. */
const key = (userId: string | null | undefined) => `wesync.paperMode.${userId || "guest"}`;
const EVENT = "wesync:paper-mode";

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
    try {
      localStorage.setItem(key(userId), next ? "1" : "0");
    } catch {
      // بدون تخزين: لهالصفحة بس
    }
    setOn(next);
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, set];
}
