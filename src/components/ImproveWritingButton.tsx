import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
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
  const { mode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (mode !== "supabase") return null;

  const improve = async () => {
    if (!value.trim() || loading) return;
    setError(false);
    setLoading(true);
    const { data, error: fnError } = await supabase!.functions.invoke("ai-assist", {
      body: { action: "improve", text: value },
    });
    setLoading(false);
    if (fnError || data?.error) {
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
