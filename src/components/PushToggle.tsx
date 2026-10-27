import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import Card from "./ui/Card";
import { useAuth } from "../context/AuthContext";
import { usePush } from "../hooks/usePush";
import { tr } from "../lib/i18n";

/** تفعيل إشعارات الجوال لهذا الجهاز: تذكير يومي بمهامكم القريبة والمتأخرة */
export default function PushToggle() {
  const { currentUser } = useAuth();
  const { state, enable, disable, sendTest } = usePush(currentUser?.id);
  const [msg, setMsg] = useState<string | null>(null);

  if (state === "unsupported") return null;

  const turnOn = async () => {
    setMsg(null);
    const err = await enable();
    if (err) setMsg(tr("ما قدرنا نفعّل الإشعارات — حاولوا مرة ثانية."));
  };
  const test = async () => {
    const n = await sendTest();
    setMsg(n > 0 ? tr("أرسلنا إشعار تجريبي — يوصلك خلال ثواني.") : tr("ما وصل شي. جرّبوا تطفون الإشعارات وتفعّلونها من جديد."));
  };

  return (
    <Card className="space-y-2.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600">{state === "on" ? <Bell size={18} /> : <BellOff size={18} />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-brand-950">{tr("إشعارات الجوال")}</p>
          <p className="mt-0.5 text-xs text-brand-950/60">
            {state === "ios-install"
              ? tr("في الآيفون: افتحوا الموقع بسفاري ← زر المشاركة ← «إضافة إلى الشاشة الرئيسية»، وبعدها افتحوه من الأيقونة وفعّلوا الإشعارات.")
              : state === "denied"
                ? tr("الإشعارات محظورة لهذا الموقع. فعّلوها من إعدادات المتصفح ثم ارجعوا هنا.")
                : tr("يوصلك تذكير الصبح بمهامك اللي قربت أو تأخرت، حتى لو الموقع مقفول.")}
          </p>
        </div>
        {(state === "off" || state === "on" || state === "busy") && (
          <button
            type="button"
            disabled={state === "busy"}
            onClick={state === "on" ? disable : turnOn}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {state === "busy" && <Loader2 size={13} className="animate-spin" />}
            {state === "on" ? tr("إيقاف") : tr("فعّل")}
          </button>
        )}
      </div>
      {state === "on" && (
        <button type="button" onClick={test} className="text-xs font-bold text-brand-700">
          {tr("أرسل إشعار تجريبي")}
        </button>
      )}
      {msg && <p className="text-xs text-brand-950/70">{msg}</p>}
    </Card>
  );
}
