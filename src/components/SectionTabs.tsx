import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { isTabActive, sectionForPath } from "../lib/navSections";

/** تبويبات القسم: الصفحات القريبة من بعض (مثلًا أبحث ← الوكيل / المكتبة / الأدبيات) تظهر فوق كل صفحة منها،
    بدل ما كل وحدة بند مستقل بالقائمة. */
export default function SectionTabs() {
  const { pathname, search } = useLocation();
  const section = sectionForPath(pathname);
  // «أكتب» له تبويبات بعدّادات داخل ترويسة صفحاته (WriteHeader)
  if (!section || section.pages.length < 2 || section.id === "write") return null;
  // أطول مسار مطابق هو التبويب النشط (عشان /surveys/ما يلخبط مع غيره)، والتبويب اللي يحمل ?tab=… يتقدّم على شقيقه بنفس المسار
  const active = [...section.pages]
    .filter((p) => isTabActive(pathname, search, p.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return (
    <nav aria-label={section.label} className="mb-5 flex max-w-full gap-1.5 overflow-x-auto pb-1 print:hidden">
      <span className="flex shrink-0 items-center gap-1.5 pe-2 text-xs font-bold text-amber-accent-400/80">
        <section.icon size={14} />
        {section.label}
      </span>
      {section.pages.map((p) => (
        <Link
          key={p.to}
          to={p.to}
          aria-current={active?.to === p.to ? "page" : undefined}
          className={clsx(
            "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
            active?.to === p.to
              ? "border-brand-500 bg-brand-500/15 text-amber-accent-400"
              : "border-brand-100/40 text-brand-950/55 hover:border-brand-500/40 hover:text-brand-950",
          )}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
