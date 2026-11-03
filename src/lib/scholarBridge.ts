/** جسر قوقل سكولار: ما فيه API رسمي، فنفتح البحث لهم جاهز (رابط عادي بحساب الطالب)، ونسجّل وش بحثوا، ونحوّل DOI/عناوين يلصقونها لدراسات كاملة عبر Crossref. */

export const SEARCH_DATABASES = ["Google Scholar", "PubMed", "CINAHL", "Scopus", "Web of Science"] as const;
export type SearchDatabase = (typeof SEARCH_DATABASES)[number];

export function scholarUrl(query: string, fromYear?: number): string {
  const q = query.trim();
  const p = new URLSearchParams({ hl: "en", as_sdt: "0,5", q });
  if (fromYear) p.set("as_ylo", String(fromYear));
  return `https://scholar.google.com/scholar?${p.toString()}`;
}

/** DOI بصيغة 10.xxxx/… من نص ملصوق (رابط doi.org أو DOI مجرد) — بدون تكرار */
export function extractDois(text: string): string[] {
  const found = text.match(/10\.\d{4,9}\/[^\s"<>,;]+/gi) ?? [];
  const clean = found.map((d) => d.replace(/[.)\]]+$/, "").toLowerCase());
  return [...new Set(clean)];
}

/** أسطر نصية تبدو عناوين دراسات (بدون DOI) — سطر ≥ ٣٠ حرف */
export function extractTitleLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .filter((l) => !/10\.\d{4,9}\//.test(l))
    .map((l) => l.replace(/^[\s\-•*]*\d{0,2}[.)]?\s+/, "").trim())
    .filter((l) => l.length >= 30);
}

export interface ResolvedPaper {
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi: string;
  link: string;
}

interface CrossrefWork {
  title?: string[];
  author?: { given?: string; family?: string }[];
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  DOI?: string;
}

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** «Family G» لكل مؤلف (أول ٦ ثم et al.) */
export function crossrefToPaper(w: CrossrefWork): ResolvedPaper | null {
  const title = strip(w.title?.[0] ?? "");
  if (!title) return null;
  const names = (w.author ?? []).map((a) => `${a.family ?? ""}${a.given ? " " + a.given.split(/\s+/).map((g) => g[0]).join("") : ""}`.trim()).filter(Boolean);
  const authors = names.length > 6 ? `${names.slice(0, 6).join(", ")}, et al.` : names.join(", ");
  const doi = (w.DOI ?? "").toLowerCase();
  return {
    title,
    authors,
    year: w.issued?.["date-parts"]?.[0]?.[0] ?? new Date().getFullYear(),
    journal: strip(w["container-title"]?.[0] ?? ""),
    doi,
    link: doi ? `https://doi.org/${doi}` : "",
  };
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export async function resolveDoi(doi: string): Promise<ResolvedPaper | null> {
  const j = (await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)) as { message?: CrossrefWork } | null;
  return j?.message ? crossrefToPaper(j.message) : null;
}

/** عنوان نصي ← أقرب نتيجة Crossref (نقبلها لو العنوان يتشابه فعلاً، عشان ما نضيف دراسة غلط) */
export async function resolveTitle(title: string): Promise<ResolvedPaper | null> {
  const j = (await getJson(`https://api.crossref.org/works?rows=1&query.bibliographic=${encodeURIComponent(title)}`)) as { message?: { items?: CrossrefWork[] } } | null;
  const item = j?.message?.items?.[0];
  const paper = item ? crossrefToPaper(item) : null;
  if (!paper) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ ]+/g, " ").replace(/\s+/g, " ").trim();
  const a = new Set(norm(title).split(" "));
  const b = norm(paper.title).split(" ");
  const overlap = b.filter((w) => a.has(w)).length / Math.max(b.length, 1);
  return overlap >= 0.6 ? paper : null;
}

export interface SearchLogEntry {
  database: string;
  query: string;
  results: number | null;
  selected: number | null;
  by: string;
  at: string;
}

/** ملخص نصي مختصر للوكيل: كل قاعدة وكم بحث وكم دراسة انختارت */
export function searchLogSummary(log: SearchLogEntry[]): { database: string; searches: number; selected: number }[] {
  const by = new Map<string, { searches: number; selected: number }>();
  for (const e of log) {
    const cur = by.get(e.database) ?? { searches: 0, selected: 0 };
    cur.searches++;
    cur.selected += e.selected ?? 0;
    by.set(e.database, cur);
  }
  return [...by].map(([database, v]) => ({ database, ...v }));
}
