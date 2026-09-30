import { useMemo } from "react";

/** طبقات "سينمائية" فوق خلفية الدخول: فتحة شريطين أسودين، مسحة ضوء، حبيبات فيلم، غبار طالع، وفينيت.
    كلها CSS — ما تكلّف توليد ولا تحمّل ملفات. تنطفي كلها مع prefers-reduced-motion. */
const grainSvg =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";

export default function CinematicOverlay() {
  const dust = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        left: `${(i * 37 + 11) % 100}%`,
        bottom: `${(i * 23) % 40}%`,
        size: 2 + ((i * 7) % 3),
        delay: (i * 0.9) % 9,
        dur: 7 + ((i * 5) % 6),
        x: ((i % 2 ? 1 : -1) * (20 + ((i * 11) % 40))),
        o: 0.35 + ((i * 13) % 40) / 100,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden motion-reduce:hidden" aria-hidden>
      {/* غبار ضوئي طالع */}
      {dust.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-amber-200"
          style={
            {
              left: d.left,
              bottom: d.bottom,
              width: d.size,
              height: d.size,
              filter: "blur(0.6px)",
              opacity: 0,
              animation: `cine-dust ${d.dur}s ease-out ${d.delay}s infinite`,
              "--dust-x": `${d.x}px`,
              "--dust-o": d.o,
            } as React.CSSProperties
          }
        />
      ))}

      {/* مسحة ضوء تعبر الشاشة */}
      <div
        className="absolute inset-y-0 start-0 w-1/3 bg-gradient-to-r from-transparent via-amber-200/[0.10] to-transparent"
        style={{ animation: "cine-sweep 3.4s ease-in-out 1.4s 1 both" }}
      />

      {/* حبيبات الفيلم */}
      <div
        className="absolute -inset-[10%] opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: grainSvg, animation: "cine-grain 0.9s steps(1) 7" }}
      />

      {/* فينيت */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(3,6,10,0.75)_100%)]" />

      {/* شريطين سينمائيين يفتحون عند الدخول */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 bg-black"
        style={{ animation: "cine-bar-top 1.3s cubic-bezier(0.7, 0, 0.2, 1) 0.15s forwards" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-black"
        style={{ animation: "cine-bar-bottom 1.3s cubic-bezier(0.7, 0, 0.2, 1) 0.15s forwards" }}
      />
    </div>
  );
}
