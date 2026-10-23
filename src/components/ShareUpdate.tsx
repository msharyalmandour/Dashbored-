import { useState } from "react";
import { Check, Copy, ImageDown, MessageCircle, Share2 } from "lucide-react";
import { projectMeta, recentActivity, teamMembers } from "../data/mockData";
import { formatDateLong } from "../lib/date";

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

  return `📋 تحديث تقدم بحث: ${projectMeta.name}

نسبة التقدم: ${projectMeta.overallProgress}%
المرحلة الحالية: ${projectMeta.currentStageAr}
المهمة الحالية: ${projectMeta.currentTask}
الموعد القادم: ${projectMeta.nextDeadlineLabel} — ${formatDateLong(projectMeta.nextDeadlineDate)}

آخر التحديثات:
${activityLines}

تم إنشاؤه عبر Wesync`;
}

function buildRealMessage(props: Omit<ShareUpdateProps, "mode">): string {
  const { projectTitle, overallProgress, currentStageAr, currentTaskTitle, nextLabel, nextDate } = props;
  const nextLine =
    nextLabel && nextDate ? `الموعد القادم: ${nextLabel} — ${formatDateLong(nextDate)}\n\n` : "";

  return `📋 تحديث تقدم بحث: ${projectTitle}

نسبة التقدم: ${overallProgress}%
المرحلة الحالية: ${currentStageAr ?? "لم تبدأ مرحلة بعد"}
المهمة الحالية: ${currentTaskTitle ?? "ما فيه مهمة نشطة الحين"}

${nextLine}تم إنشاؤه عبر Wesync`;
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
  const bg = ctx.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0, "#1d2bd8");
  bg.addColorStop(1, "#0a1470");
  ctx.fillStyle = bg;
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
  ctx.fillText("من رحلة بحثنا انتهت", W / 2, 810);
  if (stageAr) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 44px Tajawal, sans-serif";
    ctx.fillText(`مرحلتنا الحالية: ${stageAr}`, W / 2, 900);
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 34px Tajawal, sans-serif";
  ctx.fillText("بحثكم يخلص بوقته.. مو بآخر ليلة", W / 2, H - 110);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** يصيغ رسالة تحديث جاهزة (تقدم + آخر التحديثات) عشان تُرسل للمشرف/ة بضغطة،
    بدل ما تُكتب يدويًا كل مرة — من بيانات الفريق الحقيقية في وضع supabase،
    ومن بيانات تجريبية في وضع mock فقط */
export default function ShareUpdate(props: ShareUpdateProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = props.mode === "mock" ? buildMockMessage() : buildRealMessage(props);

  const shareCard = async () => {
    const blob = await makeProgressCard(props.overallProgress, props.currentStageAr);
    if (!blob) return;
    const file = new File([blob], "wesync-progress.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {
      // المستخدم أغلق نافذة المشاركة، أو غير مدعومة — ننزّل الصورة
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
          <Share2 size={18} className="text-brand-500" />
          شارك التحديث
        </span>
        <span className="text-sm text-brand-950/45">
          {open ? "إخفاء" : "جهّز رسالة جاهزة لمشرفتكم"}
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
              {copied ? "تم النسخ" : "نسخ النص"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted"
            >
              <MessageCircle size={16} />
              مشاركة عبر واتساب
            </a>
            <button
              onClick={shareCard}
              className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted"
            >
              <ImageDown size={16} />
              بطاقة تقدّم (صورة)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
