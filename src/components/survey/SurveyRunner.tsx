import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { likertOptions, type Question } from "../../lib/surveyCoach";

export type AnswerMap = Record<string, string | string[] | number>;

/** يعرض الاستبيان للمشاركة: شاشة موافقة أول، ثم الأسئلة. يُستخدم بالمعاينة وبالصفحة العامة. */
export default function SurveyRunner({
  title,
  intro,
  consent,
  questions,
  isPilot,
  onSubmit,
  preview = false,
}: {
  title: string;
  intro: string;
  consent: string;
  questions: Question[];
  isPilot?: boolean;
  onSubmit: (a: AnswerMap) => Promise<string | null>;
  preview?: boolean;
}) {
  const [agreed, setAgreed] = useState(!consent.trim());
  const [tick, setTick] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (id: string, v: string | string[] | number) => {
    setAnswers((p) => ({ ...p, [id]: v }));
    setMissing((m) => m.filter((x) => x !== id));
  };

  const submit = async () => {
    const miss = questions.filter((q) => q.required && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0))).map((q) => q.id);
    if (miss.length) {
      setMissing(miss);
      document.getElementById(`q-${miss[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit(answers);
    setBusy(false);
    if (err) setError(err);
    else setDone(true);
  };

  const box = "rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6";
  const chip = (on: boolean) =>
    `rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${on ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/10"}`;

  if (done) {
    return (
      <div className="py-16 text-center">
        <CheckCircle2 size={48} className="mx-auto text-amber-300" />
        <h2 className="mt-5 font-display text-2xl font-extrabold text-white">شكرًا لمشاركتكم 🌱</h2>
        <p className="mt-2 text-sm text-white/55">تم استلام إجاباتكم.</p>
      </div>
    );
  }

  if (!agreed) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{title || "استبيان بحثي"}</h1>
        {intro && <p className="text-sm leading-relaxed text-white/60">{intro}</p>}
        <div className={box}>
          <h2 className="text-sm font-extrabold text-amber-300">الموافقة على المشاركة</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{consent}</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-semibold text-white/85">
            <input type="checkbox" checked={tick} onChange={(e) => setTick(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-400" />
            قرأت المعلومات أعلاه وأوافق على المشاركة طوعًا
          </label>
        </div>
        <button
          disabled={!tick}
          onClick={() => setAgreed(true)}
          className="w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-500 py-3.5 text-sm font-extrabold text-neutral-950 disabled:opacity-40"
        >
          ابدأوا الاستبيان
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{title || "استبيان بحثي"}</h1>
        {intro && <p className="mt-2 text-sm leading-relaxed text-white/60">{intro}</p>}
        {isPilot && <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">نسخة تجريبية — ملاحظاتكم عن وضوح الأسئلة تهمنا.</p>}
      </div>

      {questions.map((q, i) => {
        const opts = q.type === "likert" ? likertOptions : (q.options ?? []).filter((o) => o.trim());
        const val = answers[q.id];
        return (
          <section id={`q-${q.id}`} key={q.id} className={`${box} ${missing.includes(q.id) ? "!border-rose-400/60" : ""}`}>
            <h2 className="flex items-start gap-3 text-base font-bold leading-relaxed text-white">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[11px] text-amber-300">{i + 1}</span>
              <span>
                {q.text}
                {q.required && <span className="ms-1 text-rose-300">*</span>}
              </span>
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 sm:ps-9">
              {(q.type === "single" || q.type === "likert") &&
                opts.map((o, k) => (
                  <button key={o} type="button" onClick={() => set(q.id, q.type === "likert" ? String(5 - k) : o)} className={chip(val === (q.type === "likert" ? String(5 - k) : o))}>
                    {o}
                  </button>
                ))}
              {q.type === "multi" &&
                opts.map((o) => {
                  const cur = (val as string[] | undefined) ?? [];
                  const on = cur.includes(o);
                  return (
                    <button key={o} type="button" onClick={() => set(q.id, on ? cur.filter((x) => x !== o) : [...cur, o])} className={chip(on)}>
                      {o}
                    </button>
                  );
                })}
              {q.type === "number" && (
                <input
                  type="number"
                  inputMode="decimal"
                  value={(val as number | undefined) ?? ""}
                  onChange={(e) => set(q.id, e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-40 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-300/60"
                />
              )}
              {q.type === "text" && (
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={(val as string | undefined) ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
                />
              )}
            </div>
            {missing.includes(q.id) && <p className="mt-2 text-xs font-bold text-rose-300 sm:ps-9">هذا السؤال مطلوب</p>}
          </section>
        );
      })}

      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 py-3.5 text-sm font-extrabold text-neutral-950 disabled:opacity-60"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {preview ? "إرسال (معاينة — ما ينحفظ شي)" : "إرسال الإجابات"}
      </button>
    </div>
  );
}
