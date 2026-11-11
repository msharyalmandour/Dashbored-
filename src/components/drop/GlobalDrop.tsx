import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Vessel from "./Vessel";
import { useAuth } from "../../context/AuthContext";
import { flushOfflineQueue } from "../../lib/drops";
import { queueDrop } from "../../lib/dropQueue";
import { tr } from "../../lib/i18n";

/** سحب ملفات فوق أي صفحة → تغميق كامل + إطار متقطع + الوعاء مفتوح + «ارموها هنا» + عدد الملفات.
    الإفلات يبدأ رمية (source=global) ويفتح شاشة القراءة. السحب من داخل الموقع نفسه نتجاهله.
    مكتبة الأدلة لها رمي الدراسات. بالمحادثة الرمية تنحسب «من المحادثة». */
export default function GlobalDrop() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { team, currentUser, mode, canWrite } = useAuth();
  const enabled = mode === "supabase" && !!team && canWrite && pathname !== "/evidence";
  const [count, setCount] = useState(0);
  // أنواع الملفات بس (المتصفح ما يكشف الأسماء قبل الإفلات)
  const [types, setTypes] = useState<string[]>([]);
  const inside = useRef(false);

  // رميات انحفظت بدون نت: أول ما يرجع النت نقراها
  useEffect(() => {
    if (mode !== "supabase" || !team || !currentUser) return;
    const run = () => void flushOfflineQueue(team.id, currentUser.id);
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [mode, team, currentUser]);

  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const start = () => (inside.current = true);
    const end = () => (inside.current = false);
    const enter = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      depth += 1;
      setCount(Math.max(1, e.dataTransfer?.items?.length ?? 1));
      setTypes(Array.from(e.dataTransfer?.items ?? []).map((i) => i.type).slice(0, 2));
    };
    const over = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setCount(0);
    };
    const drop = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setCount(0);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      queueDrop(files, pathname === "/drop" ? "page" : pathname === "/chat" ? "chat" : "global");
      if (pathname !== "/drop") navigate("/drop");
    };
    window.addEventListener("dragstart", start);
    window.addEventListener("dragend", end);
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragstart", start);
      window.removeEventListener("dragend", end);
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [enabled, navigate, pathname]);

  if (!count) return null;
  return (
    <div className="dr-global dr-page" role="status" aria-live="polite">
      <div className="dr-global-dim" aria-hidden />
      <div className="dr-global-frame">
        <div className="relative">
          <Vessel size={typeof window !== "undefined" && window.innerWidth < 768 ? 260 : 420} state="hover" scene />
          {types.map((t, i) => {
            const k = fileKindOf(t);
            return (
              <div key={i} className="dr-gcard" style={{ insetInlineEnd: `${-12 - i * 40}px`, top: `${18 + i * 70}px`, transform: `perspective(700px) rotateY(-18deg) rotate(${i ? 6 : -12}deg) scale(${i ? 0.92 : 1})` }} aria-hidden>
                <span className="dr-gcard-ic" dir="ltr">
                  {k.tag}
                </span>
                <span className="text-[12px] font-bold leading-[1.3]">{k.label}</span>
              </div>
            );
          })}
        </div>
        <div className="dr-title -mt-[30px] text-[32px] md:text-[40px]">{tr("ارموها هنا")}</div>
        <p className="m-0 mt-1.5 text-[16px] text-[#E9D3B8]">{count === 2 ? tr("ملفين · نقراها ونوريكم وين تنحط قبل لا نحطها") : count > 2 ? tr("{0} ملفات · نقراها ونوريكم وين تنحط قبل لا نحطها", count) : tr("ملف · نقراه ونوريكم وين ينحط قبل لا نحطه")}</p>
      </div>
    </div>
  );
}

function fileKindOf(mime: string): { tag: string; label: string } {
  if (mime === "application/pdf") return { tag: "PDF", label: tr("ملف PDF") };
  if (mime.startsWith("image/")) return { tag: "IMG", label: tr("صورة") };
  if (mime.includes("word")) return { tag: "DOC", label: tr("ملف Word") };
  if (mime.includes("sheet") || mime.includes("csv") || mime.includes("excel")) return { tag: "CSV", label: tr("جدول بيانات") };
  if (mime.startsWith("text/")) return { tag: "TXT", label: tr("نص") };
  return { tag: "FILE", label: tr("ملف") };
}
