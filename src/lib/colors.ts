export type AccentColor = "brand" | "sky-accent" | "amber-accent";

interface ColorClasses {
  bg50: string;
  bg100: string;
  bg500: string;
  text600: string;
  text700: string;
  ring: string;
  border: string;
}

const map: Record<AccentColor, ColorClasses> = {
  brand: {
    bg50: "bg-brand-50",
    bg100: "bg-brand-100",
    bg500: "bg-brand-500",
    text600: "text-brand-600",
    text700: "text-brand-700",
    ring: "ring-brand-200",
    border: "border-brand-200",
  },
  "sky-accent": {
    bg50: "bg-sky-accent-50",
    bg100: "bg-sky-accent-100",
    bg500: "bg-sky-accent-500",
    text600: "text-sky-accent-600",
    text700: "text-sky-accent-600",
    ring: "ring-sky-accent-200",
    border: "border-sky-accent-200",
  },
  "amber-accent": {
    bg50: "bg-amber-accent-50",
    bg100: "bg-amber-accent-100",
    bg500: "bg-amber-accent-500",
    text600: "text-amber-accent-600",
    text700: "text-amber-accent-600",
    ring: "ring-amber-accent-200",
    border: "border-amber-accent-200",
  },
};

export function colorClasses(color: string): ColorClasses {
  return map[(color as AccentColor) in map ? (color as AccentColor) : "brand"];
}
