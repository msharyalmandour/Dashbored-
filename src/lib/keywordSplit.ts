import { tr } from "./i18n";

export interface KeywordGroup {
  memberId: string;
  terms: string[];
}

/** يوزّع الكلمات على الأعضاء بالتساوي (دورة بالتناوب، بدون تكرار) — كل عضو ياخذ مجموعة مختلفة */
export function splitKeywords(terms: string[], memberIds: string[]): KeywordGroup[] {
  const seen = new Set<string>();
  const unique = terms.map((t) => t.trim()).filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
  if (memberIds.length === 0) return [];
  const groups: KeywordGroup[] = memberIds.map((memberId) => ({ memberId, terms: [] }));
  unique.forEach((t, i) => groups[i % groups.length].terms.push(t));
  return groups.filter((g) => g.terms.length > 0);
}

/** جملة بحث جاهزة لمجموعة: ("a" OR "b" OR "c") */
export function searchStringFor(terms: string[]): string {
  return `(${terms.map((t) => (/\s/.test(t) ? `"${t}"` : t)).join(" OR ")})`;
}

export function taskTextFor(terms: string[], databases: string[], target: number): { title: string; description: string } {
  return {
    title: tr("البحث بالكلمات: {0}", terms.slice(0, 3).join("، ") + (terms.length > 3 ? "…" : "")),
    description: tr("ابحثوا في {0} بهالجملة: {1}. اختاروا أقرب {2} دراسات وأضيفوها لمكتبة الأدلة (اقرأ لي هذي الورقة يعبّي الجدول). كل الكلمات: {3}", databases.join(" و"), searchStringFor(terms), target, terms.join(", ")),
  };
}
