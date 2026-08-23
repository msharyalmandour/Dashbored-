import { useEffect, useState } from "react";

const STORAGE_KEY = "nursync.lastVisit";

/** عدد الأيام (حسب توقيت الجهاز الفعلي) منذ آخر زيارة مسجّلة — null لأول زيارة */
export function useVisitGap(): number | null {
  const [gapDays] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const diffMs = Date.now() - new Date(stored).getTime();
      return Math.max(0, Math.floor(diffMs / 86_400_000));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
  }, []);

  return gapDays;
}
