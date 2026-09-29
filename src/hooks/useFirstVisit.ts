import { useState } from "react";

const STORAGE_KEY = "nursync.firstVisit";

/** تاريخ أول زيارة على الإطلاق لهذا الجهاز (يُحفظ للأبد، بعكس useVisitGap) */
export function useFirstVisit(): { firstVisit: string; daysSince: number } {
  const [firstVisit] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, now);
      return now;
    } catch {
      return new Date().toISOString();
    }
  });

  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - new Date(firstVisit).getTime()) / 86_400_000),
  );

  return { firstVisit, daysSince };
}
