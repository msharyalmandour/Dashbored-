import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { glossaryById } from "../data/glossary";

/** مصطلح بخط منقّط — بالضغط ينفتح شرحه بجملتين بالعربي البسيط، بدون ما تطلع الطالبة من صفحتها. */
export default function Term({ id, children }: { id: string; children?: ReactNode }) {
  const entry = glossaryById[id];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!entry) return <>{children}</>;
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cursor-help border-b border-dotted border-brand-500/70 font-inherit text-inherit hover:text-brand-600"
        aria-expanded={open}
      >
        {children ?? entry.ar}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute start-0 top-full z-50 mt-1.5 block w-64 rounded-2xl border border-brand-100/60 bg-paper p-3 text-start text-xs font-normal leading-relaxed text-brand-950/80 shadow-2xl"
        >
          <span className="block text-[11px] font-extrabold text-brand-600">
            {entry.ar} <span className="font-mono font-semibold text-brand-950/40" dir="ltr">· {entry.term}</span>
          </span>
          <span className="mt-1 block">{entry.def}</span>
          {entry.example && <span className="mt-1.5 block rounded-lg bg-surface-muted px-2 py-1 text-brand-950/60">{entry.example}</span>}
          <Link to="/glossary" className="mt-2 block text-[11px] font-bold text-brand-600 hover:underline">
            كل المصطلحات ←
          </Link>
        </span>
      )}
    </span>
  );
}
