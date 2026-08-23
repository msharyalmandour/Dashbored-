import type { ResearchStage } from "../data/types";

interface StageTitle {
  female: string;
  male: string;
  en: string;
}

const stageTitles: Record<string, StageTitle> = {
  proposal: { female: "باحثة مبتدئة", male: "باحث مبتدئ", en: "Junior Researcher" },
  "lit-review": { female: "باحثة الأدبيات", male: "باحث الأدبيات", en: "Literature Researcher" },
  gap: { female: "صائغة الفجوة البحثية", male: "صائغ الفجوة البحثية", en: "Gap Analyst" },
  aim: { female: "باحثة الأهداف", male: "باحث الأهداف", en: "Aim Researcher" },
  methodology: { female: "باحثة المنهجية", male: "باحث المنهجية", en: "Methodology Researcher" },
  "data-collection": { female: "باحثة ميدانية", male: "باحث ميداني", en: "Field Researcher" },
  analysis: { female: "محلّلة بيانات", male: "محلّل بيانات", en: "Data Analyst" },
  final: { female: "باحثة متخرجة", male: "باحث متخرج", en: "Graduate Researcher" },
};

const fallbackTitle: StageTitle = { female: "باحثة", male: "باحث", en: "Researcher" };

/** لقب هوية يتطور تلقائيًا مع تقدم الفريق بمراحل البحث */
export function getResearcherTitle(
  stages: ResearchStage[],
  isFemale: boolean,
): { ar: string; en: string } {
  const active = stages.find((s) => s.status === "active");
  const lastDone = [...stages].reverse().find((s) => s.status === "done");
  const stage = active ?? lastDone ?? stages[0];
  const entry = (stage && stageTitles[stage.id]) || fallbackTitle;
  return { ar: isFemale ? entry.female : entry.male, en: entry.en };
}
