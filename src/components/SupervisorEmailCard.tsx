import { useCallback, useEffect, useState } from "react";
import { BellRing, Loader2, Mail } from "lucide-react";
import { errorText, getSupervisorEmailStatus, subscribeSupervisor, type EmailStatus } from "../lib/supervisorEmail";

/** المشرفة تشترك بنفسها بإيميل يوصلها عند كل رد جديد من الفريق (تأكيد مزدوج: ما نرسل لأي إيميل قبل ما صاحبه يؤكد). */
export default function SupervisorEmailCard({ token }: { token: string }) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const load = useCallback(async () => {
    setStatus(await getSupervisorEmailStatus(token));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const value = email.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    const res = await subscribeSupervisor(token, value);
    setBusy(false);
    if (res.error) {
      setError(errorText[res.error]);
      return;
    }
    setJustSent(true);
    setEmail("");
    load();
  };

  const active = status?.state === "active";
  const pending = status?.state === "pending" || justSent;

  return (
    <div className="mt-4 rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5 sm:p-8">
      <p className="flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
        <Mail size={15} className="text-brand-500" />
        إشعارات الإيميل
      </p>

      {active ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-brand-950/70">
          <BellRing size={16} className="mt-0.5 shrink-0 text-brand-500" />
          <span>
            مفعّلة على <b dir="ltr">{status?.emailMasked}</b> — يوصلكم إيميل عند كل رد جديد من الفريق. لإيقافها اضغطوا «إيقاف الإشعارات» بأسفل أي إيميل منّا.
          </span>
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-brand-950/50">
            {pending
              ? `أرسلنا رابط تأكيد إلى ${status?.emailMasked || "إيميلكم"} — اضغطوه عشان تبدأ الإشعارات (شوفوا الرسائل المزعجة لو ما وصل).`
              : "بدل ما تفتحون الرابط كل مرة، اكتبوا إيميلكم ويوصلكم تنبيه لما الفريق يرد. نرسل لكم رابط تأكيد أول، وما نرسل شي قبله."}
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu.sa"
              autoComplete="email"
              className="min-w-0 flex-1 rounded-xl border border-brand-100 bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-brand-300"
            />
            <button disabled={busy || !email.trim()} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
              {busy && <Loader2 size={14} className="animate-spin" />}
              {pending ? "أعيدوا إرسال التأكيد" : "فعّلوا الإشعارات"}
            </button>
          </form>
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
        </>
      )}
    </div>
  );
}
