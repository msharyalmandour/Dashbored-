import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { WELCOME_AUDIO } from "./HeroVideo";

const MUTE_KEY = "wesync-welcome-muted";
const PLAYED_KEY = "wesync-welcome-played";

const read = (k: string) => {
  try {
    return sessionStorage.getItem(k) ?? localStorage.getItem(k);
  } catch {
    return null;
  }
};

/** ترحيب صوتي "Welcome to Wesync" مرة وحدة لكل زيارة.
    المتصفحات تمنع الصوت التلقائي، فنجرّب أول ما تفتح الصفحة، وإن انمنع نشغّله عند أول لمسة/نقرة.
    الزر يعيد التشغيل أو يكتم الصوت (ويتذكر اختياركم). */
export default function WelcomeVoice({ className = "" }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => read(MUTE_KEY) === "1");
  const [playing, setPlaying] = useState(false);

  const play = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return false;
    try {
      a.currentTime = 0;
      await a.play();
      try {
        sessionStorage.setItem(PLAYED_KEY, "1");
      } catch {
        // ما يهم
      }
      return true;
    } catch {
      return false; // انمنع — ننتظر أول لمسة
    }
  }, []);

  useEffect(() => {
    const a = new Audio(WELCOME_AUDIO);
    a.preload = "auto";
    a.volume = 0.75;
    a.onplay = () => setPlaying(true);
    a.onended = () => setPlaying(false);
    a.onpause = () => setPlaying(false);
    audioRef.current = a;

    if (muted || read(PLAYED_KEY) === "1") return () => a.pause();

    let armed = true;
    const onGesture = () => {
      if (!armed) return;
      armed = false;
      cleanup();
      play();
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, onGesture));
    // نجرّب تلقائيًا أول شي؛ لو انمنع نستنى الحركة الأولى من الزائرة
    a.play()
      .then(() => {
        armed = false;
        cleanup();
        try {
          sessionStorage.setItem(PLAYED_KEY, "1");
        } catch {
          // ما يهم
        }
      })
      .catch(() => events.forEach((e) => window.addEventListener(e, onGesture, { once: true })));
    return () => {
      armed = false;
      cleanup();
      a.pause();
    };
    // نشغّل مرة وحدة عند التحميل
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      return;
    }
    if (muted) {
      setMuted(false);
      try {
        localStorage.removeItem(MUTE_KEY);
      } catch {
        // ما يهم
      }
    }
    play();
  };

  const mute = () => {
    audioRef.current?.pause();
    setMuted(true);
    try {
      localStorage.setItem(MUTE_KEY, "1");
    } catch {
      // ما يهم
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        onClick={toggle}
        aria-label="اسمعوا الترحيب"
        title="اسمعوا الترحيب"
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-amber-200 backdrop-blur-md transition-colors hover:bg-white/10 ${
          playing ? "animate-pulse" : ""
        }`}
      >
        <Volume2 size={15} />
      </button>
      {!muted && (
        <button
          onClick={mute}
          aria-label="كتم الترحيب"
          title="كتم الترحيب (ما يتكرر)"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:text-white/80"
        >
          <VolumeX size={14} />
        </button>
      )}
    </span>
  );
}
