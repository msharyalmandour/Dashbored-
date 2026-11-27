import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { isEn } from "./i18n";

/* الكتابة الحيّة (ElevenLabs Scribe v2 Realtime): الكلام يطلع كلمة كلمة وأنتم تتكلمون، بأي متصفح وبتطبيق الديسكتوب.
   السيرفر (chat-intel · stt_token) يعطي رمز لمرة وحدة (15 دقيقة) — المفتاح ما يطلع للمتصفح أبد.
   الصوت: مايك ← AudioWorklet ← PCM16 بتردد 16k (قطع ~100ms) ← WebSocket. النتائج: partial (يتغيّر) و committed (ثابت). */

const WSS = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";
const RATE = 16000;
const CHUNK = 1600; // 100ms — أسرع ظهور للكلام بدون ما نغرق السيرفر

// المعالج يحوّل الصوت لـ PCM16 ويعيد التردد لـ 16k (نفس فكرة مكتبة ElevenLabs الرسمية)
const WORKLET = `
class WsPcm extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.ratio = sampleRate / ${RATE}; this.acc = 0; this.last = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i];
      while (this.acc < 1) { this.buf.push(this.last + (s - this.last) * this.acc); this.acc += this.ratio; }
      this.acc -= 1; this.last = s;
    }
    while (this.buf.length >= ${CHUNK}) {
      const part = this.buf.splice(0, ${CHUNK});
      const out = new Int16Array(part.length);
      for (let i = 0; i < part.length; i++) { const v = Math.max(-1, Math.min(1, part[i])); out[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
      this.port.postMessage(out.buffer, [out.buffer]);
    }
    return true;
  }
}
registerProcessor("ws-pcm", WsPcm);
`;

/** الأرقام دايم إنجليزية (قاعدة الهوية): «١٢٠» تصير «120» */
export const latinDigits = (s: string) => s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function liveSttToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase!.functions.invoke("chat-intel", { body: { action: "stt_token" } });
    return (data as { token?: string } | null)?.token ?? null;
  } catch {
    return null;
  }
}

export const liveSttPossible = () => isSupabaseConfigured && typeof WebSocket !== "undefined" && typeof AudioContext !== "undefined";

export class LiveStt {
  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private finals: string[] = [];
  private partial = "";
  private paused = false;
  private closed = false;
  private waitCommit: (() => void) | null = null;

  private onText: (finalText: string, interim: string) => void;
  private onFail: (code: string) => void;
  constructor(onText: (finalText: string, interim: string) => void, onFail: (code: string) => void) {
    this.onText = onText;
    this.onFail = onFail;
  }

  get text() {
    return this.finals.join(" ").replace(/\s+/g, " ").trim();
  }

  private queue: string[] = [];

  /** true = اشتغل. false = ما قدرنا (بدون رمز، أو السوكت ما فتح) والمسجّل يرجع لكتابة المتصفح.
      الصوت يبدأ يتجمّع فورًا وينرسل أول ما يفتح الاتصال، عشان أول كلمة ما تضيع. */
  async start(stream: MediaStream, tokenP: Promise<string | null> = liveSttToken()): Promise<boolean> {
    try {
      await this.startAudio(stream);
    } catch {
      this.close();
      return false;
    }
    const token = await tokenP;
    if (!token || this.closed) {
      this.close();
      return false;
    }
    const q = new URLSearchParams({ model_id: "scribe_v2_realtime", token, commit_strategy: "vad", audio_format: `pcm_${RATE}`, language_code: isEn ? "en" : "ar", vad_silence_threshold_secs: "0.8" });
    const ws = new WebSocket(`${WSS}?${q}`);
    this.ws = ws;
    const opened = await new Promise<boolean>((res) => {
      const t = window.setTimeout(() => res(false), 5000);
      ws.onopen = () => (window.clearTimeout(t), res(true));
      ws.onerror = () => (window.clearTimeout(t), res(false));
    });
    if (!opened || this.closed) {
      this.close();
      return false;
    }
    ws.onmessage = (e) => this.onMessage(e);
    ws.onclose = (e) => {
      if (!this.closed && e.code !== 1000) this.onFail(`closed_${e.code}`);
    };
    // اللي انقال قبل ما يفتح الاتصال (آخر 4 ثواني بالكثير)
    for (const b64 of this.queue.splice(0).slice(-40)) this.sendChunk(b64);
    return true;
  }

  private sendChunk(b64: string) {
    this.ws?.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: b64, commit: false, sample_rate: RATE }));
  }

  private async startAudio(stream: MediaStream) {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const node = new AudioWorkletNode(ctx, "ws-pcm");
    node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (this.paused || this.closed) return;
      const b64 = toBase64(e.data);
      if (this.ws?.readyState === WebSocket.OPEN) this.sendChunk(b64);
      else this.queue.push(b64);
    };
    const src = ctx.createMediaStreamSource(stream);
    src.connect(node);
    this.node = node;
    this.src = src;
    if (ctx.state === "suspended") await ctx.resume();
  }

  private onMessage(e: MessageEvent) {
    let d: { message_type?: string; text?: string; error?: string };
    try {
      d = JSON.parse(String(e.data));
    } catch {
      return;
    }
    const type = d.message_type ?? "";
    if (type === "partial_transcript") {
      this.partial = latinDigits(d.text ?? "").trim();
      this.onText(this.text, this.partial);
    } else if (type === "committed_transcript") {
      const t = latinDigits(d.text ?? "").trim();
      if (t) this.finals.push(t);
      this.partial = "";
      this.onText(this.text, "");
      this.waitCommit?.();
    } else if (type.endsWith("error") || ["quota_exceeded", "rate_limited", "unaccepted_terms", "resource_exhausted", "session_time_limit_exceeded"].includes(type)) {
      this.onFail(type);
    }
  }

  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }

  /** آخر كلام: نطلب «ثبّت» وننتظر الرد (لين ثانية ونص)، وبعدها نقفل */
  async finish(): Promise<string> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const done = new Promise<void>((res) => {
        this.waitCommit = res;
        window.setTimeout(res, 1500);
      });
      try {
        this.ws.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: "", commit: true, sample_rate: RATE }));
        await done;
      } catch {
        /* نكمّل بالموجود */
      }
    }
    // لو آخر جملة ما تثبّتت، ناخذ المؤقت بدل ما يضيع
    if (this.partial) this.finals.push(this.partial);
    this.partial = "";
    const text = this.text;
    this.close();
    return text;
  }

  close() {
    this.closed = true;
    this.waitCommit = null;
    try {
      this.src?.disconnect();
      this.node?.disconnect();
    } catch {
      /* ما يهم */
    }
    void this.ctx?.close().catch(() => {});
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close(1000, "done");
    this.ws = null;
    this.ctx = null;
  }
}
