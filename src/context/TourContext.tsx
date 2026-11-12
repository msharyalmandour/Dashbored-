import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { tourSteps } from "../data/onboardingTour";

const COMPLETED_KEY = "nursync.tourCompletedSteps";
const FINISHED_KEY = "nursync.tourFinished";

interface TourContextValue {
  steps: typeof tourSteps;
  activeIndex: number | null;
  completedIds: Set<string>;
  finished: boolean;
  startTour: () => void;
  /** يبدأ الجولة من خطوة صفحة معينة (زر «؟»). false = ما لها خطوة */
  startAt: (route: string) => boolean;
  next: () => void;
  prev: () => void;
  close: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(loadCompleted);
  const [finished, setFinished] = useState(() => localStorage.getItem(FINISHED_KEY) === "1");

  useEffect(() => {
    if (activeIndex === null) return;
    const step = tourSteps[activeIndex];
    navigate(step.route);
    setCompletedIds((prev) => {
      if (prev.has(step.id)) return prev;
      const updated = new Set(prev).add(step.id);
      localStorage.setItem(COMPLETED_KEY, JSON.stringify([...updated]));
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const startTour = () => setActiveIndex(0);
  const startAt = (route: string) => {
    const i = tourSteps.findIndex((st) => st.route === route);
    if (i < 0) return false;
    setActiveIndex(i);
    return true;
  };

  const next = () => {
    if (activeIndex === null) return;
    if (activeIndex >= tourSteps.length - 1) {
      setActiveIndex(null);
      setFinished(true);
      localStorage.setItem(FINISHED_KEY, "1");
      return;
    }
    setActiveIndex(activeIndex + 1);
  };

  const prev = () => {
    if (activeIndex === null || activeIndex === 0) return;
    setActiveIndex(activeIndex - 1);
  };

  const close = () => setActiveIndex(null);

  return (
    <TourContext.Provider
      value={{ steps: tourSteps, activeIndex, completedIds, finished, startTour, startAt, next, prev, close }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
