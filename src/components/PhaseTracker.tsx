import { Check } from "lucide-react";
import clsx from "clsx";
import type { MilestoneGroup } from "../lib/selectors";

export default function PhaseTracker({ groups }: { groups: MilestoneGroup[] }) {
  return (
    <div className="flex items-start justify-between overflow-x-auto pb-1">
      {groups.map((group, i) => (
        <div key={group.name} className="flex flex-1 items-start">
          <div className="flex min-w-[84px] flex-col items-center gap-2 text-center">
            <div
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                group.status === "done" &&
                  "border-brand-500 bg-brand-500 text-white",
                group.status === "active" &&
                  "border-brand-500 bg-paper text-brand-600",
                group.status === "upcoming" &&
                  "border-brand-100 bg-paper text-brand-950/30",
              )}
            >
              {group.status === "done" ? (
                <Check size={16} />
              ) : group.status === "active" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={clsx(
                "text-xs font-semibold",
                group.status === "upcoming" ? "text-brand-950/35" : "text-brand-950/80",
              )}
            >
              {group.name}
            </span>
          </div>
          {i < groups.length - 1 && (
            <div
              className={clsx(
                "mt-[18px] h-0.5 flex-1",
                group.status === "done" ? "bg-brand-500" : "bg-brand-100",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
