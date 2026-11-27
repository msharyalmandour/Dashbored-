import { useState } from "react";
import { WSpin } from "../components/brand/WLogo";
import { useParams } from "react-router-dom";
import { BellOff, CheckCircle2, MailCheck, XCircle } from "lucide-react";
import Logo from "../components/Logo";
import { confirmSupervisorEmail, errorText, unsubscribeSupervisorEmail } from "../lib/supervisorEmail";
import { tr } from "../lib/i18n";

/** صفحة عامة تفتحها المشرفة من رابط الإيميل: تأكيد الاشتراك أو إيقافه.
    ما ننفّذ شي بمجرد فتح الصفحة: فاحصات الروابط بإيميلات الجامعات (مثل Safe Links) تفتح الروابط لحالها،
    فلو نفّذنا عند الفتح كان انوقفت إشعاراتها بدون ما تدري. التنفيذ بضغطة زر منها. */
export default function SupervisorEmailAction() {
  const { action, token } = useParams<{ action: string; token: string }>();
  const valid = !!token && (action === "confirm" || action === "unsubscribe");
  const stop = action === "unsubscribe";
  const [state, setState] = useState<"ask" | "loading" | "ok" | "error">(valid ? "ask" : "error");
  const [message, setMessage] = useState(valid ? "" : tr("رابط غير صالح."));

  const go = async () => {
    if (!token) return;
    setState("loading");
    const res = stop ? await unsubscribeSupervisorEmail(token) : await confirmSupervisorEmail(token);
    if (res.error) {
      setState("error");
      setMessage(errorText[res.error]);
    } else {
      setState("ok");
      setMessage(stop ? tr("تم إيقاف الإشعارات. ما راح يوصلكم إيميل بعد الحين.") : tr("تم تأكيد الاشتراك. بيوصلكم إيميل عند كل رد جديد من الفريق."));
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080808] px-6 text-center text-[#F2EBE3]">
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <span className="text-base font-extrabold">Wesync</span>
      </div>
      {state === "ask" && (
        <>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-[#FFC777] ring-1 ring-white/10">{stop ? <BellOff size={26} /> : <MailCheck size={26} />}</span>
          <h1 className="m-0 max-w-sm text-[20px] font-extrabold leading-snug">{stop ? tr("توقفون إيميلات Wesync؟") : tr("تأكدون استلام إيميلات الفريق؟")}</h1>
          <p className="m-0 max-w-sm text-[14px] leading-relaxed text-[#E9D3B8]">
            {stop ? tr("ما يوصلكم إيميل عن طلبات الفريق بعدها. صفحتكم تبقى شغالة، وتقدرون ترجعون الإشعارات منها.") : tr("يوصلكم إيميل لما الفريق يرسل لكم طلب أو رد.")}
          </p>
          <button
            type="button"
            onClick={() => void go()}
            className="min-h-[48px] rounded-full bg-gradient-to-l from-[#FF6A00] to-[#FF9A3C] px-7 text-[15px] font-extrabold text-[#1A0802] shadow-[0_10px_30px_-10px_rgba(255,106,0,.7)]"
          >
            {stop ? tr("أوقفوا الإشعارات") : tr("أكّدوا الاشتراك")}
          </button>
        </>
      )}
      {state === "loading" && <WSpin size={28} className="text-[#FF9A3C]" label={tr("لحظة…")} />}
      {state === "ok" && <CheckCircle2 size={36} className="text-[#FFC777]" />}
      {state === "error" && <XCircle size={36} className="text-[#FF8A7A]" />}
      {(state === "ok" || state === "error") && (
        <p role="status" className="m-0 max-w-sm text-[15px] font-semibold text-[#E9D3B8]">
          {message}
        </p>
      )}
    </main>
  );
}
