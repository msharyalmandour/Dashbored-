import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Logo from "../components/Logo";
import { confirmSupervisorEmail, errorText, unsubscribeSupervisorEmail } from "../lib/supervisorEmail";

/** صفحة عامة تفتحها المشرفة من رابط الإيميل: تأكيد الاشتراك أو إيقافه. */
export default function SupervisorEmailAction() {
  const { action, token } = useParams<{ action: string; token: string }>();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || (action !== "confirm" && action !== "unsubscribe")) {
        setState("error");
        setMessage("رابط غير صالح.");
        return;
      }
      const res = action === "confirm" ? await confirmSupervisorEmail(token) : await unsubscribeSupervisorEmail(token);
      if (cancelled) return;
      if (res.error) {
        setState("error");
        setMessage(errorText[res.error]);
      } else {
        setState("ok");
        setMessage(action === "confirm" ? "تم تأكيد الاشتراك. بيوصلكم إيميل عند كل رد جديد من الفريق." : "تم إيقاف الإشعارات. ما راح يوصلكم إيميل بعد الحين.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [action, token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-brand-50 via-paper to-paper px-6 text-center">
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <span className="font-display text-base font-extrabold text-brand-950">Wesync</span>
      </div>
      {state === "loading" && <Loader2 size={28} className="animate-spin text-brand-500" />}
      {state === "ok" && <CheckCircle2 size={36} className="text-brand-500" />}
      {state === "error" && <XCircle size={36} className="text-rose-500" />}
      <p className="max-w-sm text-sm font-semibold text-brand-950/70">{state === "loading" ? "لحظة…" : message}</p>
    </div>
  );
}
