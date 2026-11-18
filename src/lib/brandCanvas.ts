import { W_LEFT, W_RIGHT } from "../components/brand/WLogo";

/** شعار W على كانفس (بطاقات الستوري والمشاركة): مربع كريمي + الموجة بالحبر */
export function drawWMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const k = size / 200;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = "#F2EBE3";
  ctx.beginPath();
  ctx.roundRect(0, 0, 200, 200, 46);
  ctx.fill();
  ctx.strokeStyle = "#160904";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.stroke(new Path2D(`${W_LEFT} ${W_RIGHT.replace(/^M100 90 /, "")}`));
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
