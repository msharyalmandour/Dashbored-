import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { GraduationCap, Mail, PartyPopper, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { projectMeta, teamMembers } from "../data/mockData";
import { formatDateLong, toISODate } from "../lib/date";

const SUBMITTED_KEY = "nursync.submittedAt";
const CAPSULE_KEY = "nursync.timecapsule";

interface CapsuleData {
  why: string;
  hope: string;
  writtenAt: string;
}

function loadCapsule(): CapsuleData | null {
  try {
    const raw = localStorage.getItem(CAPSULE_KEY);
    return raw ? (JSON.parse(raw) as CapsuleData) : null;
  } catch {
    return null;
  }
}

const confettiDots = Array.from({ length: 18 }, (_, i) => i);
const confettiColors = [
  "bg-brand-400",
  "bg-amber-accent-400",
  "bg-sky-accent-400",
  "bg-rose-400",
];

export default function Celebration() {
  const { currentUser } = useAuth();
  const [submittedAt] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(SUBMITTED_KEY);
      if (stored) return stored;
      const now = new Date().toISOString();
      localStorage.setItem(SUBMITTED_KEY, now);
      return now;
    } catch {
      return new Date().toISOString();
    }
  });
  const [capsule] = useState<CapsuleData | null>(loadCapsule);

  if (!currentUser) return <Navigate to="/login" replace />;

  const isFirstView =
    Math.abs(Date.now() - new Date(submittedAt).getTime()) < 60_000;
  const firstName = currentUser.name.split(" ")[0];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-surface to-amber-accent-50 px-4 py-10">
      {isFirstView &&
        confettiDots.map((i) => (
          <span
            key={i}
            className={`pointer-events-none absolute h-2.5 w-2.5 rounded-full opacity-70 motion-reduce:hidden ${confettiColors[i % confettiColors.length]} animate-[ping_2.4s_ease-in-out_infinite]`}
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 23) % 90}%`,
              animationDelay: `${(i % 6) * 0.3}s`,
            }}
          />
        ))}

      <div className="relative w-full max-w-xl space-y-5">
        <div className="rounded-3xl border border-brand-100 bg-paper p-8 text-center shadow-sm shadow-brand-950/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/30">
            <GraduationCap size={30} />
          </div>
          <p className="flex items-center justify-center gap-2 font-display text-2xl font-extrabold text-brand-950">
            <PartyPopper size={22} className="text-amber-accent-500" />
            مبروك يا {firstName}!
          </p>
          <p className="mt-2 text-sm text-brand-950/60">سلّمتِ بحثك النهائي — إنجاز يستاهل الاحتفال 🎉</p>

          <div className="mt-5 rounded-2xl border border-brand-100 bg-surface-muted p-4 text-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-950/40">
              شهادة إنجاز بحث
            </p>
            <p className="mt-1 font-display text-lg font-bold text-brand-950">{projectMeta.name}</p>
            <p className="text-xs text-brand-700" dir="ltr">
              {projectMeta.subtitle}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-950/50">
              <span>الفريق البحثي: {teamMembers.map((m) => m.name.split(" ")[0]).join("، ")}</span>
              <span>{formatDateLong(toISODate(new Date(submittedAt)))}</span>
            </div>
          </div>
        </div>

        {capsule && (capsule.why || capsule.hope) && (
          <div className="rounded-3xl border border-brand-100 bg-brand-50 p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                <Mail size={16} />
              </span>
              <p className="font-display font-bold text-brand-950">
                رجعتلك رسالتك من يوم بدأتِ 💌
              </p>
            </div>
            {capsule.why && (
              <p className="text-sm text-brand-950/70">
                <span className="font-semibold text-brand-950">وقتها قلتِ ليش بدأتِ:</span>{" "}
                {capsule.why}
              </p>
            )}
            {capsule.hope && (
              <p className="mt-2 text-sm text-brand-950/70">
                <span className="font-semibold text-brand-950">وكنتِ تتمنين:</span> {capsule.hope}
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              <Sparkles size={14} />
              وصلتِ لها — بكل فخر.
            </p>
          </div>
        )}

        <div className="text-center">
          <Link
            to="/"
            className="inline-block rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
          >
            الرجوع للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
