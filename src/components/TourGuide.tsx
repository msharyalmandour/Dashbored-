import { X } from "lucide-react";
import Logo from "./Logo";
import { useTour } from "../context/TourContext";

/** مرشدة عائمة تتبع المستخدمة بين الصفحات أثناء الجولة التعريفية — كل خطوة
    تنقلها فعليًا للصفحة وتشرح لها وش فيها، بدل نافذة منبثقة ثابتة بمكانها */
export default function TourGuide() {
  const { steps, activeIndex, next, prev, close } = useTour();
  if (activeIndex === null) return null;

  const step = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;

  return (
    <div className="fixed bottom-6 end-6 z-50 w-[calc(100%-3rem)] max-w-sm print:hidden">
      <div className="animate-[panel-in_0.4s_ease-out] rounded-3xl border border-brand-100 bg-paper p-5 shadow-2xl shadow-brand-950/15">
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 animate-[card-float_3.5s_ease-in-out_infinite]"
            style={{ "--tilt": "0deg" } as React.CSSProperties}
          >
            <Logo size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs font-bold text-brand-600">
                <step.icon size={12} />
                خطوة {activeIndex + 1} من {steps.length} — {step.label}
              </p>
              <button
                onClick={close}
                className="shrink-0 rounded-lg p-1 text-brand-950/30 hover:bg-surface-muted hover:text-brand-950/60"
                title="إنهاء الجولة"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-1.5 font-display text-base font-bold text-brand-950">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-brand-950/65">{step.body}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 w-1.5 rounded-full ${i === activeIndex ? "bg-brand-500" : "bg-brand-100"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-brand-950/50 hover:bg-surface-muted"
              >
                السابق
              </button>
            )}
            <button
              onClick={next}
              className="rounded-xl bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
            >
              {isLast ? "خلصنا! 🎉" : "التالي"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
