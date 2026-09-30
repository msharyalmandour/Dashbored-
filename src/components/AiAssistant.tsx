import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, Bot, History, ImagePlus, MessageSquarePlus, Send, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { hasAiAccess } from "../lib/plans";
import { formatDateLong } from "../lib/date";
import { useAiConversations } from "../hooks/useAiConversations";
import AiLockedCard from "./AiLockedCard";

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

// أسئلة "الكوتش" — تعتمد على لقطة وضع الفريق اللي يقرأها المساعد من القاعدة
const coachPrompts = [
  "وش أهم ٣ أشياء نسويها هالأسبوع؟",
  "قيّمي وضعنا: وين متأخرين وين ماشيين تمام؟",
  "مين عنده مهام متأخرة، وكيف نعيد التوازن؟",
  "جهّزيني لاجتماع الفريق الجاي",
];
const helpPrompts = [
  "وش الفرق بين Cross-sectional و Cohort Study؟",
  "اقترحي صياغة أوضح للفجوة البحثية عندنا",
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
  const { mode, currentUser, team } = useAuth();
  const location = useLocation();
  const history = useAiConversations();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiOk = hasAiAccess(team);
  const canChat = mode === "supabase" && !!currentUser;

  // نجيب قائمة المحادثات أول ما تنفتح اللوحة (مرة وحدة) لمن عندهم باقة AI
  useEffect(() => {
    if (open && canChat && aiOk && !history.loaded) history.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canChat, aiOk, history.loaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, open, view]);

  if (!canChat || !currentUser) return null;

  const setActive = (id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  };

  const newChat = () => {
    setActive(null);
    setMessages([]);
    setError(null);
    setInput("");
    setPendingImage(null);
    setView("chat");
  };

  const openConversation = async (id: string) => {
    setActive(id);
    setError(null);
    setView("chat");
    const stored = await history.loadMessages(id);
    // لو الطالبة انتقلت لمحادثة ثانية أثناء التحميل ما نكتب فوقها
    if (activeIdRef.current !== id) return;
    setMessages(
      stored.map((m) => ({
        role: m.role,
        content: m.hadImage ? `📷 (صورة مرفقة)\n${m.content}` : m.content,
      })),
    );
  };

  const removeConversation = async (id: string) => {
    await history.deleteConversation(id);
    if (activeIdRef.current === id) newChat();
  };

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

    // نحفظ المحادثة (أفضل جهد — فشل الحفظ ما يوقف الرد)
    let convId = activeIdRef.current;
    if (!convId) {
      convId = await history.createConversation(currentUser.id, text || DEFAULT_IMAGE_PROMPT);
      if (convId) setActive(convId);
    }
    if (convId) {
      void history.saveMessage(convId, {
        role: "user",
        content: text || DEFAULT_IMAGE_PROMPT,
        hadImage: !!userMessage.imageDataUrl,
      });
    }
    const sentIn = convId;

    const { data, error: fnError } = await supabase!.functions.invoke("ai-assist", {
      body: {
        action: "chat",
        page: location.pathname,
        messages: next.map((m) => ({ role: m.role, content: contentFor(m) })),
      },
    });

    setLoading(false);
    // ما نعرض الرد/الخطأ لو الطالبة فتحت محادثة ثانية أثناء الانتظار
    const stillHere = activeIdRef.current === sentIn;
    if (fnError || data?.error) {
      if (stillHere) setError("ما وصل الرد — تأكدي من اتصالك بالإنترنت وحاولي ترسلين سؤالك مرة ثانية.");
      return;
    }
    if (sentIn) void history.saveMessage(sentIn, { role: "assistant", content: data.text, hadImage: false });
    if (stillHere) setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
  };

  return (
    <>
      {/* AI Orb — زر عائم مستقل عن ثيم الصفحة عمدًا (ألوان مباشرة مو متغيرات)
          عشان يبان بنفس الهوية "Obsidian × Ember" بأي صفحة يظهر فيها */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 start-4 z-40 flex h-14 w-14 md:bottom-6 md:start-6 items-center justify-center rounded-full bg-[#0c0c0c] text-[#ff8a24] ring-1 ring-white/10 transition-transform animate-[orb-pulse_3.2s_ease-in-out_infinite] hover:scale-105 motion-reduce:animate-none print:hidden ${open ? "hidden" : ""}`}
        title="المساعد البحثي"
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-[#ff6a00]/25 via-transparent to-transparent" />
        <Bot size={24} className="relative" />
      </button>

      {open && (
        <div className="fixed inset-y-0 start-0 z-40 flex w-full max-w-sm flex-col border-e border-brand-100/50 bg-paper/75 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
          <div className="flex items-center justify-between gap-2 border-b border-brand-100 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              {view === "history" ? (
                <button
                  onClick={() => setView("chat")}
                  title="رجوع للمحادثة"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600"
                >
                  <ArrowRight size={16} />
                </button>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <Sparkles size={16} />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-brand-950">
                  {view === "history" ? "محادثاتك السابقة" : "كوتش الفريق"}
                </p>
                <p className="truncate text-xs text-brand-950/45">
                  {view === "history" ? "خاصة فيك — ما يشوفها أحد من الفريق" : "يعرف وضع فريقكم وينصحكم بالخطوة الجاية"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {aiOk && (
                <>
                  <button
                    onClick={newChat}
                    title="محادثة جديدة"
                    className="rounded-lg p-1.5 text-brand-950/50 hover:bg-surface-muted"
                  >
                    <MessageSquarePlus size={18} />
                  </button>
                  <button
                    onClick={() => setView(view === "history" ? "chat" : "history")}
                    title="سجل المحادثات"
                    className={`rounded-lg p-1.5 hover:bg-surface-muted ${view === "history" ? "text-brand-600" : "text-brand-950/50"}`}
                  >
                    <History size={18} />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-brand-950/40 hover:bg-surface-muted"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!aiOk ? (
            <div className="flex-1 overflow-y-auto p-4">
              <AiLockedCard feature="المساعد البحثي" />
            </div>
          ) : view === "history" ? (
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {!history.loaded ? (
                <p className="text-sm text-brand-950/45">جاري التحميل...</p>
              ) : history.conversations.length === 0 ? (
                <p className="rounded-2xl bg-surface-muted p-4 text-sm text-brand-950/55">
                  ما عندك محادثات محفوظة بعد. أي محادثة تبدئينها تنحفظ هنا تلقائيًا وتقدرين ترجعين لها بأي وقت.
                </p>
              ) : (
                history.conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-1 rounded-xl border px-3 py-2 ${
                      c.id === activeId ? "border-brand-300 bg-brand-500/10" : "border-brand-100"
                    }`}
                  >
                    <button onClick={() => openConversation(c.id)} className="min-w-0 flex-1 text-start">
                      <p className="truncate text-sm font-semibold text-brand-950">{c.title}</p>
                      <p className="text-[11px] text-brand-950/40">{formatDateLong(c.updatedAt.slice(0, 10))}</p>
                    </button>
                    <button
                      onClick={() => removeConversation(c.id)}
                      title="حذف المحادثة"
                      className="rounded-lg p-1.5 text-brand-950/30 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="rounded-2xl bg-surface-muted p-3 text-sm leading-relaxed text-brand-950/60">
                  أنا كوتشكم 👋 أشوف وضع فريقكم الحقيقي (مهامكم، مراحلكم، مقترحكم، موعد التسليم) وأساعدكم تعرفون وش الخطوة
                  الجاية. اسألوني أي شي، أو جرّبوا:
                </p>
                <p className="pt-1 text-[11px] font-bold text-brand-950/40">تدريب على وضعكم</p>
                {coachPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="block w-full rounded-xl border border-brand-100 px-3 py-2 text-start text-sm text-brand-700 hover:bg-surface-muted"
                  >
                    {prompt}
                  </button>
                ))}
                <p className="pt-1 text-[11px] font-bold text-brand-950/40">مساعدة بحثية</p>
                {helpPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="block w-full rounded-xl border border-brand-100 px-3 py-2 text-start text-sm text-brand-700 hover:bg-surface-muted"
                  >
                    {prompt}
                  </button>
                ))}
                {history.conversations.length > 0 && (
                  <button
                    onClick={() => setView("history")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-brand-950/50 hover:bg-surface-muted"
                  >
                    <History size={14} />
                    محادثاتك السابقة ({history.conversations.length})
                  </button>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
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
            <div ref={bottomRef} />
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
            </>
          )}
        </div>
      )}
    </>
  );
}
