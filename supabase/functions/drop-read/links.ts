// قراءة الروابط (نفس drop-sort): PubMed (E-utilities) / DOI (Crossref) / PDF / صفحة بعنوانها ووصفها. حماية من العناوين الداخلية.
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`);

// ───────── قراءة الروابط: الوكيل يفتح الرابط بنفسه (PubMed / DOI / صفحة / PDF) ويلخصه ─────────
export const URL_RE = /https?:\/\/[^\s<>"'«»]+/gi;
const DOI_RE = /\b(10\.\d{4,9}\/[^\s"'<>«»]+)/i;
const UA = { "User-Agent": "Wesync/1.0 (research assistant for nursing students)", Accept: "text/html,application/xhtml+xml,application/pdf,application/json;q=0.9,*/*;q=0.5" };
const MAX_PAGE_BYTES = 4_500_000;

/** ما نفتح عناوين داخلية (حماية من SSRF) */
export function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.replace(/[).,،؛]+$/, ""));
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.includes(":") || /^\d+$/.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}

const decodeEntities = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const metaAll = (html: string, name: string) =>
  [...html.matchAll(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "gi"))].map((m) => decodeEntities(m[1] ?? m[2] ?? "").trim()).filter(Boolean);
const htmlText = (html: string) =>
  decodeEntities(
    html
      .replace(/<(head|script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

async function getUrl(u: URL): Promise<Response | null> {
  try {
    const res = await fetch(u.toString(), { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_PAGE_BYTES) return null;
    return res;
  } catch {
    return null;
  }
}

async function toB64(res: Response): Promise<string | null> {
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_PAGE_BYTES || buf.byteLength < 500) return null;
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export interface Fetched {
  url: string;
  text?: string;
  pdf?: string;
  failed?: boolean;
}

/** يجيب محتوى الرابط: PubMed (الملخص الرسمي)، DOI (Crossref)، PDF مباشر، أو صفحة (مع ملف الـ PDF لو الصفحة تعطيه) */
export async function fetchLink(raw: string): Promise<Fetched> {
  const u = safeUrl(raw);
  if (!u) return { url: raw, failed: true };
  const url = u.toString();
  const pmid = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{4,9})/.exec(url)?.[1] ?? /ncbi\.nlm\.nih\.gov\/pubmed\/(\d{4,9})/.exec(url)?.[1];
  if (pmid) {
    const r = await getUrl(new URL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`));
    const t = r ? (await r.text()).trim() : "";
    if (t.length > 80) return { url, text: `PUBMED RECORD (PMID ${pmid}):\n${clip(t, 20000)}` };
  }
  const doi = DOI_RE.exec(decodeURIComponent(url))?.[1]?.replace(/[).,]+$/, "");
  let crossref = "";
  if (doi) {
    const r = await getUrl(new URL(`https://api.crossref.org/works/${encodeURIComponent(doi)}`));
    if (r) {
      try {
        // deno-lint-ignore no-explicit-any
        const m = ((await r.json()) as any)?.message;
        if (m) {
          const authors = (m.author ?? []).slice(0, 8).map((a: { family?: string; given?: string }) => `${a.family ?? ""} ${(a.given ?? "").slice(0, 1)}`.trim()).join(", ");
          const year = m.issued?.["date-parts"]?.[0]?.[0] ?? "";
          const abs = String(m.abstract ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          crossref = `CROSSREF RECORD (DOI ${doi}):\nTitle: ${(m.title ?? [])[0] ?? ""}\nAuthors: ${authors}\nYear: ${year}\nJournal: ${(m["container-title"] ?? [])[0] ?? ""}\nAbstract: ${abs || "(not provided by Crossref)"}`;
        }
      } catch {
        // نكمل بالصفحة
      }
    }
  }
  const res = await getUrl(u);
  if (!res) return crossref ? { url, text: crossref } : { url, failed: true };
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  if (type.includes("application/pdf")) {
    const pdf = await toB64(res);
    return pdf ? { url, pdf, text: crossref || undefined } : crossref ? { url, text: crossref } : { url, failed: true };
  }
  if (!type.includes("html") && !type.includes("text")) return crossref ? { url, text: crossref } : { url, failed: true };
  const html = (await res.text()).slice(0, 2_000_000);
  // صفحات المجلات تعطي بيانات الورقة بوسوم citation_* ورابط الـ PDF أحيانًا
  const cit = ["citation_title", "citation_author", "citation_publication_date", "citation_journal_title", "citation_doi", "citation_abstract", "dc.description", "description", "og:description"]
    .map((k) => {
      const v = metaAll(html, k);
      return v.length ? `${k}: ${k === "citation_author" ? v.slice(0, 8).join("; ") : v[0]}` : "";
    })
    .filter(Boolean)
    .join("\n");
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();
  const pdfUrl = metaAll(html, "citation_pdf_url")[0];
  if (pdfUrl) {
    const pu = safeUrl(new URL(pdfUrl, url).toString());
    const pr = pu ? await getUrl(pu) : null;
    if (pr && (pr.headers.get("content-type") ?? "").toLowerCase().includes("pdf")) {
      const pdf = await toB64(pr);
      if (pdf) return { url, pdf, text: [crossref, cit].filter(Boolean).join("\n") || undefined };
    }
  }
  const body = clip(htmlText(html), 22000);
  return { url, text: [crossref, `PAGE TITLE: ${title}`, cit, `PAGE TEXT:\n${body}`].filter(Boolean).join("\n") };
}
