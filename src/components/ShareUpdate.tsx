import { useEffect, useState } from "react";
import { Check, Copy, ImageDown, MessageCircle, Share2 } from "lucide-react";
import { projectMeta, recentActivity, teamMembers } from "../data/mockData";
import { formatDateLong } from "../lib/date";
import { tr } from "../lib/i18n";

interface ShareUpdateProps {
  mode: "supabase" | "mock";
  projectTitle: string;
  overallProgress: number;
  currentStageAr: string | null;
  currentTaskTitle: string | null;
  nextLabel: string | null;
  nextDate: string | null;
}

function buildMockMessage(): string {
  const memberName = (id: string) => teamMembers.find((m) => m.id === id)?.name ?? id;
  const activityLines = recentActivity
    .slice(0, 5)
    .map((a) => `• ${memberName(a.memberId)} ${a.action} ${a.target}`)
    .join("\n");

  return tr("📋 تحديث تقدم بحث: {0}\n\nنسبة التقدم: {1}%\nالمرحلة الحالية: {2}\nالمهمة الحالية: {3}\nالموعد القادم: {4} — {5}\n\nآخر التحديثات:\n{6}\n\nتم إنشاؤه عبر Wesync", projectMeta.name, projectMeta.overallProgress, projectMeta.currentStageAr, projectMeta.currentTask, projectMeta.nextDeadlineLabel, formatDateLong(projectMeta.nextDeadlineDate), activityLines);
}

function buildRealMessage(props: Omit<ShareUpdateProps, "mode">): string {
  const { projectTitle, overallProgress, currentStageAr, currentTaskTitle, nextLabel, nextDate } = props;
  const nextLine =
    nextLabel && nextDate ? tr("الموعد القادم: {0} — {1}\n\n", nextLabel, formatDateLong(nextDate)) : "";

  return tr("📋 تحديث تقدم بحث: {0}\n\nنسبة التقدم: {1}%\nالمرحلة الحالية: {2}\nالمهمة الحالية: {3}\n\n{4}تم إنشاؤه عبر Wesync", projectTitle, overallProgress, currentStageAr ?? tr("لم تبدأ مرحلة بعد"), currentTaskTitle ?? tr("ما فيه مهمة نشطة الحين"), nextLine);
}

/** بطاقة تقدّم قابلة للنشر (1080×1350) بهوية Wesync — بدون عنوان البحث ولا أسماء، فقط النسبة والمرحلة. */
async function makeProgressCard(percent: number, stageAr: string | null): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    await Promise.all([document.fonts.load("900 200px Tajawal"), document.fonts.load("700 44px Tajawal")]);
  } catch {
    // نكمل بالخط الاحتياطي
  }
  // هوية Wesync الثابتة: أسود Obsidian مع توهّج Ember برتقالي
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.48, 40, W / 2, H * 0.48, W * 0.85);
  glow.addColorStop(0, "rgba(255,138,36,0.55)");
  glow.addColorStop(0.45, "rgba(255,106,0,0.18)");
  glow.addColorStop(1, "rgba(8,8,8,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 30px Tajawal, sans-serif";
  ctx.fillText("W E S Y N C  ∞", W / 2, 120);
  ctx.fillStyle = "#f59e0b";
  ctx.font = "900 330px Tajawal, sans-serif";
  ctx.fillText(`${percent}%`, W / 2, 700);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 58px Tajawal, sans-serif";
  ctx.fillText(tr("من رحلة بحثنا انتهت"), W / 2, 810);
  if (stageAr) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 44px Tajawal, sans-serif";
    ctx.fillText(tr("مرحلتنا الحالية: {0}", stageAr), W / 2, 900);
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 34px Tajawal, sans-serif";
  ctx.fillText(tr("بحثكم يخلص بوقته.. مو بآخر ليلة"), W / 2, H - 110);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** يصيغ رسالة تحديث جاهزة (تقدم + آخر التحديثات) عشان تُرسل للمشرف/ة بضغطة،
    بدل ما تُكتب يدويًا كل مرة — من بيانات الفريق الحقيقية في وضع supabase،
    ومن بيانات تجريبية في وضع mock فقط */
export default function ShareUpdate(props: ShareUpdateProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const message = props.mode === "mock" ? buildMockMessage() : buildRealMessage(props);

  // نجهّز الصورة أول ما تنفتح اللوحة: سفاري (آيفون) يرفض navigator.share لو سبقه انتظار
  // داخل نفس الضغطة، فتطلع رسالة خطأ بدل قائمة المشاركة/AirDrop
  useEffect(() => {
    if (!open) return;
    let alive = true;
    makeProgressCard(props.overallProgress, props.currentStageAr).then((b) => {
      if (alive) setCardBlob(b);
    });
    return () => {
      alive = false;
    };
  }, [open, props.overallProgress, props.currentStageAr]);

  const shareCard = async () => {
    const blob = cardBlob ?? (await makeProgressCard(props.overallProgress, props.currentStageAr));
    if (!blob) return;
    const file = new File([blob], "wesync-progress.png", { type: "image/png", lastModified: Date.now() });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      // المستخدم سكّر قائمة المشاركة بنفسه — ما ننزّل شي
      if ((e as DOMException)?.name === "AbortError") return;
      // غير مدعومة أو انرفضت — ننزّل الصورة بدلها
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wesync-progress.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // نسخ يدوي من الحقل لو الحافظة غير متاحة
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3"
      >
        <span className="flex items-center gap-2 font-display text-base font-bold text-brand-950">
          <Share2 size={18} className="text-brand-500" />{tr("شارك التحديث")}</span>
        <span className="text-sm text-brand-950/45">
          {open ? tr("إخفاء") : tr("جهّز رسالة جاهزة لمشرفتكم")}
        </span>
      </button>

      {open && (
        <div className="mt-4">
          <textarea
            readOnly
            value={message}
            rows={9}
            className="w-full resize-none rounded-xl border border-brand-100 bg-surface-muted p-3 text-sm leading-relaxed text-brand-950/80"
            dir="rtl"
          />
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              onClick={copy}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? tr("تم النسخ") : tr("نسخ النص")}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted"
            >
              <MessageCircle size={16} />{tr("مشاركة عبر واتساب")}</a>
            <button
              onClick={shareCard}
              className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted"
            >
              <ImageDown size={16} />{tr("بطاقة تقدّم (صورة)")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
