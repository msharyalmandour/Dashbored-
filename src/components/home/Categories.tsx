import Link from "next/link";
import { PerfumeBottle } from "@/components/ui/PerfumeBottle";

const CATEGORIES = [
  { label: "عطور رجالية", href: "/shop?gender=men", accent: "#3d3d3d" },
  { label: "عطور نسائية", href: "/shop?gender=women", accent: "#b76e79" },
  { label: "عود وبخور", href: "/shop?category=عود وبخور", accent: "#caa14d" },
];

export function Categories() {
  return (
    <section className="border-y border-border bg-surface/60">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <span className="text-xs tracking-[0.3em] text-gold">تسوق حسب الفئة</span>
          <h2 className="font-display text-3xl text-foreground sm:text-4xl">
            مجموعاتنا
          </h2>
          <div className="gold-divider w-16" />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border bg-surface-raised p-10 text-center transition-colors hover:border-gold/60"
            >
              <PerfumeBottle
                accentColor={cat.accent}
                className="h-40 w-auto transition-transform duration-500 group-hover:scale-105"
              />
              <span className="font-display text-xl text-foreground group-hover:text-gold">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
