/** نطق نصوص المرشدة بصوت المتصفح (Web Speech API) — يشتغل محليًا بدون أي
    مفتاح API أو اتصال خارجي. يفضّل صوتًا عربيًا لو متوفر بجهاز المستخدمة،
    وإلا يرجع للصوت الافتراضي (يقرأ الحروف العربية بلكنة أجنبية غالبًا). */

let cachedArabicVoice: SpeechSynthesisVoice | null = null;

function pickArabicVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith("ar")) ?? null;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

if (isSpeechSupported()) {
  cachedArabicVoice = pickArabicVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedArabicVoice = pickArabicVoice();
  };
}

export function speak(text: string) {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = cachedArabicVoice?.lang ?? "ar-SA";
  if (cachedArabicVoice) utterance.voice = cachedArabicVoice;
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
