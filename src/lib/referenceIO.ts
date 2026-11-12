import type { EvidencePaper } from "../data/types";

/** استيراد/تصدير المراجع (BibTeX وRIS — صيغ Zotero/Mendeley/EndNote) + فحص تطابق الاستشهادات بالنص مع قائمة المراجع.
    كله بقواعد ثابتة بدون ذكاء. */

export interface RefEntry {
  title: string;
  authors: string;
  year: number | null;
  journal: string;
  doi: string;
  url: string;
}

const clean = (s: string) => s.replace(/[{}]/g, "").replace(/\\&/g, "&").replace(/\s+/g, " ").trim();

/** «Devon, Heather A. and Zerwic, J» أو «Heather A Devon and J Zerwic» ← «Devon HA, Zerwic J» */
export function normalizeAuthors(raw: string, sep: "and" | "lines" = "and"): string {
  const parts = (sep === "and" ? raw.split(/\s+and\s+/i) : raw.split(/\r?\n/)).map((a) => clean(a)).filter(Boolean);
  const out = parts.map((a) => {
    let family: string;
    let given: string;
    if (a.includes(",")) {
      const [f, g] = a.split(",", 2);
      family = f.trim();
      given = (g ?? "").trim();
    } else {
      const w = a.split(/\s+/);
      // صيغتنا «Devon HA»: آخر كلمة حروف كبيرة قصيرة = الأحرف الأولى
      if (w.length >= 2 && /^[A-Z]{1,3}$/.test(w[w.length - 1])) {
        given = w.pop() ?? "";
        family = w.join(" ");
      } else {
        family = w.pop() ?? "";
        given = w.join(" ");
      }
    }
    const initials = /^[A-Z]{1,4}$/.test(given)
      ? given
      : given
          .split(/[\s.\-]+/)
          .filter(Boolean)
          .map((g) => g[0].toUpperCase())
          .join("");
    return initials ? `${family} ${initials}` : family;
  });
  return out.length > 6 ? `${out.slice(0, 6).join(", ")}, et al.` : out.join(", ");
}

const yearOf = (s: string): number | null => {
  const m = s.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
};

/** حقول إدخال BibTeX واحد: يدعم {…} و"…" وأرقام مجردة */
function bibFields(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = body.indexOf(",") + 1; // بعد مفتاح الإدخال
  while (i < body.length) {
    const eq = body.indexOf("=", i);
    if (eq < 0) break;
    const name = body.slice(i, eq).replace(/[\s,]/g, "").toLowerCase();
    let j = eq + 1;
    while (j < body.length && /\s/.test(body[j])) j++;
    let value = "";
    if (body[j] === "{") {
      let depth = 0;
      const start = j + 1;
      for (; j < body.length; j++) {
        if (body[j] === "{") depth++;
        else if (body[j] === "}" && --depth === 0) break;
      }
      value = body.slice(start, j);
      j++;
    } else if (body[j] === '"') {
      const start = ++j;
      while (j < body.length && !(body[j] === '"' && body[j - 1] !== "\\")) j++;
      value = body.slice(start, j);
      j++;
    } else {
      const start = j;
      while (j < body.length && body[j] !== ",") j++;
      value = body.slice(start, j);
    }
    if (name) out[name] = value;
    i = body.indexOf(",", j) + 1;
    if (i === 0) break;
  }
  return out;
}

export function parseBibtex(text: string): RefEntry[] {
  const entries: RefEntry[] = [];
  const re = /@(\w+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (/^(comment|string|preamble)$/i.test(m[1])) continue;
    let depth = 1;
    let k = re.lastIndex;
    for (; k < text.length && depth > 0; k++) {
      if (text[k] === "{") depth++;
      else if (text[k] === "}") depth--;
    }
    const f = bibFields(text.slice(re.lastIndex, k - 1));
    const title = clean(f.title ?? "");
    if (title) entries.push({ title, authors: normalizeAuthors(f.author ?? ""), year: yearOf(f.year ?? f.date ?? ""), journal: clean(f.journal ?? f.booktitle ?? ""), doi: clean(f.doi ?? "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""), url: clean(f.url ?? "") });
    re.lastIndex = k;
  }
  return entries;
}

export function parseRis(text: string): RefEntry[] {
  const entries: RefEntry[] = [];
  let cur: { au: string[]; f: Record<string, string> } | null = null;
  const flush = () => {
    if (cur) {
      const title = clean(cur.f.TI ?? cur.f.T1 ?? "");
      if (title)
        entries.push({
          title,
          authors: normalizeAuthors(cur.au.join("\n"), "lines"),
          year: yearOf(cur.f.PY ?? cur.f.Y1 ?? cur.f.DA ?? ""),
          journal: clean(cur.f.JO ?? cur.f.JF ?? cur.f.T2 ?? ""),
          doi: clean(cur.f.DO ?? "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""),
          url: clean(cur.f.UR ?? ""),
        });
    }
    cur = null;
  };
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9])\s{1,2}-\s?(.*)$/);
    if (!m) continue;
    const [, tag, val] = m;
    if (tag === "TY") {
      flush();
      cur = { au: [], f: {} };
    } else if (tag === "ER") flush();
    else if (cur) {
      if (tag === "AU" || tag === "A1") cur.au.push(val);
      else cur.f[tag] ??= val;
    }
  }
  flush();
  return entries;
}

export function parseReferences(text: string): RefEntry[] {
  return /^\s*TY\s{1,2}-/m.test(text) ? parseRis(text) : parseBibtex(text);
}

const keyOf = (p: Pick<EvidencePaper, "authors" | "year" | "title">) => `${firstSurname(p.authors)}|${p.year}`;

/** أول لقب بنص المؤلفين: «Devon HA, Zerwic J» ← devon */
export function firstSurname(authors: string): string {
  return (authors.split(/,|;| and /i)[0] ?? "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z؀-ۿ'-]/g, "") ?? "";
}

export const sameStudy = (a: RefEntry, b: Pick<EvidencePaper, "title" | "authors" | "year">) =>
  a.title.toLowerCase().replace(/\W+/g, " ").trim() === b.title.toLowerCase().replace(/\W+/g, " ").trim() || (!!a.year && keyOf({ authors: a.authors, year: a.year, title: a.title }) === keyOf(b) && firstSurname(a.authors) !== "");

/** «Devon HA» ← «Devon, HA» (الصيغة اللي تفهمها مديرات المراجع) */
const familyComma = (a: string) => {
  const w = a.trim().split(/\s+/);
  return w.length >= 2 && /^[A-Z]{1,3}$/.test(w[w.length - 1]) ? `${w.slice(0, -1).join(" ")}, ${w[w.length - 1]}` : a.trim();
};

const bibKey = (p: EvidencePaper, i: number) => `${firstSurname(p.authors) || "ref"}${p.year}${String.fromCharCode(97 + (i % 26))}`;

export function toBibtex(papers: EvidencePaper[]): string {
  return papers
    .map((p, i) => {
      const doi = (p.link ?? "").match(/10\.\d{4,9}\/\S+/)?.[0];
      const authors = p.authors
        .replace(/,?\s*et al\.?/i, "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .map(familyComma)
        .join(" and ");
      return `@article{${bibKey(p, i)},\n  title = {${p.title}},\n  author = {${authors}},\n  year = {${p.year}}${doi ? `,\n  doi = {${doi}}` : p.link ? `,\n  url = {${p.link}}` : ""}\n}`;
    })
    .join("\n\n");
}

export function toRis(papers: EvidencePaper[]): string {
  return papers
    .map((p) => {
      const doi = (p.link ?? "").match(/10\.\d{4,9}\/\S+/)?.[0];
      const au = p.authors
        .replace(/,?\s*et al\.?/i, "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .map((a) => `AU  - ${familyComma(a)}`);
      return ["TY  - JOUR", ...au, `TI  - ${p.title}`, `PY  - ${p.year}`, ...(doi ? [`DO  - ${doi}`] : p.link ? [`UR  - ${p.link}`] : []), "ER  - "].join("\n");
    })
    .join("\n\n");
}

export interface InTextCitation {
  surname: string;
  year: number;
  raw: string;
}

/** استشهادات APA بالنص: (Devon, 2010) · (Devon et al., 2010) · (Devon & Zerwic, 2010; Galdas, 2011) · Devon (2010) */
export function extractCitations(text: string): InTextCitation[] {
  const out: InTextCitation[] = [];
  const add = (surname: string, year: string, raw: string) => out.push({ surname: surname.toLowerCase(), year: Number(year), raw: raw.trim() });
  for (const paren of text.matchAll(/\(([^()]*?(?:19|20)\d{2}[a-z]?[^()]*?)\)/g)) {
    for (const part of paren[1].split(";")) {
      const m = part.trim().match(/^([A-Z][A-Za-z'’-]+)(?:\s+(?:et al\.?|(?:&|and)\s+[A-Z][A-Za-z'’-]+))?(?:\s*,\s*|\s+)((?:19|20)\d{2})[a-z]?/);
      if (m) add(m[1], m[2], part);
    }
  }
  for (const m of text.matchAll(/\b([A-Z][A-Za-z'’-]+)(?:\s+et al\.?)?\s+\(((?:19|20)\d{2})[a-z]?\)/g)) add(m[1], m[2], m[0]);
  const seen = new Set<string>();
  return out.filter((c) => (seen.has(`${c.surname}|${c.year}`) ? false : (seen.add(`${c.surname}|${c.year}`), true)));
}

export interface CitationCheck {
  /** استشهادات بالنص ما لها دراسة بالمكتبة */
  missing: InTextCitation[];
  /** دراسات بالمكتبة ما انذكرت بالنص */
  uncited: EvidencePaper[];
  matched: number;
}

export function checkCitations(texts: string[], papers: EvidencePaper[]): CitationCheck {
  const cites = extractCitations(texts.join("\n"));
  const have = new Set(papers.map((p) => keyOf(p)));
  const used = new Set(cites.map((c) => `${c.surname}|${c.year}`));
  return {
    missing: cites.filter((c) => !have.has(`${c.surname}|${c.year}`)),
    uncited: papers.filter((p) => !used.has(keyOf(p))),
    matched: cites.filter((c) => have.has(`${c.surname}|${c.year}`)).length,
  };
}
