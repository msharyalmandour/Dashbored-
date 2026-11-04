/** يحوّل صور صفحات دراسة (تصوير جوال، لقطة شاشة) لملف PDF وحده، صفحة لكل صورة — بالمتصفح وبدون مكتبات.
    كل صورة تتصغّر وتنضغط JPEG، وقارئ الدراسات يقرأ الـ PDF الناتج زي أي ورقة (Claude يشوف الصفحات كصور). */

const MAX_SIDE = 1800;

async function toJpeg(file: File, quality: number): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("encode");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
}

/** يبني PDF بسيط: لكل صورة صفحة بحجمها (بالنقاط) وفيها الصورة كاملة */
export function buildPdf(pages: { bytes: Uint8Array; width: number; height: number }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (c: Uint8Array | string) => {
    const b = typeof c === "string" ? enc.encode(c) : c;
    chunks.push(b);
    length += b.length;
  };
  const obj = (n: number, body: (Uint8Array | string)[]) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  // 1 catalog · 2 pages · ثم لكل صفحة: page + image + content
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`]);
  pages.forEach((p, i) => {
    const pageN = 3 + i * 3;
    const w = (p.width * 0.75).toFixed(2);
    const h = (p.height * 0.75).toFixed(2);
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    obj(pageN, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${pageN + 1} 0 R >> >> /Contents ${pageN + 2} 0 R >>`]);
    obj(pageN + 1, [
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`,
      p.bytes,
      "\nendstream",
    ]);
    obj(pageN + 2, [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`]);
  });
  const count = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** صور ← PDF واحد أصغر من maxBytes (ينزل بالجودة لين يدخل الحد) */
export async function imagesToPdf(files: File[], maxBytes: number, name = "study-photos.pdf"): Promise<File> {
  for (const quality of [0.8, 0.65, 0.5, 0.38]) {
    const pages = [];
    for (const f of files) pages.push(await toJpeg(f, quality));
    const pdf = buildPdf(pages);
    if (pdf.length <= maxBytes || quality === 0.38) return new File([pdf.buffer as ArrayBuffer], name, { type: "application/pdf" });
  }
  throw new Error("unreachable");
}
