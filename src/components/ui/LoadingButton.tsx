import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** شغّال الحين؟ (الصفحة هي اللي تعرف — الزر بس يعرض الحالة) */
  loading?: boolean;
  /** انتهت العملية بخطأ → يعرض «أعد المحاولة» لين يضغط عليه */
  error?: boolean;
  loadingText?: string;
  savedText?: string;
  errorText?: string;
  /** يعرض «✓ انحفظ» ثانيتين بعد النجاح (أوقفوه للأزرار اللي ما تحفظ شي، مثل «ابحث») */
  showSaved?: boolean;
  variant?: "primary" | "ghost";
  children: ReactNode;
};

const base = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed";
const variants = {
  primary: "bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00] shadow-[0_8px_28px_-8px_#FF6B00] hover:brightness-110 disabled:opacity-60",
  ghost: "border border-[#FF6B00]/40 text-[#FFB444] hover:bg-[#FF6B00]/10 disabled:opacity-60",
};

/** زر بحالات: عادي ← تحميل (دائرة صغيرة + نص) ← «✓ انحفظ» أخضر ثانيتين ← أو خطأ + «أعد المحاولة». */
export default function LoadingButton({
  loading = false,
  error = false,
  loadingText = "جاري الحفظ…",
  savedText = "✓ انحفظ",
  errorText = "أعد المحاولة",
  showSaved = true,
  variant = "primary",
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Props) {
  const [phase, setPhase] = useState<"idle" | "saved" | "error">("idle");
  const was = useRef(loading);

  useEffect(() => {
    const finished = was.current && !loading;
    was.current = loading;
    if (loading) {
      setPhase("idle");
      return;
    }
    if (!finished) return;
    if (error) {
      setPhase("error");
      return;
    }
    if (!showSaved) return;
    setPhase("saved");
    const t = setTimeout(() => setPhase("idle"), 2000);
    return () => clearTimeout(t);
  }, [loading, error, showSaved]);

  const state = loading ? "loading" : phase;
  return (
    <button
      type={type}
      disabled={disabled || loading || phase === "saved"}
      aria-busy={loading}
      className={clsx(
        base,
        state === "saved"
          ? "border border-[#7fd6a0]/50 bg-[#7fd6a0]/15 text-[#7fd6a0]"
          : state === "error"
            ? "border border-rose-400/60 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
            : variants[variant],
        className,
      )}
      {...rest}
    >
      {state === "loading" ? (
        <>
          <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
          {loadingText}
        </>
      ) : state === "saved" ? (
        savedText
      ) : state === "error" ? (
        errorText
      ) : (
        children
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "loading" ? loadingText : state === "saved" ? "تم الحفظ" : state === "error" ? "تعذّر الحفظ" : ""}
      </span>
    </button>
  );
}
