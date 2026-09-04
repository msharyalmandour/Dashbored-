import { useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import Card from "./ui/Card";
import { projectMeta, recentActivity, teamMembers } from "../data/mockData";
import { formatDateLong } from "../lib/date";

function buildMessage(): string {
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

تم إنشاؤه عبر CohortSync`;
}

/** يصيغ رسالة تحديث جاهزة (تقدم + آخر التحديثات) عشان تُرسل للمشرف/ة بضغطة،
    بدل ما تُكتب يدويًا كل مرة */
export default function ShareUpdate() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = buildMessage();

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
    <Card>
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
          </div>
        </div>
      )}
    </Card>
  );
}
