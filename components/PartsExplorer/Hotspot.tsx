import type { Part } from "@/lib/types";

export default function Hotspot({
  part,
  dimmed,
  selected,
  onSelect,
}: {
  part: Part;
  dimmed: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <g
      transform={`translate(${part.hotspot.x} ${part.hotspot.y})`}
      onClick={() => onSelect(part.id)}
      className="cursor-pointer outline-none"
      style={{
        opacity: dimmed ? 0.18 : 1,
        transition: "opacity 400ms ease",
      }}
      tabIndex={0}
      role="button"
      aria-label={part.name}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(part.id);
      }}
    >
      {!selected && (
        <circle r={12} fill="var(--color-accent)" opacity={0.25}>
          <animate
            attributeName="r"
            values="9;15;9"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0;0.3"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <circle
        r={selected ? 9 : 7}
        fill={selected ? "var(--color-primary)" : "var(--color-accent)"}
        stroke="var(--color-bg)"
        strokeWidth={2}
      />
    </g>
  );
}
