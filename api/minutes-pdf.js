// Vercel Function — المحضر الرسمي PDF من HTML (Chromium). عضو فريق مسجّل دخول بس (نتأكد من رمزه عند Supabase).
// يستقبل { html, name } ويرجّع PDF مقاس A4 بترقيم «صادر من Wesync · صفحة X من Y». الخطوط والتشكيل العربي يرسمها Chromium نفسه.
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";


const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 3_000_000) throw new Error("too_large");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const jwt = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!jwt || !SUPABASE_URL || !ANON) return res.status(401).json({ error: "unauthorized" });
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${jwt}`, apikey: ANON } });
  if (!who.ok) return res.status(401).json({ error: "unauthorized" });

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(413).json({ error: "too_large" });
  }
  const html = String(body.html || "");
  if (!html.startsWith("<!doctype html>") || html.length > 2_500_000) return res.status(400).json({ error: "bad_html" });
  const name = String(body.name || "minutes.pdf").replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 120) || "minutes.pdf";

  let browser;
  try {
    browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const page = await browser.newPage();
    // ما نسمح إلا بالخطوط من Google (الصور مضمّنة داخل الـHTML)
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const u = r.url();
      if (u.startsWith("data:") || u.startsWith("https://fonts.googleapis.com/") || u.startsWith("https://fonts.gstatic.com/") || u === "about:blank") r.continue();
      else r.abort();
    });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 20000 });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;text-align:center;font-family:Tajawal,Tahoma,sans-serif;font-size:9px;color:#5E4A3A" dir="rtl">صادر من Wesync · صفحة <span class="pageNumber"></span> من <span class="totalPages"></span></div>`,
      margin: { top: "0", bottom: "14mm", left: "0", right: "0" },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(Buffer.from(pdf));
  } catch (e) {
    console.error("minutes-pdf", e instanceof Error ? e.message : e);
    return res.status(500).json({ error: "pdf_failed" });
  } finally {
    await browser?.close().catch(() => {});
  }
}
