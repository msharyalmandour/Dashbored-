import type { ResearchStage } from "../data/types";
import { tr } from "./i18n";

interface StageTitle {
  female: string;
  male: string;
  en: string;
}

const stageTitles: Record<string, StageTitle> = {
  proposal: { female: tr("باحثة مبتدئة"), male: tr("باحث مبتدئ"), en: "Junior Researcher" },
  "lit-review": { female: tr("باحثة الأدبيات"), male: tr("باحث الأدبيات"), en: "Literature Researcher" },
  gap: { female: tr("صائغة الفجوة البحثية"), male: tr("صائغ الفجوة البحثية"), en: "Gap Analyst" },
  aim: { female: tr("باحثة الأهداف"), male: tr("باحث الأهداف"), en: "Aim Researcher" },
  methodology: { female: tr("باحثة المنهجية"), male: tr("باحث المنهجية"), en: "Methodology Researcher" },
  "data-collection": { female: tr("باحثة ميدانية"), male: tr("باحث ميداني"), en: "Field Researcher" },
  analysis: { female: tr("محلّلة بيانات"), male: tr("محلّل بيانات"), en: "Data Analyst" },
  final: { female: tr("باحثة متخرجة"), male: tr("باحث متخرج"), en: "Graduate Researcher" },
};

const fallbackTitle: StageTitle = { female: tr("باحثة"), male: tr("باحث"), en: "Researcher" };

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
