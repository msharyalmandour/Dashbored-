const SOUND_KEY = "nursync.soundEnabled";

export function isSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) === "1";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}

/** نغمة تفاعل قصيرة جدًا (مركّبة بالكود، بدون ملف صوتي) — تشتغل بس لو المستخدم فعّلها */
export function playChime() {
  if (!isSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // الصوت مو متاح بهذا المتصفح — تجاهل بهدوء
  }
}
