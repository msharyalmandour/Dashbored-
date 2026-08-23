import { Check } from "lucide-react";
import clsx from "clsx";
import type { ResearchStage } from "../data/types";

export default function PhaseTracker({ stages }: { stages: ResearchStage[] }) {
  return (
    <div className="flex items-start justify-between overflow-x-auto pb-1">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex flex-1 items-start">
          <div className="flex min-w-[92px] flex-col items-center gap-2 text-center">
            <div
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                stage.status === "done" &&
                  "border-brand-500 bg-brand-500 text-white",
                stage.status === "active" &&
                  "border-brand-500 bg-paper text-brand-600",
                stage.status === "upcoming" &&
                  "border-brand-100 bg-paper text-brand-950/30",
              )}
            >
              {stage.status === "done" ? (
                <Check size={16} />
              ) : stage.status === "active" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              ) : (
                i + 1
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
                "mt-[18px] h-0.5 flex-1",
                stage.status === "done" ? "bg-brand-500" : "bg-brand-100",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
