import { useCallback, useEffect, useState } from "react";
import { BellRing, CalendarClock, Check, ChevronDown, CircleCheck, UserRound } from "lucide-react";
import SupervisorEmailCard from "../SupervisorEmailCard";
import { getSupervisorEmailStatus, type EmailStatus } from "../../lib/supervisorEmail";
import { tr, trx } from "../../lib/i18n";

const card = "rounded-3xl border border-brand-100/70 bg-paper p-5 shadow-sm shadow-brand-950/5 sm:p-7";
const inputClass = "w-full rounded-xl border border-brand-100 bg-paper px-3.5 py-2.5 text-sm text-brand-950 outline-none placeholder:text-brand-950/30 focus:border-brand-300";

function Step({ n, done, title, desc, children }: { n: number; done: boolean; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${done ? "bg-emerald-500/15 text-emerald-600" : "border border-brand-300 text-brand-600"}`}>
        {done ? <Check size={14} strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-brand-950">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-brand-950/55">{desc}</p>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}

/** «جهّزوا صفحتكم بدقيقة»: ٣ خطوات واضحة للمشرف/ة (الاسم، إيميل الإشعارات، الأوقات) بدل ما تكون مبعثرة بأسفل الصفحة.
    لما تكتمل تنطوي لسطر صغير وتقدر تفتحها وقت ما تبي تعدّل. */
export default function SupervisorSetupPanel({
  token,
  name,
  onNameChange,
  hasWindows,
  onOpenAvailability,
}: {
  token: string;
  name: string;
  onNameChange: (v: string) => void;
  hasWindows: boolean;
  onOpenAvailability: () => void;
}) {
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setEmail(await getSupervisorEmailStatus(token));
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);

  const nameDone = name.trim().length > 0;
  const emailDone = email?.state === "active";
  const doneCount = [nameDone, emailDone, hasWindows].filter(Boolean).length;
  const allDone = doneCount === 3;
  const expanded = open ?? !allDone;

  return (
    <div id="sv-setup" className={`${card} mb-4 scroll-mt-16`}>
      <button onClick={() => setOpen(!expanded)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-start">
        <span className="flex items-center gap-2 font-display text-base font-extrabold text-brand-950">
          <CircleCheck size={18} className={allDone ? "text-emerald-500" : "text-brand-500"} />
          {allDone ? tr("صفحتكم جاهزة") : tr("جهّزوا صفحتكم بدقيقة")}
          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-600">{trx("{0} من ٣", doneCount)}</span>
        </span>
        <ChevronDown size={16} className={`text-brand-950/40 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-brand-950/65">{tr("من هذي الصفحة تعتمدون محاضر الاجتماعات، وتجاوبون على قرارات الفريق، وتؤكدون المواعيد — كله بضغطة وبدون حساب ولا تنزيل برنامج. ثلاث خطوات تخلي كل شي يوصلكم لحد عندكم:")}</p>
          <ol className="mt-5 space-y-5">
            <Step n={1} done={nameDone} title={tr("اسمكم")} desc={tr("يظهر للفريق لما تردون عليهم (مثل: د. نورة).")}>
              <label className="flex items-center gap-2">
                <UserRound size={15} className="shrink-0 text-brand-950/40" />
                <input value={name} onChange={(e) => onNameChange(e.target.value)} maxLength={80} placeholder={tr("اسمكم — مثل: د. نورة")} aria-label={tr("اسمكم")} className={`${inputClass} !w-full sm:!w-72`} />
              </label>
            </Step>

            <Step
              n={2}
              done={emailDone}
              title={tr("إيميلكم للتنبيهات")}
              desc={tr("كل ما الفريق يرسل لكم محضر أو قرار أو طلب موعد يوصلكم إيميل برابط مباشر. ما نرسل لإيميلكم شي قبل ما تؤكدونه، وتقدرون توقفونه بأي وقت.")}
            >
              {emailDone ? (
                <p className="flex items-start gap-2 text-sm text-brand-950/70">
                  <BellRing size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>{tr("مفعّلة على ")}<b dir="ltr">{email?.emailMasked}</b>
                  </span>
                </p>
              ) : (
                <SupervisorEmailCard token={token} onChanged={load} embedded />
              )}
            </Step>

            <Step n={3} done={hasWindows} title={tr("أوقاتكم المتاحة")} desc={tr("حدّدوها مرة وحدة (مثلًا الأحد والثلاثاء ١٠–١٢)، والفريق يحجز منها بضغطة بدل رسائل الأخذ والرد.")}>
              <button onClick={onOpenAvailability} className="inline-flex items-center gap-2 rounded-xl border border-brand-300 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
                <CalendarClock size={15} />
                {hasWindows ? tr("عدّلوا أوقاتكم") : tr("حدّدوا أوقاتكم")}
              </button>
            </Step>
          </ol>
        </>
      )}
    </div>
  );
}
