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

/* صوت المزامنة (brand/brand-kit-demo.html · chime): نغمتين تلتقي على دو، وبعدها لمعة.
   يشتغل بس مع لحظة sync الكبيرة (باب ينفتح، التسليم النهائي). مفعّل افتراضيًا، ويطفى من القائمة. */
const SYNC_KEY = "wesync.syncSound";
export const CATCHPHRASE = "على نفس الموجة 〰️";

export function isSyncSoundOn(): boolean {
  try {
    return localStorage.getItem(SYNC_KEY) !== "0";
  } catch {
    return true;
  }
}
export function setSyncSoundOn(on: boolean) {
  try {
    localStorage.setItem(SYNC_KEY, on ? "1" : "0");
  } catch {
    /* تخزين ممنوع */
  }
}

let AC: AudioContext | null = null;
export function syncChime() {
  if (!isSyncSoundOn()) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AC = AC ?? new Ctx();
    const t = AC.currentTime;
    const m = AC.createGain();
    m.gain.value = 0.18;
    m.connect(AC.destination);
    for (const [a, b] of [
      [392, 523.25],
      [466, 523.25],
    ]) {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(a, t);
      o.frequency.exponentialRampToValueAtTime(b, t + 0.35);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.connect(g);
      g.connect(m);
      o.start(t);
      o.stop(t + 1.3);
    }
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = "triangle";
    o.frequency.value = 783.99;
    g.gain.setValueAtTime(0, t + 0.34);
    g.gain.linearRampToValueAtTime(0.35, t + 0.38);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o.connect(g);
    g.connect(m);
    o.start(t + 0.34);
    o.stop(t + 1.6);
  } catch {
    /* الصوت مو متاح — نكمل بهدوء */
  }
}
