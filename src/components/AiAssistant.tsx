import { useRef, useState } from "react";
import { Bot, ImagePlus, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
}

interface PendingImage {
  dataUrl: string;
  mediaType: string;
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DEFAULT_IMAGE_PROMPT = "اشرح لي هذي الصورة";

const examplePrompts = [
  "لخّص لي هذي الدراسة بثلاث نقاط",
  "اقترح صياغة أوضح للفجوة البحثية عندنا",
  "وش الفرق بين Cross-sectional و Cohort Study؟",
];

function contentFor(m: ChatMessage): string | ContentBlock[] {
  if (!m.imageDataUrl) return m.content;
  const [header, base64Data] = m.imageDataUrl.split(",");
  const mediaType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
  const blocks: ContentBlock[] = [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data ?? "" } },
  ];
  blocks.push({ type: "text", text: m.content || DEFAULT_IMAGE_PROMPT });
  return blocks;
}

/** مساعد بحثي عائم — يشتغل فقط بوضع Supabase الحقيقي عبر Edge Function
    (supabase/functions/ai-assist) عشان مفتاح Anthropic ما يظهر بالمتصفح.
    يقدر يفهم صور ترفعينها (زي سكرين شوت تعليمات المشرفة) مو بس نص. */
export default function AiAssistant() {
  const { mode, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (mode !== "supabase" || !currentUser) return null;

  const pickImage = () => fileInputRef.current?.click();

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("الملف لازم يكون صورة (JPG أو PNG مثلًا).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("الصورة أكبر من 5 ميجا — جربي صورة أصغر.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage({ dataUrl: reader.result as string, mediaType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if ((!text && !pendingImage) || loading) return;
    setError(null);
    const userMessage: ChatMessage = { role: "user", content: text, imageDataUrl: pendingImage?.dataUrl };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setPendingImage(null);
    setLoading(true);

    const { data, error: fnError } = await supabase!.functions.invoke("ai-assist", {
      body: {
        action: "chat",
        messages: next.map((m) => ({ role: m.role, content: contentFor(m) })),
      },
    });

    setLoading(false);
    if (fnError || data?.error) {
      setError("ما وصل الرد — تأكد من اتصالك بالإنترنت وحاول ترسل سؤالك مرة ثانية.");
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
                <p className="text-xs text-brand-950/45">
                  يجاوب كتابةً ويفهم صور ترفعينها — غير مشاري اللي يشرح بالصوت
                </p>
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
              <div className="space-y-2">
                <p className="rounded-2xl bg-surface-muted p-3 text-sm text-brand-950/55">
                  اسألني عن أي شي يخص بحثكم، أو ارفعي صورة (زي تعليمات
                  المشرفة) وأشرحها لك — جرب أحد هذي الأمثلة أو اكتب سؤالك:
                </p>
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="block w-full rounded-xl border border-brand-100 px-3 py-2 text-start text-sm text-brand-700 hover:bg-surface-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
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
                {m.imageDataUrl && (
                  <img
                    src={m.imageDataUrl}
                    alt="مرفقة"
                    className="mb-2 max-h-40 w-full rounded-lg object-cover"
                  />
                )}
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

          <div className="border-t border-brand-100 p-3">
            {pendingImage && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-muted p-2">
                <img src={pendingImage.dataUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <p className="flex-1 truncate text-xs font-semibold text-brand-950/60">
                  صورة جاهزة للإرسال
                </p>
                <button
                  onClick={() => setPendingImage(null)}
                  className="rounded-lg p-1 text-brand-950/40 hover:bg-paper"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onImageSelected}
                className="hidden"
              />
              <button
                onClick={pickImage}
                title="أرفقي صورة (تعليمات المشرفة مثلًا)"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-100 text-brand-950/50 hover:bg-surface-muted"
              >
                <ImagePlus size={16} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="اكتب سؤالك..."
                className="flex-1 rounded-xl border border-brand-100 bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand-300 focus:bg-paper"
              />
              <button
                onClick={() => send()}
                disabled={loading || (!input.trim() && !pendingImage)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
