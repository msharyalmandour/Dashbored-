import { useEffect, useRef, useState } from "react";
import { Coffee, Moon, Pause, Play, RotateCcw, Square } from "lucide-react";
import clsx from "clsx";
import Card from "./ui/Card";
import { useAuth } from "../context/AuthContext";
import { getGreeting } from "../lib/date";
import { g, isFemaleUser } from "../lib/gender";

type SessionState = "idle" | "running" | "paused" | "done";

const durations = [25, 45, 60];

const sessionQuotes = [
  "صفحة وحدة اليوم أفضل من ولا صفحة.",
  "ركّز على السطر اللي قدامك بس، الباقي يجي وحده.",
  "كل دقيقة تركيز الحين توفّر عليك ساعة بعدين.",
  "لو تشتت ذهنك، ارجع بهدوء — مافي داعي للضغط.",
];

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function FocusSession() {
  const { currentUser } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const isNight = getGreeting().period === "night";
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [state, setState] = useState<SessionState>("idle");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state !== "running") return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setState("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "running") return;
    const quoteTimer = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % sessionQuotes.length);
    }, 20000);
    return () => clearInterval(quoteTimer);
  }, [state]);

  const start = () => {
    setRemaining(duration * 60);
    setState("running");
    setQuoteIndex(0);
  };

  const reset = () => {
    setState("idle");
    setRemaining(duration * 60);
  };

  const progressPct = ((duration * 60 - remaining) / (duration * 60)) * 100;

  if (state === "idle") {
    return (
      <Card tone="cream" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
              isNight ? "bg-brand-700 shadow-brand-700/30" : "bg-amber-accent-500 shadow-amber-accent-500/30",
            )}
          >
            {isNight ? <Moon size={20} /> : <Coffee size={20} />}
          </span>
          <div>
            <p className="font-display font-bold text-brand-950">
              {isNight
                ? "جلسة بحث هادئة قبل النوم"
                : g(isFemale, "جهزي قهوتك وابدئي جلسة بحث", "جهّز قهوتك وابدأ جلسة بحث")}
            </p>
            <p className="text-sm text-brand-950/50">
              {isNight
                ? "خلها جلسة خفيفة — نوم كافي أهم من ساعة إضافية."
                : "وقت تركيز بدون مقاطعات — اختر المدة وابدأ."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDuration(d);
                  setRemaining(d * 60);
                }}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  duration === d
                    ? "bg-brand-500 text-white"
                    : "bg-paper text-brand-950/60 hover:bg-surface-muted",
                )}
              >
                {d} د
              </button>
            ))}
          </div>
          <button
            onClick={start}
            className={clsx(
              "flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm",
              isNight
                ? "bg-brand-700 shadow-brand-700/30 hover:bg-brand-800"
                : "bg-amber-accent-500 shadow-amber-accent-500/30 hover:bg-amber-accent-600",
            )}
          >
            <Play size={16} />
            {isNight
              ? g(isFemale, "ابدئي الجلسة", "ابدأ الجلسة")
              : `${g(isFemale, "ابدئي", "ابدأ")} الجلسة ☕`}
          </button>
        </div>
      </Card>
    );
  }

  if (state === "done") {
    return (
      <Card tone={isNight ? "teal" : "amber"} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            {isNight ? <Moon size={20} /> : <Coffee size={20} />}
          </span>
          <div>
            <p className="font-display font-bold text-brand-950">🎉 خلّصت جلستك! أحسنت</p>
            <p className="text-sm text-brand-950/60">
              {isNight
                ? g(
                    isFemale,
                    "وقت استراحة — اشربي مويه، وفكّري تختمي الليلة بدري عشان نوم أفضل.",
                    "وقت استراحة — اشرب مويه، وفكّر تختم الليلة بدري عشان نوم أفضل.",
                  )
                : g(
                    isFemale,
                    "وقت استراحة قصيرة — اشربي قهوة، تمشي شوي، وارجعي لجلسة جديدة.",
                    "وقت استراحة قصيرة — اشرب قهوة، تمشى شوي، وارجع لجلسة جديدة.",
                  )}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          <RotateCcw size={16} />
          جلسة جديدة
        </button>
      </Card>
    );
  }

  return (
    <Card tone="teal" className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-track)" strokeWidth="5" />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="var(--color-brand-500)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - progressPct / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          {isNight ? (
            <Moon size={18} className="absolute text-brand-700" />
          ) : (
            <Coffee size={18} className="absolute text-amber-accent-600" />
          )}
        </div>
        <div>
          <p className="font-display text-2xl font-extrabold text-brand-950">
            {formatTime(remaining)}
          </p>
          <p className="text-sm italic text-brand-950/55">{sessionQuotes[quoteIndex]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setState(state === "running" ? "paused" : "running")}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
        >
          {state === "running" ? <Pause size={15} /> : <Play size={15} />}
          {state === "running" ? "إيقاف مؤقت" : "استكمال"}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-xl bg-paper px-4 py-2 text-sm font-bold text-brand-950/60 hover:bg-surface-muted"
        >
          <Square size={14} />
          إنهاء
        </button>
      </div>
    </Card>
  );
}
