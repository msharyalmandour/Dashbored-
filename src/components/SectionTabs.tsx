import { useLocation } from "react-router-dom";
import { isTabActive, sectionForPath } from "../lib/navSections";
import { Segmented } from "./lux/Lux";

/** صفحات تعرض تبويبات قسمها داخل ترويستها (TasksLux / MeetLux) */
const INLINE = new Set(["/tasks"]);

function useSection() {
  const { pathname, search } = useLocation();
  const section = sectionForPath(pathname);
  if (!section || section.pages.length < 2 || section.id === "write") return null;
  // أطول مسار مطابق هو التبويب النشط، والتبويب اللي يحمل ?tab=… يتقدّم على شقيقه بنفس المسار
  const active = [...section.pages].filter((p) => isTabActive(pathname, search, p.to)).sort((a, b) => b.to.length - a.to.length)[0];
  return { section, active, pathname };
}

/** تبويبات القسم كحبوب (الحالية كريمية) — داخل ترويسة الصفحة */
export function SectionSwitch() {
  const s = useSection();
  if (!s) return null;
  return <Segmented label={s.section.label} value={s.active?.to ?? ""} items={s.section.pages.map((p) => ({ id: p.to, label: p.label, to: p.to }))} />;
}

/** تبويبات القسم فوق الصفحة (للصفحات اللي ما تعرضها بترويستها) */
export default function SectionTabs() {
  const s = useSection();
  if (!s || INLINE.has(s.pathname)) return null;
  return (
    <nav aria-label={s.section.label} className="mb-5 flex max-w-full print:hidden">
      <SectionSwitch />
    </nav>
  );
}
