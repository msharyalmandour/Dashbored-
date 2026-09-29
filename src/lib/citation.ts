import type { EvidencePaper } from "../data/types";

export type CitationStyle = "apa" | "vancouver";

/** يشيل النقطة الأخيرة لو موجودة، عشان ما تتكرر لما نضيف نقطتنا احنا */
function stripTrailingPeriod(text: string): string {
  return text.trimEnd().replace(/\.$/, "");
}

/** يصيغ اقتباس APA مبسّط — الحقول المتوفرة عندنا (مؤلفين، سنة، عنوان، رابط) لا
    تغطي كل تفاصيل APA الكاملة (المجلة، العدد، الصفحات)، فهذا أساس جاهز يحتاج
    مراجعة سريعة قبل التسليم النهائي، مو بديل نهائي عن التنسيق اليدوي الدقيق */
export function toAPA(paper: EvidencePaper): string {
  const { year, title, link } = paper;
  const authors = stripTrailingPeriod(paper.authors);
  const base = `${authors} (${year}). ${title}.`;
  return link ? `${base} تم الاسترجاع من ${link}` : base;
}

/** يصيغ اقتباس Vancouver مبسّط (الأسلوب الشائع بالمجلات الطبية والتمريضية) */
export function toVancouver(paper: EvidencePaper, index?: number): string {
  const { year, title, link } = paper;
  const authors = stripTrailingPeriod(paper.authors);
  const prefix = index ? `${index}. ` : "";
  const base = `${prefix}${authors}. ${title}. ${year}.`;
  return link ? `${base} متوفر من: ${link}` : base;
}

export function toCitation(paper: EvidencePaper, style: CitationStyle, index?: number): string {
  return style === "apa" ? toAPA(paper) : toVancouver(paper, index);
}

/** يبني قائمة مراجع كاملة جاهزة للّصق — مرتبة أبجديًا لـ APA، وبترتيب
    الاستخدام (مرقّمة) لـ Vancouver */
export function buildReferenceList(papers: EvidencePaper[], style: CitationStyle): string {
  if (style === "apa") {
    const sorted = [...papers].sort((a, b) => a.authors.localeCompare(b.authors, "ar"));
    return sorted.map((p) => toAPA(p)).join("\n\n");
  }
  return papers.map((p, i) => toVancouver(p, i + 1)).join("\n\n");
}
