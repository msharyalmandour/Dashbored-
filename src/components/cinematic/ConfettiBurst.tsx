const COLORS = ["#c93f64", "#ec9312", "#1683f5", "#34d399", "#f472b6"];
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  angle: (360 / 14) * i + Math.random() * 20,
  distance: 60 + Math.random() * 50,
  color: COLORS[i % COLORS.length],
  delay: Math.random() * 80,
}));

/** رشّة احتفال صغيرة (بدون مكتبة خارجية) تنطلق من مركز العنصر وتختفي —
    تُستخدم عند إكمال مهمة عشان الإنجاز يحس فوري وملموس. */
export default function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center motion-reduce:hidden">
      <div className="relative h-1 w-1">
        {PARTICLES.map((p, i) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = Math.cos(rad) * p.distance;
          const y = Math.sin(rad) * p.distance;
          return (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full opacity-0"
              style={{
                backgroundColor: p.color,
                animation: `confetti-pop 900ms ease-out ${p.delay}ms forwards`,
                ["--dx" as string]: `${x}px`,
                ["--dy" as string]: `${y}px`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
