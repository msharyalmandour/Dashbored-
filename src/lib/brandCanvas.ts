import { WAVE, W_CREAM, W_INK } from "../components/brand/WLogo";

/** شعار W على كانفس (بطاقات الستوري والمشاركة) = brand/logo/app-icon-wave-cream.svg */
export function drawWMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const k = size / 200;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = W_CREAM;
  ctx.beginPath();
  ctx.roundRect(0, 0, 200, 200, 46);
  ctx.fill();
  // نفس app-icon-wave-cream.svg: الموجة ×0.8 داخل المربع
  ctx.translate(20, 20);
  ctx.scale(0.8, 0.8);
  ctx.strokeStyle = W_INK;
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(WAVE));
  ctx.restore();
}

/** الشعار + «Wesync» متوسّطين أفقيًا عند cx (خط Tajawal 800) */
export function drawBrandLockup(ctx: CanvasRenderingContext2D, cx: number, y: number, size = 56, color = "rgba(242,235,227,0.92)") {
  ctx.save();
  ctx.font = `800 ${Math.round(size * 0.72)}px Tajawal, sans-serif`;
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const gap = size * 0.28;
  const tw = ctx.measureText("Wesync").width;
  const x0 = cx - (size + gap + tw) / 2;
  drawWMark(ctx, x0, y - size / 2, size);
  ctx.fillStyle = color;
  ctx.fillText("Wesync", x0 + size + gap, y + size * 0.04);
  ctx.restore();
}
