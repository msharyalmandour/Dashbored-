// مصادر أبحاث حقيقية (PubMed + OpenAlex) — بدون imports عشان تنختبر محليًا.
// كل نتيجة ورابطها تجي من الـ API نفسه، وClaude ما يكتب أي رابط أو DOI:
// يرجّع أرقام (فهارس) المرشّحين اللي اختارهم بس، ونحن نربطها بالبيانات الأصلية.

export type SourceName = "pubmed" | "openalex";

export interface Candidate {
  source: SourceName;
  title: string;
  authors: string;
  year: number | null;
  journal: string;
  doi: string | null;
  pmid: string | null;
  url: string;
  abstract: string;
  pubTypes: string[];
  isJournal: boolean;
  citedBy: number | null;
}

type FetchFn = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

function joinAuthors(names: string[]): string {
  const clean = names.filter(Boolean);
  if (clean.length === 0) return "";
  return clean.length > 6 ? `${clean.slice(0, 6).join(", ")}, et al.` : clean.join(", ");
}

function urlFor(doi: string | null, pmid: string | null, fallback: string): string {
  if (doi) return `https://doi.org/${doi}`;
  if (pmid) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  return fallback;
}

/** OpenAlex يعطي الملخص كفهرس معكوس {كلمة: [مواضع]} — نعيد بناءه نص عادي */
export function reconstructAbstract(inv: Record<string, number[]> | null | undefined): string {
  if (!inv) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const p of positions) words[p] = word;
  }
  return words.filter((w) => w !== undefined).join(" ");
}

export function parsePubmedXml(xml: string): Candidate[] {
  const out: Candidate[] = [];
  const articles = xml.split("<PubmedArticle>").slice(1);
  for (const art of articles) {
    const pmid = art.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] ?? null;
    const title = stripTags(art.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/)?.[1] ?? "");
    if (!title) continue;

    const abstractParts = [...art.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((m) => {
      const label = m[1].match(/Label="([^"]+)"/)?.[1];
      const text = stripTags(m[2]);
      return label ? `${label}: ${text}` : text;
    });

    const year =
      art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/)?.[1] ??
      art.match(/<PubDate>[\s\S]*?<MedlineDate>[^<]*?(\d{4})/)?.[1] ??
      null;
    const journal = stripTags(art.match(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/)?.[1] ?? "");
    const authors = [...art.matchAll(/<Author\b[^>]*>([\s\S]*?)<\/Author>/g)]
      .map((m) => {
        const last = m[1].match(/<LastName>([\s\S]*?)<\/LastName>/)?.[1];
        const ini = m[1].match(/<Initials>([\s\S]*?)<\/Initials>/)?.[1];
        return last ? stripTags(`${last}${ini ? " " + ini : ""}`) : "";
      })
      .filter(Boolean);
    const doi = art.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1]?.trim() ?? null;
    const pubTypes = [...art.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)].map((m) => stripTags(m[1]));

    out.push({
      source: "pubmed",
      title,
      authors: joinAuthors(authors),
      year: year ? Number(year) : null,
      journal,
      doi,
      pmid,
      url: urlFor(doi, pmid, ""),
      abstract: abstractParts.join("\n"),
      pubTypes,
      isJournal: true,
      citedBy: null,
    });
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseOpenAlex(json: any): Candidate[] {
  const results = Array.isArray(json?.results) ? json.results : [];
  const out: Candidate[] = [];
  for (const w of results) {
    const title = stripTags(String(w?.title ?? ""));
    if (!title) continue;
    const doi = typeof w.doi === "string" ? w.doi.replace(/^https?:\/\/doi\.org\//i, "") : null;
    const names: string[] = Array.isArray(w.authorships)
      ? w.authorships.map((a: { author?: { display_name?: string } }) => a?.author?.display_name ?? "")
      : [];
    const src = w?.primary_location?.source;
    out.push({
      source: "openalex",
      title,
      authors: joinAuthors(names),
      year: typeof w.publication_year === "number" ? w.publication_year : null,
      journal: String(src?.display_name ?? ""),
      doi,
      pmid: null,
      url: urlFor(doi, null, String(w.id ?? "")),
      abstract: reconstructAbstract(w.abstract_inverted_index),
      pubTypes: w.type ? [String(w.type)] : [],
      isJournal: src?.type === "journal",
      citedBy: typeof w.cited_by_count === "number" ? w.cited_by_count : null,
    });
  }
  return out;
}

const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();

/** يدمج القوائم بالتناوب (واحد من كل مصدر) ويشيل التكرار — لو نفس الدراسة
    بالمصدرين ناخذ الأغنى بيانات (ملخص أطول، DOI، PMID) */
export function mergeCandidates(lists: Candidate[][], limit: number): Candidate[] {
  const byKey = new Map<string, Candidate>();
  const order: string[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      const c = list[i];
      if (!c) continue;
      const doiKey = c.doi ? `doi:${c.doi.toLowerCase()}` : null;
      const titleKey = `t:${normTitle(c.title)}`;
      const existingKey = (doiKey && byKey.has(doiKey) ? doiKey : null) ?? (byKey.has(titleKey) ? titleKey : null);
      if (existingKey) {
        const prev = byKey.get(existingKey)!;
        const merged: Candidate = {
          ...prev,
          abstract: c.abstract.length > prev.abstract.length ? c.abstract : prev.abstract,
          doi: prev.doi ?? c.doi,
          pmid: prev.pmid ?? c.pmid,
          pubTypes: prev.pubTypes.length ? prev.pubTypes : c.pubTypes,
          citedBy: prev.citedBy ?? c.citedBy,
          isJournal: prev.isJournal || c.isJournal,
        };
        merged.url = urlFor(merged.doi, merged.pmid, merged.url);
        byKey.set(existingKey, merged);
        continue;
      }
      const key = doiKey ?? titleKey;
      byKey.set(key, c);
      order.push(key);
      if (doiKey) byKey.set(titleKey, c);
    }
  }
  const seen = new Set<Candidate>();
  const result: Candidate[] = [];
  for (const key of order) {
    const c = byKey.get(key)!;
    if (seen.has(c)) continue;
    seen.add(c);
    result.push(c);
  }
  // اللي عنده ملخص مفيد نقدمه — بدون ملخص ما نقدر نلخّص بأمانة
  const withAbstract = result.filter((c) => c.abstract.length >= 150);
  const without = result.filter((c) => c.abstract.length < 150);
  return [...withAbstract, ...without].slice(0, limit);
}

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export async function searchPubmed(
  query: string,
  retmax: number,
  fetchFn: FetchFn,
  contact?: string,
): Promise<Candidate[]> {
  const extra = `&tool=wesync${contact ? `&email=${encodeURIComponent(contact)}` : ""}`;
  const s = await fetchFn(
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${retmax}&term=${encodeURIComponent(query)}${extra}`,
  );
  if (!s.ok) throw new Error(`pubmed esearch ${s.status}`);
  const ids: string[] = JSON.parse(await s.text())?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];
  const f = await fetchFn(`${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}${extra}`);
  if (!f.ok) throw new Error(`pubmed efetch ${f.status}`);
  return parsePubmedXml(await f.text());
}

export async function searchOpenAlex(
  query: string,
  perPage: number,
  fetchFn: FetchFn,
  contact?: string,
): Promise<Candidate[]> {
  const select = "id,doi,title,publication_year,authorships,primary_location,abstract_inverted_index,cited_by_count,type";
  // فلتر title_and_abstract بدل search العام (اللي يبحث بالنص الكامل ويطلّع نتائج بعيدة).
  // الفاصلة والنقطتين تكسر صيغة الفلاتر، فننظّف الاستعلام ونقصّه لأهم ٦ كلمات
  const clean = query.replace(/[,:|"()]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 6).join(" ");
  if (!clean) return [];
  const url =
    `https://api.openalex.org/works?per-page=${perPage}&sort=relevance_score:desc` +
    `&filter=from_publication_date:2010-01-01,type:article,title_and_abstract.search:${encodeURIComponent(clean)}` +
    `&select=${select}` +
    (contact ? `&mailto=${encodeURIComponent(contact)}` : "");
  const r = await fetchFn(url);
  if (!r.ok) throw new Error(`openalex ${r.status}`);
  return parseOpenAlex(JSON.parse(await r.text()));
}

/** يلقط أول JSON صالح من رد النموذج (بين ```json أو أول { لآخر }) */
export function extractJson(text: string): unknown | null {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g)].map((m) => m[1]);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const candidates = [...fenced.reverse(), first >= 0 && last > first ? text.slice(first, last + 1) : ""];
  for (const raw of candidates) {
    if (!raw) continue;
    for (const s of [raw, raw.replace(/,(\s*[}\]])/g, "$1")]) {
      try {
        return JSON.parse(s);
      } catch {
        // نجرب المحاولة الجاية
      }
    }
  }
  return null;
}

/** يقص الملخص بأمان عشان ما نضخّم الطلب لـ Claude */
export function clip(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`;
}
