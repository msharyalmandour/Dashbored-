import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play } from "lucide-react";
import { tr } from "../../lib/i18n";
import { fmtDur, kindLabel, voiceUrl, type VoiceMeta } from "../../lib/voice";

/** فقاعة الفويس بالمحادثة (VoiceBubbleM): تشغيل، موجة، المدة، ١٫٥×، «الزبدة»، النص كامل، وشرائح اللي طلع منه */
export default function VoiceBubble({ meta }: { meta: VoiceMeta }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const peaks = meta.peaks?.length ? meta.peaks : Array(28).fill(0.2);
  const total = meta.duration || 1;

  useEffect(() => () => audio.current?.pause(), []);

  const toggle = async () => {
    if (!meta.path) return setFailed(true);
    if (!audio.current) {
      const url = await voiceUrl(meta.path);
      if (!url) return setFailed(true);
      const a = new Audio(url);
      a.playbackRate = rate;
      a.ontimeupdate = () => setPos(a.currentTime * 1000);
      a.onended = () => {
        setPlaying(false);
        setPos(0);
      };
      a.onerror = () => {
        setFailed(true);
        setPlaying(false);
      };
      audio.current = a;
    }
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      await audio.current.play().catch(() => setFailed(true));
      setPlaying(!audio.current.paused);
    }
  };
  const nextRate = () => {
    const r = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(r);
    if (audio.current) audio.current.playbackRate = r;
  };
  const done = Math.round((pos / total) * peaks.length);

  return (
    <div className="vb">
      <div className="flex items-center gap-2.5">
        <button type="button" className="vb-play" aria-label={playing ? tr("وقّفوا") : tr("شغّلوا")} onClick={() => void toggle()} disabled={!meta.path}>
          {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
        <div aria-hidden className="vm-wave !h-[26px] flex-1">
          {peaks.map((v, i) => (
            <i key={i} style={{ height: Math.max(5, Math.round(v * 26)), background: i < done ? "#FFC777" : "rgba(255,244,234,.75)" }} />
          ))}
        </div>
        <span className="whitespace-nowrap text-[12px] text-[#E9D3B8]" dir="ltr">
          {fmtDur(playing || pos ? pos : total)}
        </span>
        <button type="button" className="vb-rate" aria-label={tr("السرعة")} onClick={nextRate} dir="ltr">
          {rate}×
        </button>
      </div>
      {failed && <p className="m-0 mt-1 text-[12px] text-[#ABA095]">{meta.path ? tr("ما قدرنا نشغّله الحين — جرّبوا بعد شوي.") : tr("الفويس لسا يرفع…")}</p>}
      {meta.gist && (
        <div className="mt-2 text-[14px] leading-[1.6] text-[#EAE3DC]" dir="auto">
          <span className="font-bold text-[#FFC777]">✦ {tr("الزبدة:")}</span> {meta.gist}
        </div>
      )}
      {meta.transcript && (
        <details className="mt-1.5">
          <summary className="flex min-h-[36px] cursor-pointer items-center text-[13px] font-bold text-[#EAE3DC]">{tr("النص كامل")}</summary>
          <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.7] text-[#E9D3B8]" dir="auto">
            {meta.transcript}
          </p>
        </details>
      )}
      {meta.items?.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {meta.items.map((it, i) => (
            <span key={i} className={`sup-chip${it.kind === "task" ? " gold" : ""}`}>
              {it.kind === "task" && <Check size={12} aria-hidden />}
              {it.kind === "task" && it.who ? tr("مهمة لـ{0}", it.who) : it.sub ? `${kindLabel(it.kind)} · ${it.sub.split(" · ").pop()}` : kindLabel(it.kind)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
