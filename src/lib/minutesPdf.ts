import { isSupabaseConfigured, supabase } from "./supabaseClient";

/* المحضر الرسمي (MinPDF): A4 على ورق كريمي #F7F0E4→#EFE4D2 ولون #934106. مكان شعار الجامعة فاضي لين الفريق يرفع شعاره
   (ما نخترع شعار). نفس الـHTML يتحول PDF بالسيرفر (Chromium) — وإذا السيرفر ما رد، المتصفح يطبعه. */

export interface PdfData {
  number: string;
  title: string;
  dateLabel: string;
  timeRange: string;
  projectTitle: string;
  supervisorName: string;
  attendees: string[];
  came: number;
  total: number;
  room: string;
  discussion: string[];
  decisions: string[];
  actions: { text: string; owner: string; due: string }[];
  open: string[];
  writer: string;
  approvedOn: string | null;
  logoDataUrl: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const AR = "٠١٢٣٤٥٦٧٨٩";
export const arNum = (n: number | string) => String(n).replace(/\d/g, (d) => AR[Number(d)]);

export function minutesPdfHtml(d: PdfData, opts: { pageFooter?: boolean } = {}): string {
  const h3 = (t: string) => `<h3>${esc(t)}</h3>`;
  const list = d.discussion.length ? `<ul class="disc">${d.discussion.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">—</p>`;
  const decs = d.decisions.length ? d.decisions.map((x, i) => `<div class="dec"><b dir="ltr">${i + 1}</b><span>${esc(x)}</span></div>`).join("") : `<p class="muted">—</p>`;
  const acts = d.actions.length
    ? `<table><thead><tr><th>البند</th><th>المسؤول</th><th>الموعد</th></tr></thead><tbody>${d.actions.map((a) => `<tr><td>${esc(a.text)}</td><td>${esc(a.owner)}</td><td>${esc(a.due)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="muted">—</p>`;
  const open = d.open.length ? `${h3("رابعًا: مفتوح للاجتماع الجاي")}<ul class="disc">${d.open.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(`محضر ${d.title} · ${d.dateLabel}`)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #EFE4D2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; color: #2A1A10; }
.page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 56px 64px 90px; position: relative; background: linear-gradient(180deg, #F7F0E4, #EFE4D2); display: flex; flex-direction: column; }
.head { display: flex; align-items: center; gap: 16px; padding-bottom: 18px; border-bottom: 2px solid #934106; }
.logo { width: 64px; height: 64px; flex: none; border-radius: 12px; border: 1.5px dashed #B9A68F; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #5E4A3A; text-align: center; line-height: 1.3; overflow: hidden; }
.logo img { width: 100%; height: 100%; object-fit: contain; }
.logo.has { border: 0; }
.ttl { flex: 1; line-height: 1.5; }
.ttl small { display: block; font-size: 13px; color: #5E4A3A; }
.ttl b { font-size: 26px; font-weight: 800; }
.meta-r { font-size: 12px; color: #5E4A3A; line-height: 1.7; text-align: left; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin: 18px 0; font-size: 13px; }
.grid span { color: #5E4A3A; }
h3 { margin: 18px 0 6px; font-size: 16px; color: #934106; break-after: avoid; }
.disc { margin: 0; padding: 0 18px 0 0; font-size: 13px; line-height: 1.9; }
.dec { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #E3D6C4; font-size: 13px; line-height: 1.7; break-inside: avoid; }
.dec b { color: #934106; font-size: 16px; width: 18px; flex: none; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: start; padding: 6px; border-bottom: 1.5px solid #2A1A10; color: #5E4A3A; font-weight: 700; }
td { padding: 8px 6px; border-bottom: 1px solid #E3D6C4; }
tr { break-inside: avoid; }
.muted { margin: 0; font-size: 13px; color: #5E4A3A; }
.sign { margin-top: auto; padding-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 13px; break-inside: avoid; }
.sign span { color: #5E4A3A; }
.sign b { display: block; font-weight: 800; margin-top: 4px; }
.sign i { display: block; border-bottom: 1px solid #2A1A10; height: 34px; }
.stamp { position: absolute; top: -26px; left: 0; width: 86px; height: 86px; border-radius: 50%; border: 2px solid #934106; color: #934106; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 12px; font-weight: 800; line-height: 1.3; transform: rotate(-12deg); opacity: .85; }
.foot { position: absolute; left: 0; right: 0; bottom: 22px; text-align: center; font-size: 12px; color: #5E4A3A; }
@media print { .page { margin: 0; } }
</style></head><body><div class="page">
<div class="head">
<div class="logo${d.logoDataUrl ? " has" : ""}">${d.logoDataUrl ? `<img src="${d.logoDataUrl}" alt="شعار الجامعة">` : "شعار<br>الجامعة"}</div>
<div class="ttl"><small>مشروع بحث التخرج</small><b>${esc(d.title)}</b></div>
<div class="meta-r">رقم المحضر: ${esc(d.number)}<br>${esc(d.dateLabel)}${d.timeRange ? `<br><span dir="ltr">${esc(d.timeRange)}</span>` : ""}</div>
</div>
<div class="grid">
<div><span>عنوان البحث:</span> ${esc(d.projectTitle || "—")}</div>
<div><span>المشرف/ة:</span> ${esc(d.supervisorName || "—")}</div>
<div><span>الحضور:</span> ${esc(d.attendees.join("، ") || "—")} (${arNum(d.came)} من ${arNum(d.total)})</div>
<div><span>المكان:</span> ${esc(d.room || "—")}</div>
</div>
${h3("أولًا: ملخص النقاش")}${list}
${h3("ثانيًا: القرارات")}${decs}
${h3("ثالثًا: بنود العمل")}${acts}
${open}
<div class="sign">
<div><span>كاتب المحضر</span><b>${esc(d.writer || "—")}</b><i></i></div>
<div style="position:relative"><span>اعتماد المشرف/ة</span><b>${esc(d.supervisorName || "—")}</b><i></i>${d.approvedOn ? `<div class="stamp">معتمد<br><span dir="ltr">${esc(d.approvedOn)}</span></div>` : ""}</div>
</div>
${opts.pageFooter === false ? "" : `<div class="foot">صادر من Wesync</div>`}
</div></body></html>`;
}

function saveBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** PDF رسمي من السيرفر (Chromium) — وإذا ما رد، نفتح نافذة طباعة بنفس الشكل */
export async function downloadMinutesPdf(d: PdfData, fileName: string): Promise<"server" | "print" | "failed"> {
  try {
    const token = isSupabaseConfigured ? (await supabase!.auth.getSession()).data.session?.access_token : null;
    if (token) {
      const r = await fetch("/api/minutes-pdf", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ html: minutesPdfHtml(d, { pageFooter: false }), name: fileName }) });
      if (r.ok && (r.headers.get("content-type") ?? "").includes("pdf")) {
        saveBlob(await r.blob(), fileName);
        return "server";
      }
    }
  } catch {
    /* نطبع بالمتصفح */
  }
  const w = window.open("", "_blank");
  if (!w) return "failed";
  w.document.open();
  w.document.write(minutesPdfHtml(d));
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 400);
  return "print";
}

// ── شعار الجامعة (يرفعه الفريق — ما نخترع شعار) ──
export async function uploadLogo(teamId: string, file: File): Promise<string | null> {
  if (!isSupabaseConfigured || file.size > 2 * 1024 * 1024 || !/^image\//.test(file.type)) return null;
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
  const path = `${teamId}/brand/logo-${Date.now().toString(36)}.${ext}`;
  const { error } = await supabase!.storage.from("drops").upload(path, file, { contentType: file.type, upsert: false });
  return error ? null : path;
}
export async function logoDataUrl(teamId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase!.storage.from("drops").list(`${teamId}/brand`, { limit: 20, sortBy: { column: "created_at", order: "desc" } });
  const f = (data ?? []).find((x) => x.name.startsWith("logo-"));
  if (!f) return null;
  const { data: blob } = await supabase!.storage.from("drops").download(`${teamId}/brand/${f.name}`);
  if (!blob) return null;
  return await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => res(null);
    r.readAsDataURL(blob);
  });
}
