import { useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** مساعد بحثي عائم — يشتغل فقط بوضع Supabase الحقيقي عبر Edge Function
    (supabase/functions/ai-assist) عشان مفتاح Anthropic ما يظهر بالمتصفح. */
export default function AiAssistant() {
  const { mode, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mode !== "supabase" || !currentUser) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const { data, error: fnError } = await supabase!.functions.invoke("ai-assist", {
      body: { action: "chat", messages: next },
    });

    setLoading(false);
    if (fnError || data?.error) {
      setError("تعذّر الوصول للمساعد — حاول مرة ثانية");
      return;
    }
    setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 start-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-105 print:hidden ${open ? "hidden" : ""}`}
        title="المساعد البحثي"
      >
        <Bot size={24} />
      </button>

      {open && (
        <div className="fixed inset-y-0 start-0 z-40 flex w-full max-w-sm flex-col border-e border-brand-100 bg-paper shadow-2xl">
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <Sparkles size={16} />
              </span>
              <div>
                <p className="text-sm font-bold text-brand-950">المساعد البحثي</p>
                <p className="text-xs text-brand-950/45">يساعدك تفهم وتتقدم ببحثك</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-brand-950/40 hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="rounded-2xl bg-surface-muted p-3 text-sm text-brand-950/55">
                اسألني عن أي شي يخص بحثكم — تلخيص مصدر، اقتراح فجوة بحثية، أو أي
                استفسار عن مراحل البحث.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === "user"
                    ? "ms-auto bg-brand-500 text-white"
                    : "bg-surface-muted text-brand-950/80"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-2xl bg-surface-muted px-3.5 py-2.5 text-sm text-brand-950/45">
                يكتب...
              </div>
            )}
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-brand-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب سؤالك..."
              className="flex-1 rounded-xl border border-brand-100 bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand-300 focus:bg-paper"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
