import { tr } from "./i18n";
import { CATCHPHRASE } from "./sound";
import { drawBrandLockup } from "./brandCanvas";
import type { DoorId } from "./doors";

/* بطاقة الإنجاز للستوري (1080×1920) — فكرة Spotify Wrapped: الطالب يتباهى بإنجازه هو، والاسم يوصل معه.
   بدون عنوان البحث ولا أسماء الفريق (بحثهم ما انشر، وخصوصيتهم أول) — بس الإنجاز ورحلتهم من 10. */

export const DOOR_SHARE: Partial<Record<DoorId, { title: string; sub: string }>> = {
  write: { title: tr("أول دراسة بمكتبة بحثنا"), sub: tr("وانفتح لنا المقترح") },
  methodology: { title: tr("كتبنا أول قسم من المقترح"), sub: tr("والمنهجية صارت قدّامنا") },
  supervisor: { title: tr("شغلنا صار جاهز للمشرف/ة"), sub: tr("خطوة خطوة، بوقتنا") },
  collect: { title: tr("المنهجية جاهزة"), sub: tr("بدأنا جمع البيانات") },
};

/** يقسم النص لأسطر بعرض محدد (العربي يتشكّل صح بالكانفس مع direction=rtl) */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawAchievement({ title, sub, step }: { title: string; sub: string; step: number | null }): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    await Promise.all([document.fonts.load("800 96px Tajawal"), document.fonts.load("500 44px Tajawal")]);
  } catch {
    /* نكمل بالخط الاحتياطي */
  }

  // Obsidian × Ember: أسود مع توهّج برتقالي من فوق
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.3, 30, W * 0.5, H * 0.3, W * 0.95);
  glow.addColorStop(0, "rgba(255,138,36,0.50)");
  glow.addColorStop(0.4, "rgba(255,106,0,0.16)");
  glow.addColorStop(1, "rgba(8,8,8,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.direction = "rtl";

  // العلامة فوق: شعار W + Wesync
  drawBrandLockup(ctx, W / 2, 160, 64);
  ctx.textAlign = "center";
  ctx.direction = "rtl";

  // الختم الذهبي: دائرة وعلامة صح
  const cx = W / 2;
  const cy = 600;
  const seal = ctx.createRadialGradient(cx - 50, cy - 60, 20, cx, cy, 190);
  seal.addColorStop(0, "#FFF0C2");
  seal.addColorStop(0.45, "#FFC777");
  seal.addColorStop(1, "#C9822A");
  ctx.fillStyle = seal;
  ctx.beginPath();
  ctx.arc(cx, cy, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,199,119,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 205, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#1A0802";
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 72, cy + 4);
  ctx.lineTo(cx - 18, cy + 58);
  ctx.lineTo(cx + 82, cy - 52);
  ctx.stroke();

  // الكيكر
  ctx.fillStyle = "#FFC777";
  ctx.font = "800 44px Tajawal, sans-serif";
  ctx.fillText(tr("إنجاز جديد"), W / 2, 930);

  // العنوان (سطرين بالكثير)
  ctx.fillStyle = "#F2EBE3";
  ctx.font = "800 96px Tajawal, sans-serif";
  const lines = wrap(ctx, title, W - 180).slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 1060 + i * 120));
  const afterTitle = 1060 + (lines.length - 1) * 120;

  ctx.fillStyle = "#E9D3B8";
  ctx.font = "500 50px Tajawal, sans-serif";
  ctx.fillText(sub, W / 2, afterTitle + 100);

  // رحلة البحث من 10
  if (step !== null) {
    const segW = 70;
    const gap = 14;
    const total = 10 * segW + 9 * gap;
    const y = afterTitle + 250;
    for (let i = 0; i < 10; i++) {
      // RTL: أول خطوة على اليمين
      const x = W / 2 + total / 2 - (i + 1) * segW - i * gap;
      ctx.fillStyle = i < step ? "#FFC777" : "rgba(255,255,255,0.10)";
      ctx.beginPath();
      ctx.roundRect(x, y, segW, 10, 5);
      ctx.fill();
    }
    ctx.fillStyle = "#ABA095";
    ctx.font = "500 40px Tajawal, sans-serif";
    ctx.fillText(tr("رحلة بحثنا: {0} من {1}", step, 10), W / 2, y + 80);
  }

  ctx.fillStyle = "#FFC777";
  ctx.font = "700 42px Tajawal, sans-serif";
  ctx.fillText(tr(CATCHPHRASE), W / 2, H - 190);
  ctx.fillStyle = "#FF9A3C";
  ctx.font = "700 40px Tajawal, sans-serif";
  ctx.direction = "ltr";
  ctx.fillText("wesyncapp.com", W / 2, H - 120);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** يشارك الصورة (قائمة المشاركة بالجوال: ستوري، واتساب…) وإلا ينزّلها */
export async function shareOrDownload(blob: Blob, name = "wesync-achievement.png"): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: "image/png", lastModified: Date.now() });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: `${CATCHPHRASE} wesyncapp.com` });
      return "shared";
    }
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return "cancelled";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "downloaded";
}
