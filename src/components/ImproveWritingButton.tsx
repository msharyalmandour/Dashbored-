import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, RefreshCw, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { hasAiAccess } from "../lib/plans";
import { supabase } from "../lib/supabaseClient";

/** زر "حسّن الصياغة" — يرسل النص لـ Claude عبر Edge Function ويرجّع نسخة
    محسّنة أكاديميًا، بنفس لغة النص الأصلي. يظهر فقط بوضع Supabase الحقيقي. */
export default function ImproveWritingButton({
  value,
  onImproved,
}: {
  value: string;
  onImproved: (text: string) => void;
}) {
  const { mode, team } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (mode !== "supabase") return null;

  // باقة Basic: الزر يبقى ظاهر لكن يودّي لصفحة الباقات بدل ما يستدعي الـ AI
  if (!hasAiAccess(team)) {
    return (
      <Link
        to="/pricing"
        title="تحسين الصياغة ضمن باقة AI"
        className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-bold text-brand-950/50 hover:text-brand-700"
      >
        <Lock size={12} />
        حسّن الصياغة (باقة AI)
      </Link>
    );
  }

  const improve = async () => {
    if (!value.trim() || loading) return;
    setError(false);
    setLoading(true);
    const { data, error: fnError } = await supabase!.functions.invoke("ai-assist", {
      body: { action: "improve", text: value },
    });
    setLoading(false);
    if (fnError || data?.error || data?.upgradeRequired) {
      setError(true);
      return;
    }
    onImproved(data.text);
  };

  return (
    <button
      type="button"
      onClick={improve}
      disabled={loading || !value.trim()}
      className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
    >
      {loading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
      {loading ? "جارٍ التحسين..." : error ? "حاول مرة ثانية" : "حسّن الصياغة"}
    </button>
  );
}
