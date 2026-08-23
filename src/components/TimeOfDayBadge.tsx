import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import clsx from "clsx";
import type { GreetingPeriod } from "../lib/date";

const periodIcon: Record<GreetingPeriod, typeof Sun> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
};

const periodGradient: Record<GreetingPeriod, string> = {
  morning: "from-amber-accent-300 to-amber-accent-500",
  afternoon: "from-amber-accent-400 to-amber-accent-600",
  evening: "from-amber-accent-500 to-rose-500",
  night: "from-brand-700 to-brand-950",
};

const periodGlow: Record<GreetingPeriod, string> = {
  morning: "bg-amber-accent-400",
  afternoon: "bg-amber-accent-500",
  evening: "bg-rose-400",
  night: "bg-brand-700",
};

export default function TimeOfDayBadge({ period }: { period: GreetingPeriod }) {
  const Icon = periodIcon[period];

  return (
    <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center">
      <span
        className={clsx(
          "absolute inset-0 rounded-full opacity-40 motion-reduce:hidden animate-[ping_2.6s_ease-in-out_infinite]",
          periodGlow[period],
        )}
      />
      <span
        className={clsx(
          "relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm shadow-brand-950/20",
          periodGradient[period],
        )}
      >
        <Icon size={16} />
      </span>
    </span>
  );
}
