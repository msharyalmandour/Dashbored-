import { isSupabaseConfigured, supabase } from "./supabaseClient";

/** نطق نصوص المرشدة بصوت طبيعي. المحاولة الأولى دايمًا صوت AI حقيقي عبر
    Edge Function (ai-assist بإجراء "tts") — يحتاج مفتاح ElevenLabs مضاف
    بمشروع Supabase (راجع تعليقات supabase/functions/ai-assist/index.ts).
    لو ما توفر (وضع تجريبي، أو المفتاح ما انضاف بعد)، نرجع تلقائيًا لصوت
    المتصفح الجاهز (Web Speech API) كبديل يشتغل بدون أي إعداد. */

let currentAudio: HTMLAudioElement | null = null;
let cachedArabicVoice: SpeechSynthesisVoice | null = null;

// لتغذية موجات الصوت المتحركة (Waveform) بأثناء صوت AI الحقيقي — تحليل
// طيف الصوت اللحظي عبر Web Audio API
let audioCtx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;

type SpeakingListener = (speaking: boolean) => void;
let speakingListeners: SpeakingListener[] = [];

function setSpeaking(speaking: boolean) {
  speakingListeners.forEach((cb) => cb(speaking));
}

/** يسجّل مستمع لحالة "تتكلم الآن أو لا" — يرجّع دالة لإلغاء التسجيل */
export function onSpeakingChange(cb: SpeakingListener): () => void {
  speakingListeners.push(cb);
  return () => {
    speakingListeners = speakingListeners.filter((l) => l !== cb);
  };
}

/** يرجّع عقدة تحليل الصوت الحالية (متوفرة بس أثناء تشغيل صوت AI حقيقي)
    عشان نرسم موجات تتفاعل فعليًا مع الصوت، مو أنيميشن عشوائي */
export function getSpeechAnalyser(): AnalyserNode | null {
  return analyserNode;
}

function pickArabicVoice(): SpeechSynthesisVoice | null {
  if (!isBrowserSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith("ar")) ?? null;
}

export function isBrowserSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

if (isBrowserSpeechSupported()) {
  cachedArabicVoice = pickArabicVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedArabicVoice = pickArabicVoice();
  };
}

/** هل فيه أي طريقة نطق متاحة أصلًا — صوت AI حقيقي أو صوت متصفح احتياطي؟
    تُستخدم بس عشان نقرر نعرض زر كتم الصوت أو لا */
export function isNarrationAvailable(): boolean {
  return isSupabaseConfigured || isBrowserSpeechSupported();
}

function speakWithBrowserVoice(text: string) {
  if (!isBrowserSpeechSupported()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = cachedArabicVoice?.lang ?? "ar-SA";
  if (cachedArabicVoice) utterance.voice = cachedArabicVoice;
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  utterance.onstart = () => setSpeaking(true);
  utterance.onend = () => setSpeaking(false);
  utterance.onerror = () => setSpeaking(false);
  window.speechSynthesis.speak(utterance);
}

async function speakWithAIVoice(text: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { data, error } = await supabase.functions.invoke("ai-assist", {
      body: { action: "tts", text },
    });
    if (error || !data?.audioBase64) return false;

    currentAudio = new Audio(`data:${data.mimeType ?? "audio/mpeg"};base64,${data.audioBase64}`);

    // نربط عقدة تحليل صوت عشان نرسم موجات حقيقية تتحرك مع الصوت الفعلي —
    // لازم AudioContext واحد يُعاد استخدامه (المتصفحات تمنع إنشاء أكثر من
    // مصدر MediaElementSource لنفس عنصر الصوت)
    try {
      audioCtx ??= new AudioContext();
      const source = audioCtx.createMediaElementSource(currentAudio);
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
    } catch {
      analyserNode = null;
    }

    currentAudio.onplay = () => setSpeaking(true);
    currentAudio.onended = () => setSpeaking(false);
    currentAudio.onpause = () => setSpeaking(false);
    await currentAudio.play();
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (isBrowserSpeechSupported()) window.speechSynthesis.cancel();
  setSpeaking(false);
}

/** ينطق النص بأفضل صوت متاح — يحاول صوت AI حقيقي أول، ولو ما نجح (خطأ
    شبكة، مفتاح ما انضاف، وضع تجريبي) يرجع تلقائيًا لصوت المتصفح */
export async function speak(text: string) {
  stopSpeaking();
  const aiWorked = await speakWithAIVoice(text);
  if (!aiWorked) speakWithBrowserVoice(text);
}
