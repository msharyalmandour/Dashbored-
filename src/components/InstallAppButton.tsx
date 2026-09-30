import { useState } from "react";
import { createPortal } from "react-dom";
import { Download, MoreVertical, PlusSquare, Share, X } from "lucide-react";
import { useInstallApp } from "../hooks/useInstallApp";

type Variant = "dark" | "light";

const btn: Record<Variant, string> = {
  dark: "border-white/15 bg-white/[0.06] text-white/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md hover:bg-white/10",
  light: "border-brand-200 bg-paper text-brand-800 hover:bg-surface-muted",
};

function Step({ n, icon: Icon, children }: { n: number; icon: typeof Share; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs font-extrabold text-amber-300">{n}</span>
      <span className="pt-0.5 text-sm leading-relaxed text-white/80">
        {children}
        <Icon size={14} className="mx-1.5 inline-block align-[-2px] text-amber-300" />
      </span>
    </li>
  );
}

/** زر "ثبّتوا التطبيق" — يخفي نفسه لو التطبيق مثبّت أصلًا. أندرويد: نافذة التثبيت مباشرة. آيفون: خطوات مصوّرة. */
export default function InstallAppButton({ variant = "dark", className = "" }: { variant?: Variant; className?: string }) {
  const { mode, install } = useInstallApp();
  const [open, setOpen] = useState(false);

  if (mode === "installed") return null;

  const onClick = async () => {
    if (mode === "prompt") await install();
    else setOpen(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${btn[variant]} ${className}`}
      >
        <Download size={14} />
        ثبّتوا التطبيق على جوالكم
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
            <div
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm animate-[panel-in_0.3s_ease-out] rounded-[2rem] border border-white/15 bg-[#0b1116] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-extrabold text-white">Wesync على شاشتكم الرئيسية</p>
                  <p className="mt-1 text-xs text-white/50">يفتح بملء الشاشة مثل أي تطبيق، وبدون ما تنزّلون شي من المتجر.</p>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white" aria-label="إغلاق">
                  <X size={16} />
                </button>
              </div>

              {mode === "ios" && (
                <ol className="mt-5 space-y-4">
                  <Step n={1} icon={Share}>
                    اضغطوا زر المشاركة أسفل سفاري
                  </Step>
                  <Step n={2} icon={PlusSquare}>
                    مرّروا لتحت واختاروا «إضافة إلى الشاشة الرئيسية»
                  </Step>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs font-extrabold text-amber-300">3</span>
                    <span className="pt-0.5 text-sm text-white/80">اضغطوا «إضافة» — وتلقون أيقونة Wesync بين تطبيقاتكم ✨</span>
                  </li>
                </ol>
              )}

              {mode === "ios-other-browser" && (
                <p className="mt-5 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-200">
                  على الآيفون التثبيت يشتغل من <b>سفاري</b> فقط. انسخوا الرابط وافتحوه بسفاري، وبعدها اضغطوا زر المشاركة ← «إضافة إلى الشاشة الرئيسية».
                </p>
              )}

              {mode === "manual" && (
                <ol className="mt-5 space-y-4">
                  <Step n={1} icon={MoreVertical}>
                    افتحوا قائمة المتصفح
                  </Step>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs font-extrabold text-amber-300">2</span>
                    <span className="pt-0.5 text-sm text-white/80">اختاروا «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</span>
                  </li>
                </ol>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
