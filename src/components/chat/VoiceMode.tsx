import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, CircleHelp, FileText, Keyboard, Mic, PenLine, X } from "lucide-react";
import Avatar from "../ui/Avatar";
import { tr } from "../../lib/i18n";
import { canTranscribeLive, extractVoice, fmtDur, kindLabel, MAX_MS, transcribeServer, uploadVoice, VoiceRecorder, type VoiceItem, type VoiceKind } from "../../lib/voice";

/* وضع الفويس — القيم منقولة من design-reference/supervisor (VoiceListenM/EN، VoiceDesk، VoiceSortM، VoiceSpec):
   خلفية سينمائية + زجاج blur(20px) saturate(1.2)، الموجة من مستوى الصوت الحقيقي بس (ساكتة = ثابتة)، والكروت تطلع لما الذكاء يلقط شي */

type Phase = "starting" | "listening" | "paused" | "thinking" | "sorting" | "blocked" | "nomic";
export interface VoiceResult {
  blob: Blob;
  path: string | null;
  duration: number;
  peaks: number[];
  transcript: string;
  gist: string;
  items: VoiceItem[];
}
interface Member {
  id: string;
  name: string;
  avatar?: string | null;
}

const BARS = 28;
const KIND_ICON: Record<VoiceKind, typeof Check> = { task: Check, decision: FileText, question: CircleHelp, date: CalendarDays, note: PenLine };
// أماكن الكروت الطايرة (٪ من الشاشة) — الجوال والديسكتوب، والبعيدة (3 و4) مغبّشة 1.2px
const SLOTS_M = [
  { x: 62, y: 18, r: -9, ry: 0 },
  { x: 2, y: 10, r: 7, ry: 10 },
  { x: 4, y: 37, r: -6, ry: 0 },
  { x: 34, y: 35, r: 3, ry: 0 },
  { x: 66, y: 37, r: 8, ry: -8 },
];
const SLOTS_D = [
  { x: 57, y: 12, r: -8, ry: 0 },
  { x: 42, y: 7, r: 5, ry: 0 },
  { x: 26, y: 16, r: -6, ry: 0 },
  { x: 17, y: 36, r: -5, ry: 0 },
  { x: 39, y: 36, r: 6, ry: 0 },
];

export default function VoiceMode({ teamId, roster, onClose, onTypeInstead, onSend, onOffline }: { teamId: string; roster: Member[]; onClose: () => void; onTypeInstead: () => void; onSend: (r: VoiceResult, withItems: boolean) => Promise<boolean>; onOffline: (r: VoiceResult) => void }) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [items, setItems] = useState<VoiceItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [off, setOff] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const rec = useRef<VoiceRecorder | null>(null);
  const lastExtract = useRef({ at: 0, words: 0 });
  const lastLevel = useRef(0);
  const mic = useRef<HTMLButtonElement>(null);
  const desk = typeof window !== "undefined" && window.matchMedia?.("(min-width: 900px)").matches;
  const reduce = typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true");
  const live = canTranscribeLive();
  // الأب يعيد الرسم كثير: نحفظ دواله بمراجع عشان التسجيل ما يعيد يبدأ
  const cb = useRef({ onOffline, onSend, onClose });
  useEffect(() => {
    cb.current = { onOffline, onSend, onClose };
  });

  const stop = useCallback(async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setPhase("thinking");
    const t0 = Date.now();
    const out = await r.stop();
    let text = out.text;
    let gist = "";
    let found: VoiceItem[] = [];
    if (navigator.onLine === false) {
      cb.current.onOffline({ ...out, path: null, transcript: text, gist: "", items: [] });
      return;
    }
    // نرفع الملف، ولو التفريغ بالسيرفر مفعّل ناخذ نصه (أدق من كتابة المتصفح)
    const path = out.blob.size ? await uploadVoice(teamId, out.blob) : null;
    if (path) text = (await transcribeServer(path)) || text;
    const ex = text ? await extractVoice(text) : null;
    if (ex) {
      gist = ex.gist;
      found = ex.items;
    }
    // «نرتّب كلامك…» ثانيتين على الأقل عشان ما تومض الشاشة
    const wait = 1600 - (Date.now() - t0);
    if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    setItems(found);
    setResult({ blob: out.blob, path, duration: out.duration, peaks: out.peaks, transcript: text, gist, items: found });
    setOff(new Set());
    setPhase("sorting");
  }, [teamId]);

  const start = useCallback(async () => {
    setPhase("starting");
    const r = new VoiceRecorder({
      onLevel: (lv) => {
        // نحدّث الأعمدة ~12 مرة بالثانية من مستوى الصوت الحقيقي
        const now = performance.now();
        if (now - lastLevel.current < 80) return;
        lastLevel.current = now;
        setLevels((prev) => [...prev.slice(1), lv]);
      },
      onText: (f, i) => {
        setFinalText(f);
        setInterim(i);
      },
      onLimit: () => void stop(),
    });
    try {
      await r.start();
      rec.current = r;
      setPhase("listening");
    } catch (e) {
      setPhase((e as Error).message === "blocked" ? "blocked" : "nomic");
    }
  }, [stop]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => alive && void start(), 0);
    return () => {
      alive = false;
      clearTimeout(t);
      rec.current?.cancel();
      rec.current = null;
    };
    // مرة وحدة لما تنفتح
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // العدّاد + استخراج المهام كل ~5 ثواني على النص المتراكم
  useEffect(() => {
    if (phase !== "listening" && phase !== "paused") return;
    const t = setInterval(() => {
      const r = rec.current;
      if (!r) return;
      setElapsed(r.elapsed);
      const text = r.text;
      const words = text ? text.split(/\s+/).length : 0;
      if (phase === "listening" && Date.now() - lastExtract.current.at > 5000 && words - lastExtract.current.words >= 6) {
        lastExtract.current = { at: Date.now(), words };
        void extractVoice(text).then((ex) => ex && rec.current && setItems(ex.items));
      }
    }, 500);
    return () => clearInterval(t);
  }, [phase]);

  const togglePause = useCallback(() => {
    const r = rec.current;
    if (!r) return;
    if (r.paused) {
      r.resume();
      setPhase("listening");
    } else {
      r.pause();
      setPhase("paused");
      setLevels((prev) => prev.map((x) => x));
    }
  }, []);

  const cancel = useCallback(() => {
    rec.current?.cancel();
    rec.current = null;
    cb.current.onClose();
  }, []);

  const send = useCallback(
    async (withItems: boolean) => {
      if (!result || sending) return;
      setSending(true);
      const ok = await cb.current.onSend({ ...result, items: withItems ? result.items.filter((_, i) => !off.has(i)) : [] }, withItems);
      setSending(false);
      if (ok) cb.current.onClose();
    },
    [result, sending, off],
  );

  // الكيبورد: مسافة = إيقاف مؤقت · Esc = إلغاء · Enter = أرسلوا (أو وقّفوا وكمّلوا للترتيب)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === " " && (phase === "listening" || phase === "paused")) {
        e.preventDefault();
        togglePause();
      } else if (e.key === "Enter" && !(e.target as HTMLElement)?.closest?.("button")) {
        e.preventDefault();
        if (phase === "listening" || phase === "paused") void stop();
        else if (phase === "sorting") void send(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, cancel, togglePause, stop, send]);

  useEffect(() => {
    mic.current?.focus();
  }, [phase]);

  const who = (id: string | null) => (id ? roster.find((m) => m.id === id) : undefined);
  const recording = phase === "listening" || phase === "paused" || phase === "starting";
  const slots = desk ? SLOTS_D : SLOTS_M;
  const shown = items.slice(-5);
  const kept = result ? result.items.filter((_, i) => !off.has(i)).length : 0;

  const wave = (vals: number[], dim = 0) => (
    <div aria-hidden className="vm-wave">
      {reduce && recording ? (
        <i className="vm-flat" />
      ) : (
        vals.map((v, i) => <i key={i} style={{ height: Math.max(5, Math.round(v * 30)), background: i >= vals.length - dim ? "rgba(255,244,234,.28)" : "rgba(255,244,234,.92)" }} />)
      )}
    </div>
  );

  return createPortal(
    <div className="vm-root" role="dialog" aria-modal="true" aria-label={tr("محادثة الفريق · فويس")}>
      <img src={desk ? "/sup/vbg_d.jpg" : "/sup/vbg_m.jpg"} alt="" aria-hidden className="vm-bg" style={{ objectPosition: phase === "sorting" ? "60% 20%" : desk ? "70% 30%" : "38% 18%" }} />
      <div aria-hidden className="vm-shade" />
      <div aria-hidden className="vm-grain" />

      {/* الهيدر */}
      <div className="vm-top">
        <button type="button" aria-label={tr("سكّروا")} className="vm-gl vm-close" onClick={cancel}>
          <X size={18} />
        </button>
        {desk ? (
          <span className="vm-gl vm-rec">
            <i aria-hidden className={phase === "listening" ? "on" : ""} />
            {phase === "paused" ? tr("موقّف مؤقت") : tr("يسجّل")} · <span dir="ltr">{fmtDur(result?.duration ?? elapsed)}</span>
          </span>
        ) : (
          <div className="flex-1 text-center leading-[1.3]">
            <div className="text-[15px] font-extrabold text-[#FFF4EA]">{tr("محادثة الفريق · فويس")}</div>
            <div className="text-[12px] text-[rgba(255,240,228,.8)]" dir="ltr">
              {fmtDur(result?.duration ?? elapsed)}
            </div>
          </div>
        )}
        {desk ? (
          <span className="vm-gl vm-brand ms-auto">
            <span aria-hidden className="vm-orb" />
            {tr("Wesync · محادثة الفريق")}
          </span>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      {/* الكروت الطايرة */}
      {phase !== "sorting" &&
        shown.map((it, i) => {
          const s = slots[i];
          const far = i >= 3;
          return (
            <div
              key={`${it.kind}:${it.title}`}
              className="vm-gl vm-card vm-fi"
              style={{ left: `${s.x}%`, top: `${s.y}%`, ["--r" as string]: `${s.r}deg`, ["--ry" as string]: `${s.ry}deg`, animationDelay: `${(i % 5) * 0.1}s`, filter: far ? "blur(1.2px)" : undefined, opacity: far ? 0.85 : undefined }}
            >
              <div className="text-[14px] font-extrabold leading-[1.3] text-[#FFF4EA]">{kindLabel(it.kind)}</div>
              <div className="vm-card-sub">{it.sub || it.title}</div>
              <div aria-hidden className="vm-folder">
                <i />
                <i className={it.kind === "question" ? "gold" : it.kind === "decision" || it.kind === "date" ? "soft" : ""} />
              </div>
            </div>
          );
        })}

      {/* الترتيب بعد الإيقاف */}
      {phase === "sorting" && result && (
        <div className="vm-sort">
          <div className="vm-fi flex items-center gap-2.5 text-[#FFF4EA]">
            <span className="text-[#FFC777]">✦</span>
            <b className="text-[20px]">{result.items.length ? tr("طلع من كلامك {0} أشياء", result.items.length) : tr("ما لقطنا مهام من كلامك")}</b>
          </div>
          {result.items.map((it, i) => {
            const Icon = KIND_ICON[it.kind];
            const person = it.kind === "task" ? who(it.assignee_id) : undefined;
            const on = !off.has(i);
            return (
              <div key={i} className="vm-gl vm-fi vm-row" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                <span className="vm-ic">
                  <Icon size={19} aria-hidden />
                </span>
                <div className="min-w-0 flex-1 leading-[1.35]">
                  <div className="text-[12px] font-bold text-[#FFD9A8]">{kindLabel(it.kind)}</div>
                  <div className="text-[15px] font-bold text-[#FFF4EA]" dir="auto">
                    {it.title}
                  </div>
                </div>
                {person && <Avatar initials="" name={person.name} avatar={person.avatar ?? undefined} px={26} ring="#1A120E" />}
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={tr("مضمّنة: {0}", it.title)}
                  className="vm-switch"
                  onClick={() => setOff((prev) => {
                    const n = new Set(prev);
                    if (n.has(i)) n.delete(i);
                    else n.add(i);
                    return n;
                  })}
                >
                  <span>
                    <i />
                  </span>
                </button>
              </div>
            );
          })}
          <div className="vm-gl2 vm-fi" style={{ borderRadius: 24, padding: 12, marginTop: 4, animationDelay: ".5s" }}>
            <div className="flex items-center gap-2.5">
              {wave(result.peaks)}
              <span className="text-[12px] text-[rgba(255,240,228,.8)]" dir="ltr">
                {fmtDur(result.duration)}
              </span>
            </div>
            {!result.transcript && <p className="m-0 mt-1.5 text-[13px] text-[rgba(255,240,228,.85)]">{live ? tr("ما وصلنا كلام واضح — تقدرون ترسلون الفويس كذا.") : tr("متصفحك ما يكتب الكلام — الفويس يوصل بدون نص.")}</p>}
            {kept > 0 && (
              <button ref={mic} type="button" className="vm-send" disabled={sending} onClick={() => void send(true)}>
                {tr("أرسلوها للفريق ({0} + الفويس)", kept)}
              </button>
            )}
            <button type="button" className={kept > 0 ? "vm-textbtn" : "vm-send"} disabled={sending} onClick={() => void send(false)}>
              {tr("أرسلوا الفويس بس")}
            </button>
          </div>
        </div>
      )}

      {/* صندوق النص + المايك */}
      {phase !== "sorting" && (
        <div className="vm-box-wrap">
          <div className="vm-gl2 vm-fi vm-box">
            {phase === "blocked" || phase === "nomic" ? (
              <div role="alert" className="text-[15px] leading-[1.7] text-[#FFF4EA]">
                <b className="block">{phase === "blocked" ? tr("المايك مقفل") : tr("ما لقينا مايك")}</b>
                {phase === "blocked" ? tr("فعّلوا المايك من إعدادات المتصفح (رمز القفل جنب الرابط)، وبعدها جرّبوا مرة ثانية.") : tr("وصّلوا مايك أو جرّبوا من الجوال.")}
              </div>
            ) : phase === "thinking" ? (
              <p className="m-0 text-[16px] font-semibold text-[#FFF4EA]" role="status">
                {tr("نرتّب كلامك…")}
              </p>
            ) : (
              <p className="m-0 min-h-[52px] text-[16px] font-semibold leading-[1.65] text-[#FFF4EA]" dir="auto" aria-live="polite">
                {finalText || interim ? (
                  <>
                    {finalText.length > 150 ? `…${finalText.slice(-150).replace(/^\S*\s/, "")}` : finalText} <span className="vm-fadeend">{interim}</span>
                    <span aria-hidden className="vm-caret" />
                  </>
                ) : (
                  <span className="text-[rgba(255,240,228,.75)]">{live ? tr("تكلّموا عادي… نكتب أول بأول") : tr("نسجّل… النص يطلع بعد ما توقفون")}</span>
                )}
              </p>
            )}
            <div className="mt-3.5 flex items-center gap-3">
              <button type="button" aria-label={tr("اكتبوا بدل الصوت")} className="vm-alt" onClick={() => { cancel(); onTypeInstead(); }}>
                <Keyboard size={20} aria-hidden />
              </button>
              <div className="flex-1 text-center">
                {wave(phase === "listening" || phase === "paused" ? levels : Array(BARS).fill(0.12), phase === "paused" ? BARS : 0)}
                <div role="status" className="mt-1 text-[13px] text-[rgba(255,240,228,.85)]">
                  {phase === "paused" ? tr("موقّف مؤقت · اضغطوا مسافة للمتابعة") : phase === "listening" ? tr("نسمعك… ونطلّع المهام أول بأول") : phase === "thinking" ? tr("ثواني…") : phase === "starting" ? tr("نشغّل المايك…") : ""}
                  {phase === "listening" && elapsed > MAX_MS - 30_000 && <> · {tr("باقي {0} ثانية", Math.max(0, Math.round((MAX_MS - elapsed) / 1000)))}</>}
                </div>
              </div>
              {phase === "blocked" || phase === "nomic" ? (
                <button ref={mic} type="button" className="vm-mic" onClick={() => void start()}>
                  <span className="text-[13px] font-extrabold">{tr("جرّبوا")}</span>
                </button>
              ) : (
                <button
                  ref={mic}
                  type="button"
                  aria-label={phase === "paused" ? tr("كمّلوا التسجيل") : tr("وقّفوا التسجيل")}
                  aria-pressed={phase === "listening"}
                  className={`vm-mic${phase === "paused" ? " paused" : ""}`}
                  disabled={phase === "thinking" || phase === "starting"}
                  onClick={() => (phase === "paused" ? togglePause() : void stop())}
                >
                  <Mic size={22} strokeWidth={2} aria-hidden />
                </button>
              )}
            </div>
          </div>
          <p className="vm-hint">{desk ? tr("مسافة = إيقاف مؤقت · Esc = إلغاء · Enter = أرسلوا") : tr("اضغطوا المايك للإيقاف · الفويس يوصل للفريق مع نصه")}</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
