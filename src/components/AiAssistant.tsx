import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, ArrowUp, History, ImagePlus, MessageSquarePlus, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { hasAiAccess } from "../lib/plans";
import { formatDateLong } from "../lib/date";
import { homeSection, morePages, sectionForPath } from "../lib/navSections";
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

/** اقتراحات القسم الحالي — نصوص عادية تنرسل للكوتش، وهو أصلًا يعرف الصفحة (page) ووضع الفريق */
const sectionPrompts: Record<string, string[]> = {
  search: ["اقترحوا لنا كلمات بحث لعنواننا", "وش الدراسات اللي ممكن تكون ناقصتنا؟", "وش الفجوة اللي ممكن نشتغل عليها؟"],
  write: ["وش ناقص بمقترحنا؟", "كيف أحسّن صياغة هدف الدراسة؟", "جهّزونا لأسئلة المشرف/ة عن المنهجية"],
  collect: ["وش الاختبار الإحصائي المناسب لبياناتنا؟", "وش لازم نجهّز قبل توزيع الاستبيان؟", "كم عينة نحتاج تقريبًا؟"],
  team: ["مين عليه ضغط؟", "كيف نوزّع المهام بعدل؟", "جهّزوا لنا تقرير مساهمة الفريق"],
  supervisor: ["وش ناقص قبل اجتماعنا مع المشرف/ة؟", "حوّلوا ملاحظاتها لمهام", "جهّزوا لنا نقاط الاجتماع الجاي"],
  calendar: ["وش عندنا هالأسبوع؟", "وش اللي متأخر عندنا؟", "رتّبوا لنا أسبوعنا"],
};

/** اسم المكان الحالي للعرض بالشريط: قسم من الأبواب السبعة، أو الرئيسية، أو صفحة من «المزيد» */
function placeFor(pathname: string): { label: string; sectionId?: string } {
  const sec = sectionForPath(pathname);
  if (sec) return { label: sec.label, sectionId: sec.id };
  if (pathname === "/") return { label: homeSection.label };
  const more = morePages.find((m) => pathname === m.to || pathname.startsWith(`${m.to}/`));
  return { label: more?.label ?? "Wesync" };
}

const orbBg = "radial-gradient(circle at 50% 60%,#FFF0C2 0,#FFC85A 22%,#FF7A10 55%,#C2400A 82%,#5A1A04 100%)";

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

  const place = placeFor(location.pathname);
  const prompts = (place.sectionId && sectionPrompts[place.sectionId]) || coachPrompts.slice(0, 3);
  const circleBtn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#B8ADA2] transition hover:border-[#FF8A24]/60 hover:text-[#F4F0EC]";

  return (
    <>
      {/* الكرة العائمة: نفس كرة صفحة الوكيل (ألوان مباشرة مو متغيرات الثيم عشان تبان بنفس الهوية بأي صفحة) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="وكيل Wesync"
        title={`وكيل Wesync — أنتم في: ${place.label}`}
        className={`ld-breath fixed bottom-20 start-4 z-40 h-14 w-14 rounded-full transition-transform hover:scale-105 motion-reduce:animate-none md:bottom-6 md:start-6 print:hidden ${open ? "hidden" : ""}`}
        style={{ background: orbBg, boxShadow: "0 0 0 6px rgba(255,140,40,.08),0 0 40px rgba(255,140,40,.55)" }}
      />

      {open && (
        <div
          role="dialog"
          aria-label="وكيل Wesync"
          className="fixed inset-y-0 start-0 z-40 flex w-full max-w-[420px] flex-col border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.92)] text-[#F4F0EC] shadow-[0_24px_80px_rgba(255,100,0,.12),0_0_0_1px_rgba(0,0,0,.4)] backdrop-blur-2xl backdrop-saturate-150 md:inset-y-3 md:start-3 md:w-[400px] md:rounded-[28px]"
        >
          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {view === "history" ? (
                <button onClick={() => setView("chat")} title="رجوع للمحادثة" className={circleBtn}>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <span aria-hidden className="h-9 w-9 shrink-0 rounded-full" style={{ background: orbBg, boxShadow: "0 0 24px rgba(255,140,40,.5)" }} />
              )}
              <div className="min-w-0">
                <p className="truncate font-kufi text-[15px] font-bold">{view === "history" ? "محادثاتكم السابقة" : "وكيل Wesync"}</p>
                <p className="truncate text-xs text-[#B8ADA2]">
                  {view === "history" ? "خاصة فيكم — ما يشوفها أحد من الفريق" : `أنتم في: ${place.label}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {aiOk && (
                <>
                  <button onClick={newChat} title="محادثة جديدة" className={circleBtn}>
                    <MessageSquarePlus size={16} />
                  </button>
                  <button
                    onClick={() => setView(view === "history" ? "chat" : "history")}
                    title="سجل المحادثات"
                    className={`${circleBtn} ${view === "history" ? "!border-[#FF8A24]/60 !text-[#FFB444]" : ""}`}
                  >
                    <History size={16} />
                  </button>
                </>
              )}
              <button onClick={() => setOpen(false)} title="إغلاق" aria-label="إغلاق" className={circleBtn}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div aria-hidden className="mx-5 h-px bg-gradient-to-l from-transparent via-[rgba(255,107,0,.35)] to-transparent" />

          {!aiOk ? (
            <div className="flex-1 overflow-y-auto p-4">
              <AiLockedCard feature="المساعد البحثي" />
            </div>
          ) : view === "history" ? (
            <div className="flex-1 space-y-2 overflow-y-auto p-5">
              {!history.loaded ? (
                <p className="text-sm text-[#B8ADA2]">جاري التحميل...</p>
              ) : history.conversations.length === 0 ? (
                <p className="rounded-2xl bg-white/[0.05] p-4 text-sm leading-relaxed text-[#B8ADA2]">
                  ما عندكم محادثات محفوظة بعد. أي محادثة تبدؤونها تنحفظ هنا تلقائيًا وتقدرون ترجعون لها بأي وقت.
                </p>
              ) : (
                history.conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-1 rounded-2xl border px-4 py-2.5 ${
                      c.id === activeId ? "border-[#FF8A24]/60 bg-[#FF6B00]/10" : "border-white/10"
                    }`}
                  >
                    <button onClick={() => openConversation(c.id)} className="min-w-0 flex-1 text-start">
                      <p className="truncate text-sm font-semibold">{c.title}</p>
                      <p className="text-[11px] text-[#B8ADA2]">{formatDateLong(c.updatedAt.slice(0, 10))}</p>
                    </button>
                    <button
                      onClick={() => removeConversation(c.id)}
                      title="حذف المحادثة"
                      className="rounded-full p-1.5 text-[#B8ADA2]/60 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-[#B8ADA2]">
                      أشوف وضع فريقكم الحقيقي (مهامكم، مراحلكم، مقترحكم، موعد التسليم) وأساعدكم تعرفون وش الخطوة الجاية. اسألوني أي شي، أو جرّبوا:
                    </p>
                    <div className="flex flex-col gap-2">
                      {prompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => send(prompt)}
                          className="rounded-full border border-white/[0.14] px-4 py-2.5 text-start text-sm text-[#E6DBD1] transition hover:border-[#FF8A24]/60 hover:bg-[#FF6B00]/10"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <details className="group pt-1">
                      <summary className="cursor-pointer list-none text-xs font-bold text-[#B8ADA2] hover:text-[#F4F0EC]">
                        أسئلة ثانية <span className="inline-block transition-transform group-open:rotate-180">⌄</span>
                      </summary>
                      <div className="mt-2 flex flex-col gap-2">
                        {[...coachPrompts, ...helpPrompts]
                          .filter((x) => !prompts.includes(x))
                          .map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => send(prompt)}
                              className="rounded-full border border-white/10 px-4 py-2 text-start text-xs text-[#B8ADA2] transition hover:border-[#FF8A24]/50 hover:text-[#F4F0EC]"
                            >
                              {prompt}
                            </button>
                          ))}
                      </div>
                    </details>
                    {history.conversations.length > 0 && (
                      <button
                        onClick={() => setView("history")}
                        className="flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[#B8ADA2] hover:text-[#F4F0EC]"
                      >
                        <History size={14} />
                        محادثاتكم السابقة ({history.conversations.length})
                      </button>
                    )}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[88%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ms-auto bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00]"
                        : "border border-white/10 bg-white/[0.05] text-[#F4F0EC]"
                    }`}
                  >
                    {m.imageDataUrl && <img src={m.imageDataUrl} alt="مرفقة" className="mb-2 max-h-40 w-full rounded-2xl object-cover" />}
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="max-w-[88%] rounded-3xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-[#B8ADA2]">يكتب...</div>
                )}
                {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 pt-2">
                {pendingImage && (
                  <div className="mb-2 flex items-center gap-2 rounded-2xl bg-white/[0.05] p-2">
                    <img src={pendingImage.dataUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    <p className="flex-1 truncate text-xs font-semibold text-[#B8ADA2]">صورة جاهزة للإرسال</p>
                    <button onClick={() => setPendingImage(null)} className="rounded-full p-1 text-[#B8ADA2] hover:text-[#F4F0EC]">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-full border border-[rgba(255,200,130,.4)] bg-white/[0.06] py-1.5 ps-2 pe-1.5">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onImageSelected} className="hidden" />
                  <button onClick={pickImage} title="أرفقوا صورة (تعليمات المشرف/ة مثلًا)" className={circleBtn}>
                    <ImagePlus size={16} />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="اطلبوا من الوكيل…"
                    className="min-w-0 flex-1 bg-transparent px-1 text-sm text-[#F4F0EC] outline-none placeholder:text-[#8F8378]"
                  />
                  <button
                    onClick={() => send()}
                    disabled={loading || (!input.trim() && !pendingImage)}
                    aria-label="إرسال"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00] shadow-[0_0_24px_rgba(255,140,40,.45)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    <ArrowUp size={18} strokeWidth={2.6} />
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
