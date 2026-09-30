import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Lightbulb, Loader2, Send, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/** «اقترح ميزة» — يوصل لصاحب النظام فقط (جدول feature_ideas). نستخدمه نعرف وش أهم شي يحتاجه الطلاب فعلًا. */
export default function IdeaButton() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!isSupabaseConfigured || !currentUser) return null;

  const send = async () => {
    const idea = text.trim();
    if (idea.length < 3 || sending) return;
    setSending(true);
    const { error } = await supabase!.from("feature_ideas").insert({ user_id: currentUser.id, idea: idea.slice(0, 600), page: location.pathname });
    setSending(false);
    if (error) {
      showToast({ title: "ما وصل اقتراحك", desc: "حاولي مرة ثانية", icon: X, tone: "rose" });
      return;
    }
    showToast({ title: "وصلنا اقتراحك، شكرًا 💛", icon: Lightbulb, tone: "brand" });
    setText("");
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-brand-950/50 hover:bg-surface-muted hover:text-brand-700"
      >
        <Lightbulb size={14} />
        اقترحوا ميزة أو قولوا لنا وش يوقفكم
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md space-y-3 rounded-3xl border border-brand-100/60 bg-paper p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-base font-extrabold text-brand-950">
                <Lightbulb size={18} className="text-brand-500" /> وش أصعب شي ببحثكم؟
              </p>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-brand-950/40 hover:bg-surface-muted">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-brand-950/55">
              اكتبوا أي شي يعطّلكم أو ميزة تتمنونها. نقرأ كل اقتراح ونبني على اللي يتكرر.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={600}
              autoFocus
              className="w-full rounded-lg border border-brand-100 bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand-300 focus:bg-paper"
            />
            <button
              onClick={send}
              disabled={text.trim().length < 3 || sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              إرسال
            </button>
          </div>
        </div>
      )}
    </>
  );
}
