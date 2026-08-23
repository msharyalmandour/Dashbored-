import { useState } from "react";
import { Lock, Mail, PenLine, Sparkles } from "lucide-react";
import Card from "./ui/Card";

const STORAGE_KEY = "nursync.timecapsule";
const UNLOCK_DAYS = 7;

interface CapsuleData {
  why: string;
  hope: string;
  writtenAt: string;
  readAt?: string;
}

function loadCapsule(): CapsuleData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CapsuleData) : null;
  } catch {
    return null;
  }
}

function saveCapsule(data: CapsuleData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function TimeCapsule() {
  const [capsule, setCapsule] = useState<CapsuleData | null>(loadCapsule);
  const [composing, setComposing] = useState(false);
  const [why, setWhy] = useState("");
  const [hope, setHope] = useState("");

  const daysSinceWritten = capsule
    ? Math.floor((Date.now() - new Date(capsule.writtenAt).getTime()) / 86_400_000)
    : 0;
  const unlocked = daysSinceWritten >= UNLOCK_DAYS;

  const submit = () => {
    if (!why.trim() && !hope.trim()) return;
    const data: CapsuleData = {
      why: why.trim(),
      hope: hope.trim(),
      writtenAt: new Date().toISOString(),
    };
    saveCapsule(data);
    setCapsule(data);
    setComposing(false);
  };

  const markRead = () => {
    if (!capsule) return;
    const updated = { ...capsule, readAt: new Date().toISOString() };
    saveCapsule(updated);
    setCapsule(updated);
  };

  const writeNew = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCapsule(null);
    setWhy("");
    setHope("");
    setComposing(true);
  };

  if (composing) {
    return (
      <Card tone="violet" className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            <Mail size={16} />
          </span>
          <div>
            <p className="font-display font-bold text-brand-950">رسالة لنفسك المستقبلية</p>
            <p className="text-xs text-brand-950/50">راح ترجع لك يوم تسلّمين بحثك النهائي ✉️</p>
          </div>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-brand-950/70">ليش بدأتِ هالبحث؟</span>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            placeholder="اكتبي بكل صراحة..."
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-brand-950/70">وش تتمنين توصلين له؟</span>
          <textarea
            value={hope}
            onChange={(e) => setHope(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
            placeholder="حلمك من هالبحث..."
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={submit}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            احفظ رسالتي
          </button>
          <button
            onClick={() => setComposing(false)}
            className="rounded-xl bg-paper px-4 py-2 text-sm font-bold text-brand-950/50 hover:bg-surface-muted"
          >
            لاحقًا
          </button>
        </div>
      </Card>
    );
  }

  if (!capsule) {
    return (
      <Card tone="violet" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            <Mail size={18} />
          </span>
          <div>
            <p className="font-display font-bold text-brand-950">اكتبي رسالة لنفسك المستقبلية</p>
            <p className="text-sm text-brand-950/50">سؤالين بسيطين — راح نرجعهم لك يوم تخلصين رحلتك 💌</p>
          </div>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
        >
          <PenLine size={16} />
          اكتب رسالتي
        </button>
      </Card>
    );
  }

  if (!unlocked) {
    const remaining = UNLOCK_DAYS - daysSinceWritten;
    return (
      <Card tone="violet" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-400 text-white shadow-sm shadow-brand-400/30">
            <Lock size={18} />
          </span>
          <div>
            <p className="font-display font-bold text-brand-950">رسالتك محفوظة بأمان 🔒</p>
            <p className="text-sm text-brand-950/50">
              راح تنفتح بعد {remaining} {remaining === 1 ? "يوم" : "أيام"} — خلها مفاجأة لنفسك.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!capsule.readAt) {
    return (
      <Card tone="violet" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            <Sparkles size={18} />
          </span>
          <div>
            <p className="font-display font-bold text-brand-950">رسالتك جاهزة تُفتح! ✉️</p>
            <p className="text-sm text-brand-950/50">اللي كتبتيه لنفسك من زمان — جاهز تشوفينه الحين.</p>
          </div>
        </div>
        <button
          onClick={markRead}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600"
        >
          افتح رسالتي
        </button>
      </Card>
    );
  }

  return (
    <Card tone="violet" className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
          <Mail size={16} />
        </span>
        <p className="font-display font-bold text-brand-950">رسالتك من نفسك القديمة 💌</p>
      </div>
      {capsule.why && (
        <p className="text-sm text-brand-950/70">
          <span className="font-semibold text-brand-950">ليش بدأتِ؟</span> {capsule.why}
        </p>
      )}
      {capsule.hope && (
        <p className="text-sm text-brand-950/70">
          <span className="font-semibold text-brand-950">كنتِ تتمنين:</span> {capsule.hope}
        </p>
      )}
      <button onClick={writeNew} className="text-xs font-semibold text-brand-600 hover:underline">
        اكتب رسالة جديدة
      </button>
    </Card>
  );
}
