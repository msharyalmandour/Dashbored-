import { colorClasses } from "../../lib/colors";

interface AvatarProps {
  initials: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function Avatar({ initials, color = "brand", size = "md" }: AvatarProps) {
  const c = colorClasses(color);
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${c.bg100} ${c.text700} ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
}
