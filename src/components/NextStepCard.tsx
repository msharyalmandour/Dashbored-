import { Link } from "react-router-dom";
import { ArrowLeft, Bot, Flame, Target } from "lucide-react";
import Card from "./ui/Card";
import type { NextStep } from "../lib/nextSteps";

/** «وش أسوي الحين؟» — أهم خطوة جاية بزر واحد، وخطوتين بعدها. كلها محسوبة من بيانات فريقكم (بدون ذكاء اصطناعي). */
export default function NextStepCard({ steps, isFemale }: { steps: NextStep[]; isFemale: boolean }) {
  if (steps.length === 0) {
    return (
      <Card tone="teal" className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white">
          <Target size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-brand-950">كل شي ماشي 👌</p>
          <p className="text-xs text-brand-950/55">ما فيه شي عاجل الحين. {isFemale ? "اسألي" : "اسأل"} الكوتش عن أفضل استغلال لوقتكم.</p>
        </div>
        <Bot size={18} className="text-brand-600" />
      </Card>
    );
  }
  const [first, ...rest] = steps;
  const urgent = first.tone === "urgent";
  return (
    <Card tone={urgent ? "rose" : "teal"} className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${urgent ? "bg-rose-500" : "bg-brand-500"}`}>
          {urgent ? <Flame size={22} /> : <Target size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-brand-950/45">وش {isFemale ? "تسوين" : "تسوي"} الحين؟</p>
          <p className="text-base font-extrabold text-brand-950">{first.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-brand-950/60">{first.why}</p>
        </div>
        <Link
          to={first.to}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          {first.cta}
          <ArrowLeft size={15} />
        </Link>
      </div>
      {rest.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-brand-100/60 pt-3">
          <span className="self-center text-[11px] font-bold text-brand-950/40">بعدها:</span>
          {rest.slice(0, 3).map((s) => (
            <Link
              key={s.id}
              to={s.to}
              title={s.why}
              className="rounded-full border border-brand-100 bg-paper/70 px-3 py-1 text-xs font-semibold text-brand-950/70 hover:bg-surface-muted"
            >
              {s.title}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
