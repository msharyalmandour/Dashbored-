import { useEffect, useState } from "react";
import { Check, ExternalLink, FileText, X } from "lucide-react";
import { GoogleDriveLogo } from "./BrandLogos";
import { driveNotice, useDriveNotice } from "../../lib/driveNotice";

/** إشعار الرفع لدرايف: ينزل من فوق ← شريط تقدّم ← أيقونة الملف تطير لشعار درايف ← ✓ خضراء ← النتيجة، ويختفي بعد ٤ ثواني */
export default function DriveNotice() {
  const n = useDriveNotice();
  const [flown, setFlown] = useState(false);

  useEffect(() => {
    if (!n) return;
    if (n.phase === "uploading") {
      setFlown(false);
      return;
    }
    // الملف يطير لدرايف أول، وبعدها تطلع النتيجة
    const fly = setTimeout(() => setFlown(true), n.phase === "done" ? 450 : 0);
    const hide = setTimeout(() => driveNotice.clear(n.id), 4600);
    return () => {
      clearTimeout(fly);
      clearTimeout(hide);
    };
  }, [n]);

  if (!n) return null;
  const failed = n.phase === "failed";
  const done = n.phase === "done" && flown;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[250] flex justify-center px-4" role="status" aria-live="polite">
      <div className="drive-notice pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.95)] p-4 text-[#F4F0EC] shadow-[0_24px_70px_rgba(0,0,0,.6)] backdrop-blur-[18px]">
        <div className="flex items-center gap-4">
          {/* مسار الطيران: الملف يمين ← درايف يسار (اتجاه ثابت بغض النظر عن RTL) */}
          <div dir="ltr" className="relative flex h-12 w-28 shrink-0 items-center justify-between">
            <span
              className={`drive-notice__file absolute left-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#FFB444] ${n.phase === "done" ? "drive-notice__file--fly" : ""} ${flown ? "opacity-0" : ""}`}
              style={failed ? { opacity: 1, transform: "none" } : undefined}
            >
              <FileText size={20} />
            </span>
            <span className="ml-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/15">
              {done ? (
                <span className="drive-notice__check flex h-9 w-9 items-center justify-center rounded-full bg-[#7fd6a0] text-[#06210f]">
                  <Check size={20} strokeWidth={3.2} />
                </span>
              ) : failed ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-400/90 text-[#2a0508]">
                  <X size={20} strokeWidth={3.2} />
                </span>
              ) : (
                <GoogleDriveLogo size={26} />
              )}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-start">
            {failed ? (
              <>
                <p className="text-sm font-bold">ما انرفع لدرايف</p>
                <p className="text-xs text-[#B8ADA2]">{n.message ?? "المحضر محفوظ عندنا. جرّبوا «رفع لدرايف» من المحضر."}</p>
              </>
            ) : done ? (
              <>
                <p className="text-sm font-bold">انحفظ في درايف</p>
                <p className="text-xs text-[#B8ADA2]">وصل للفريق وللمشرف</p>
                {n.link && (
                  <a href={n.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#FFB444] hover:underline">
                    <ExternalLink size={12} />
                    افتح الملف
                  </a>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-bold">نرفع المحضر لدرايف…</p>
                <p className="text-xs text-[#B8ADA2]">ثواني ويوصل لمجلد الفريق</p>
              </>
            )}
          </div>
        </div>
        {!failed && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div className={`h-full rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] ${n.phase === "uploading" ? "drive-notice__bar" : "w-full"}`} />
          </div>
        )}
      </div>
    </div>
  );
}
