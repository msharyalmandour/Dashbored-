import { tr } from "./i18n";
import { CATCHPHRASE } from "./sound";
import { drawBrandLockup } from "./brandCanvas";
import type { DoorId } from "./doors";
import "../vendor/wesy-real.js";

/* بطاقة الإنجاز للستوري (1080×1920) — فكرة Spotify Wrapped: الطالب يتباهى بإنجازه هو، والاسم يوصل معه.
   بدون عنوان البحث ولا أسماء الفريق (بحثهم ما انشر، وخصوصيتهم أول) — بس الإنجاز ورحلتهم من 10. */

export const DOOR_SHARE: Partial<Record<DoorId, { title: string; sub: string }>> = {
  write: { title: tr("أول دراسة بمكتبة بحثنا"), sub: tr("وانفتح لنا المقترح") },
  methodology: { title: tr("كتبنا أول قسم من المقترح"), sub: tr("والمنهجية صارت قدّامنا") },
  supervisor: { title: tr("شغلنا صار جاهز للمشرف/ة"), sub: tr("خطوة خطوة، بوقتنا") },
  calendar: { title: tr("أول موعد مع الدكتورة"), sub: tr("كل مواعيدنا وملفاتنا بمكان واحد") },
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

/** رابط البطاقة بكود الفريق (حلقة النمو): wesyncapp.com/?r=CODE */
export const shareLink = (code?: string | null) => (code ? `wesyncapp.com/?r=${code}` : "wesyncapp.com");

/** راس ويسي (SVG من WesyReal) كصورة للكانفس — رسمي بدون غمزة، بشماغ الهوية */
async function wesyHead(px: number): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined" || !window.WesyReal) return null;
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-9999px;top:0;width:${px}px;height:${px}px;`;
  document.body.appendChild(host);
  try {
    const w = new window.WesyReal(host, { shemagh: "#FF6A00", confetti: false, state: "success", crop: "head", formal: true, shadow: false });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svg = host.querySelector("svg");
    if (!svg) return null;
    if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", String(px));
    svg.setAttribute("height", String(px));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    w.destroy();
    const img = new Image();
    await new Promise<void>((ok, bad) => {
      img.onload = () => ok();
      img.onerror = () => bad(new Error("wesy"));
      img.src = url;
    });
    return img;
  } catch {
    return null;
  } finally {
    host.remove();
  }
}

export async function drawAchievement({ title, sub, step, refCode, founder }: { title: string; sub: string; step: number | null; refCode?: string | null; founder?: number | null }): Promise<Blob | null> {
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

  // شارة المؤسسين (رقم حقيقي من القاعدة بس)
  if (founder) {
    ctx.font = "800 34px Tajawal, sans-serif";
    const t = tr("فريق مؤسس #{0}", founder);
    const tw = ctx.measureText(t).width + 56;
    ctx.fillStyle = "rgba(255,199,119,0.12)";
    ctx.strokeStyle = "rgba(255,199,119,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(W / 2 - tw / 2, 246, tw, 62, 31);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#FFC777";
    ctx.fillText(t, W / 2, 289);
  }

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
  ctx.fillStyle = "#f4f0ec";
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
    ctx.fillStyle = "#b8ada2";
    ctx.font = "500 40px Tajawal, sans-serif";
    ctx.fillText(tr("الخطوة {0} من {1}", step, 10), W / 2, y + 80);
  }

  // «معتمد من ويسي · الرئيس التنفيذي» مع راسه بمربع كريمي
  const head = await wesyHead(120);
  const by = H - 330;
  ctx.font = "700 40px Tajawal, sans-serif";
  const label = tr("معتمد من ويسي · الرئيس التنفيذي");
  const lw = ctx.measureText(label).width;
  const total = 120 + 24 + lw;
  const right = W / 2 + total / 2;
  ctx.fillStyle = "#F3E9DC";
  ctx.beginPath();
  ctx.roundRect(right - 120, by - 60, 120, 120, 34);
  ctx.fill();
  ctx.strokeStyle = "#FFC777";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (head) ctx.drawImage(head, right - 120, by - 60, 120, 120);
  ctx.fillStyle = "#f4f0ec";
  ctx.textAlign = "right";
  ctx.fillText(label, right - 144, by + 14);
  ctx.textAlign = "center";

  ctx.fillStyle = "#FFC777";
  ctx.font = "700 42px Tajawal, sans-serif";
  ctx.fillText(tr(CATCHPHRASE), W / 2, H - 190);
  ctx.fillStyle = "#FF9A3C";
  ctx.font = "700 40px Tajawal, sans-serif";
  ctx.direction = "ltr";
  ctx.fillText(shareLink(refCode), W / 2, H - 120);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** يشارك الصورة (قائمة المشاركة بالجوال: ستوري، واتساب…) وإلا ينزّلها */
export async function shareOrDownload(blob: Blob, name = "wesync-achievement.png", refCode?: string | null): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: "image/png", lastModified: Date.now() });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: `${CATCHPHRASE} https://${shareLink(refCode)}` });
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
