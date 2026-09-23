import { Check } from "lucide-react";
import clsx from "clsx";
import type { PhaseStatus } from "../data/types";

interface PhaseTrackerStage {
  id: string;
  titleAr: string;
  titleEn: string;
  status: PhaseStatus;
}

export default function PhaseTracker({ stages }: { stages: PhaseTrackerStage[] }) {
  return (
    <div className="flex items-start justify-between overflow-x-auto pb-1">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex flex-1 items-start">
          <div className="flex min-w-[92px] flex-col items-center gap-2 text-center">
            <div
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-500",
                stage.status === "done" &&
                  "border-brand-500 bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-[0_0_12px_-1px_rgba(255,106,0,0.55)]",
                stage.status === "active" &&
                  "border-brand-500 bg-gradient-to-br from-paper to-brand-50 text-brand-600 [animation:orb-pulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none",
                stage.status === "upcoming" &&
                  "border-brand-100/70 bg-paper text-brand-950/25",
              )}
            >
              {stage.status === "done" ? (
                <Check size={16} />
              ) : stage.status === "active" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-950/20" />
              )}
            </div>
            <div>
              <p
                className={clsx(
                  "text-xs font-semibold",
                  stage.status === "upcoming" ? "text-brand-950/35" : "text-brand-950/80",
                )}
              >
                {stage.titleAr}
              </p>
              <p
                className={clsx(
                  "text-[10px]",
                  stage.status === "upcoming" ? "text-brand-950/25" : "text-brand-950/40",
                )}
              >
                {stage.titleEn}
              </p>
            </div>
          </div>
          {i < stages.length - 1 && (
            <div
              className={clsx(
                "mt-[18px] h-1 flex-1 rounded-full transition-colors duration-500",
                stage.status === "done"
                  ? "bg-gradient-to-l from-brand-600 via-brand-500 to-brand-400 shadow-[0_0_8px_-1px_rgba(255,106,0,0.5)]"
                  : "bg-[var(--color-track)]",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
