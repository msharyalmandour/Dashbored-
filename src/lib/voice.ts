import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { isEn } from "./i18n";

/* الفويس: تسجيل (MediaRecorder) + مستوى الصوت الحقيقي (AnalyserNode) + كتابة مباشرة من المتصفح (SpeechRecognition)
   + رفع الملف لحاوية drops تحت مجلد الفريق. الحد ٥ دقايق. بدون نت: الفويس ينحفظ بالجهاز وينرسل لحاله. */

export const MAX_MS = 5 * 60_000;
export type VoiceKind = "task" | "decision" | "question" | "date" | "note";
export interface VoiceItem {
  kind: VoiceKind;
  title: string;
  sub: string;
  assignee_id: string | null;
  due: string | null;
}
export interface VoiceMeta {
  type: "voice";
  path: string | null;
  duration: number;
  transcript: string;
  gist: string;
  items: { kind: VoiceKind; title: string; sub: string; who?: string }[];
  peaks: number[];
}

// ── التعرّف على الكلام بالمتصفح (كروم/سفاري) ──
interface SR extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SR;
const SRClass = (): SRCtor | null => {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const canTranscribeLive = () => typeof window !== "undefined" && !!SRClass();

export interface RecorderEvents {
  onLevel?: (level: number) => void;
  onText?: (finalText: string, interim: string) => void;
  onLimit?: () => void;
}

/** مسجّل واحد: start / pause / resume / stop → Blob */
export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private sr: SR | null = null;
  private srOn = false;
  private finalText = "";
  private startedAt = 0;
  private pausedTotal = 0;
  private pausedAt = 0;
  private limitTimer = 0;
  peaks: number[] = [];
  mime = "";

  private ev: RecorderEvents;
  constructor(ev: RecorderEvents = {}) {
    this.ev = ev;
  }

  get elapsed() {
    if (!this.startedAt) return 0;
    const now = this.pausedAt || Date.now();
    return Math.max(0, now - this.startedAt - this.pausedTotal);
  }
  get paused() {
    return !!this.pausedAt;
  }
  get text() {
    return this.finalText.trim();
  }

  /** يرمي «blocked» لو المايك مقفل */
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      throw new Error(/NotAllowed|Security|Permission/i.test(name) ? "blocked" : "no_mic");
    }
    this.mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) ?? "";
    this.rec = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime, audioBitsPerSecond: 32000 } : undefined);
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000);
    this.startedAt = Date.now();
    // مستوى الصوت الحقيقي (الموجة تتحرك معه بس)
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      this.ctx = new AC();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      src.connect(this.analyser);
      const buf = new Uint8Array(this.analyser.fftSize);
      let lastPeak = 0;
      const tick = () => {
        this.raf = requestAnimationFrame(tick);
        if (this.pausedAt || !this.analyser) return;
        this.analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += ((buf[i] - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        this.ev.onLevel?.(level);
        if (Date.now() - lastPeak > 250) {
          this.peaks.push(Math.round(level * 100) / 100);
          lastPeak = Date.now();
        }
      };
      tick();
    }
    this.startSR();
    this.limitTimer = window.setInterval(() => {
      if (this.elapsed >= MAX_MS) this.ev.onLimit?.();
    }, 500);
  }

  private startSR() {
    const C = SRClass();
    if (!C) return;
    const sr = new C();
    sr.lang = "ar-SA";
    sr.continuous = true;
    sr.interimResults = true;
    sr.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      this.ev.onText?.(this.finalText.trim(), interim.trim());
    };
    sr.onerror = () => {};
    // كروم يوقف بعد سكتة طويلة: نرجّعه طول ما نسجّل
    sr.onend = () => {
      if (this.srOn && !this.pausedAt) {
        try {
          sr.start();
        } catch {
          /* شغّال */
        }
      }
    };
    this.sr = sr;
    this.srOn = true;
    try {
      sr.start();
    } catch {
      /* ما يهم */
    }
  }

  pause() {
    if (!this.rec || this.pausedAt) return;
    this.rec.pause();
    this.pausedAt = Date.now();
    this.ev.onLevel?.(0);
    try {
      this.sr?.stop();
    } catch {
      /* ما يهم */
    }
  }
  resume() {
    if (!this.rec || !this.pausedAt) return;
    this.rec.resume();
    this.pausedTotal += Date.now() - this.pausedAt;
    this.pausedAt = 0;
    try {
      this.sr?.start();
    } catch {
      /* ما يهم */
    }
  }

  async stop(): Promise<{ blob: Blob; duration: number; peaks: number[]; text: string }> {
    const duration = this.elapsed;
    this.srOn = false;
    try {
      this.sr?.stop();
    } catch {
      /* ما يهم */
    }
    const blob = await new Promise<Blob>((res) => {
      if (!this.rec || this.rec.state === "inactive") return res(new Blob(this.chunks, { type: this.mime || "audio/webm" }));
      this.rec.onstop = () => res(new Blob(this.chunks, { type: this.mime || "audio/webm" }));
      this.rec.stop();
    });
    this.cleanup();
    return { blob, duration, peaks: shrinkPeaks(this.peaks, 28), text: this.text };
  }

  cancel() {
    this.srOn = false;
    try {
      this.sr?.abort();
    } catch {
      /* ما يهم */
    }
    try {
      if (this.rec && this.rec.state !== "inactive") this.rec.stop();
    } catch {
      /* ما يهم */
    }
    this.cleanup();
  }

  private cleanup() {
    cancelAnimationFrame(this.raf);
    clearInterval(this.limitTimer);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => {});
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
  }
}

/** نصغّر قمم الصوت لعدد ثابت من الأعمدة (للفقاعة) */
export function shrinkPeaks(peaks: number[], n: number): number[] {
  if (!peaks.length) return Array.from({ length: n }, () => 0.15);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * peaks.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * peaks.length) / n));
    const slice = peaks.slice(a, b);
    out.push(Math.round(Math.max(0.12, ...slice) * 100) / 100);
  }
  return out;
}

export const fmtDur = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ── السيرفر ──
export async function extractVoice(text: string): Promise<{ gist: string; items: VoiceItem[] } | null> {
  if (!isSupabaseConfigured || text.trim().split(/\s+/).length < 4) return null;
  const { data, error } = await supabase!.functions.invoke("chat-intel", { body: { action: "voice", text } });
  if (error || !data) return null;
  const d = data as { gist?: string; items?: VoiceItem[] };
  return { gist: d.gist ?? "", items: d.items ?? [] };
}
export async function transcribeServer(path: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase!.functions.invoke("chat-intel", { body: { action: "stt", path } });
  return (data as { text?: string | null } | null)?.text ?? null;
}
export async function uploadVoice(teamId: string, blob: Blob): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const path = `${teamId}/voice/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const store = supabase!.storage.from("drops");
  const { error } = await store.upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
  if (!error) return path;
  // المخزن كان يرفض ملفات الصوت (audio/*): نرفعه كملف عام، والتشغيل يرجّع له نوعه من الامتداد
  const retry = await store.upload(path, blob, { contentType: "application/octet-stream", upsert: false });
  return retry.error ? null : path;
}
const MIME_BY_EXT: Record<string, string> = { m4a: "audio/mp4", ogg: "audio/ogg", webm: "audio/webm" };
/** نوع الصوت من امتداد المسار (للملفات اللي انرفعت كملف عام) */
export const voiceMime = (path: string) => MIME_BY_EXT[path.split(".").pop() ?? ""] ?? "audio/webm";
const urlCache = new Map<string, { url: string; at: number }>();
export async function voiceUrl(path: string): Promise<string | null> {
  const c = urlCache.get(path);
  if (c) return c.url;
  if (!isSupabaseConfigured) return null;
  // نحمّله كـ blob بنوعه الصحيح: Safari ما يشغّل الصوت لو انخدم كـ octet-stream
  const { data } = await supabase!.storage.from("drops").download(path);
  if (!data) return null;
  const url = URL.createObjectURL(new Blob([data], { type: voiceMime(path) }));
  urlCache.set(path, { url, at: Date.now() });
  return url;
}

// ── بدون نت: نحفظ الفويس بالجهاز وينرسل لحاله ──
const DB = "wesync-voice";
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("queue", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export interface QueuedVoice {
  id: string;
  teamId: string;
  blob: Blob;
  meta: Omit<VoiceMeta, "path">;
  body: string;
}
export async function queueVoice(q: QueuedVoice) {
  const db = await idb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").put(q);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
export async function takeQueued(teamId: string): Promise<QueuedVoice[]> {
  try {
    const db = await idb();
    const all = await new Promise<QueuedVoice[]>((res) => {
      const r = db.transaction("queue", "readonly").objectStore("queue").getAll();
      r.onsuccess = () => res((r.result as QueuedVoice[]) ?? []);
      r.onerror = () => res([]);
    });
    return all.filter((q) => q.teamId === teamId);
  } catch {
    return [];
  }
}
export async function dropQueued(id: string) {
  try {
    const db = await idb();
    db.transaction("queue", "readwrite").objectStore("queue").delete(id);
  } catch {
    /* ما يهم */
  }
}

const KIND_AR: Record<VoiceKind, string> = { task: "مهمة", decision: "قرار", question: "سؤال", date: "موعد", note: "ملاحظة" };
const KIND_EN: Record<VoiceKind, string> = { task: "Task", decision: "Decision", question: "Question", date: "Date", note: "Note" };
/** اسم النوع (الكلمة العربية نفسها مستخدمة بمعاني ثانية بالترجمة، فنترجمها هنا) */
export const kindLabel = (k: VoiceKind) => (isEn ? KIND_EN[k] : KIND_AR[k]);

/** كتابة مباشرة بس (بدون تسجيل ملف) — لوضع الاجتماع اللي يطول أكثر من ٥ دقايق */
export function listen(onFinal: (text: string) => void, onInterim: (text: string) => void): (() => void) | null {
  const C = SRClass();
  if (!C) return null;
  const sr = new C();
  let on = true;
  sr.lang = "ar-SA";
  sr.continuous = true;
  sr.interimResults = true;
  sr.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) onFinal(r[0].transcript.trim());
      else interim += r[0].transcript;
    }
    onInterim(interim.trim());
  };
  sr.onerror = () => {};
  sr.onend = () => {
    if (on) {
      try {
        sr.start();
      } catch {
        /* شغّال */
      }
    }
  };
  try {
    sr.start();
  } catch {
    return null;
  }
  return () => {
    on = false;
    try {
      sr.stop();
    } catch {
      /* ما يهم */
    }
  };
}
