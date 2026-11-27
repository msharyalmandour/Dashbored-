import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Play, X } from "lucide-react";
import clsx from "clsx";
import ar from "../../content/page-help.ar.json";
import en from "../../content/page-help.en.json";
import { useTour } from "../../context/TourContext";
import { setActiveLesson } from "../../hooks/useAcademy";
import { allLessons } from "../../data/academy";
import { isEn, tr } from "../../lib/i18n";

/* «وش هذي الصفحة؟» (PageHelp): زر «؟» بكل صفحة يفتح لوحة جانبية 420px — اسم الصفحة، سطر يشرحها،
   3 رموز مرقمة، و«ورّوني بنفسي (30 ثانية)». المحتوى من src/content/page-help.ar.json (مو مكتوب بالكود). */

export interface PageHelpEntry {
  name: string;
  lead: string;
  symbols: { title: string; sub: string }[];
}
const CONTENT = (isEn ? en : ar) as Record<string, PageHelpEntry>;

/** أطول مسار مطابق: /meeting-minutes/new ← /meeting-minutes */
export function helpFor(pathname: string, table: Record<string, PageHelpEntry> = CONTENT): PageHelpEntry | null {
  if (table[pathname]) return table[pathname];
  const hit = Object.keys(table)
    .filter((k) => k !== "/" && pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? table[hit] : null;
}

/** «**كذا**» = عريض */
function rich(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <b key={i} className="font-extrabold text-[#F2EBE3]">{p.slice(2, -2)}</b> : p));
}

export function PageHelpButton({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { startAt, startTour } = useTour();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const help = helpFor(pathname);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    const b = btn.current;
    return () => {
      window.removeEventListener("keydown", key);
      b?.focus();
    };
  }, [open]);

  if (!help) return null;

  // «ورّوني بنفسي»: خطوة الجولة لهالصفحة، وإلا درس الأكاديمية اللي مكانه هنا، وإلا الجولة كاملة
  const showMe = () => {
    setOpen(false);
    if (startAt(pathname)) return;
    const lesson = allLessons.find((l) => l.route.split("?")[0] === pathname);
    if (lesson) {
      setActiveLesson(lesson.id);
      navigate(lesson.route);
      return;
    }
    startTour();
  };

  return (
    <>
      <button ref={btn} type="button" className={clsx("ph-btn", className)} aria-label={tr("وش هذي الصفحة؟")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} title={tr("وش هذي الصفحة؟")}>
        ؟
      </button>
      {open &&
        createPortal(
          <>
            <div className="ph-scrim" aria-hidden onClick={() => setOpen(false)} />
            <div ref={panel} className="ph-sheet" role="dialog" aria-modal="true" aria-labelledby="ph-title" tabIndex={-1}>
              <div className="flex items-start justify-between gap-3">
                <span className="pt-3 text-[13px] font-extrabold text-[#FFB444]">{tr("وش هذي الصفحة؟")}</span>
                <button type="button" className="ph-x" onClick={() => setOpen(false)} aria-label={tr("إغلاق")}>
                  <X size={18} />
                </button>
              </div>
              <h2 id="ph-title" className="lx-h1 !mt-3 !text-[44px]">
                {help.name}
              </h2>
              <p className="m-0 mt-3 text-[15px] leading-[1.9] text-[#E9D3B8]">{rich(help.lead)}</p>
              <ol className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
                {help.symbols.slice(0, 3).map((s, i) => (
                  <li key={i} className="ph-row">
                    <span className="ph-n" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 leading-[1.5]">
                      <b className="block text-[15px] text-[#F2EBE3]">{s.title}</b>
                      <span className="block text-[13px] text-[#ABA095]">{s.sub}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <span className="min-h-6 flex-1" />
              <button type="button" className="ph-show" onClick={showMe}>
                <Play size={15} aria-hidden />
                {tr("ورّوني بنفسي (30 ثانية)")}
              </button>
              <p className="m-0 mt-3 text-center text-[12px] text-[#ABA095]">{tr("علامة ؟ فوق كل صفحة تفتح هذا")}</p>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
