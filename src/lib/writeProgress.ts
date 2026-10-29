import type { EthicalApproval, EthicalAttachments, EthicalPrinciples, Methodology } from "../data/types";

/** متى نعتبر جزء المنهجية «جاهز» — نفس الحساب بخريطة المنهجية وعدّاد تبويب «أكتب» (عرض بس، ما ينحفظ) */
export const METHOD_READY = {
  design: (m: Methodology) => !!m.studyDesign.trim(),
  setting: (m: Methodology) => !!m.studySetting.trim(),
  population: (m: Methodology) => !!m.population.trim(),
  sample: (m: Methodology) => m.sampling.inclusionCriteria.length > 0 && !!m.sampling.sampleSize.trim() && !!m.sampling.samplingTechnique.trim(),
  collection: (m: Methodology) => m.dataCollectionMethods.length > 0,
  analysis: (m: Methodology) => !!m.dataAnalysis.trim(),
  ethics: (m: Methodology) => !!m.ethicalConsiderations.trim(),
} as const;

export type MethodPartKey = keyof typeof METHOD_READY;

export const methodologyReadyCount = (m: Methodology) => Object.values(METHOD_READY).filter((ready) => ready(m)).length;

/** بنود المبادئ الأخلاقية الـ١٣ بنفس ترتيب النموذج الرسمي */
export const PRINCIPLE_KEYS: (keyof EthicalPrinciples)[] = [
  "writtenExplanation",
  "oralExplanation",
  "writtenConsent",
  "oralConsent",
  "voluntaryInformed",
  "withdrawOption",
  "harmInformed",
  "confidentialityGuaranteed",
  "anonymityGuaranteed",
  "vulnerableGroupsInformed",
  "interviewNoExplanationNeeded",
  "safeDataStorage",
  "willPublish",
];

export const principlesAnswered = (p: EthicalPrinciples) => PRINCIPLE_KEYS.filter((k) => p[k] !== null).length;

const filledStr = (v: unknown) => !!v && !!String(v).trim();

export const ETHICS_ATTACHMENT_KEYS: (keyof EthicalAttachments)[] = ["protocolOrProposal", "participantInfoSheet", "consentForm", "studyTools", "otherSupportiveDocs"];

/** خطوات نموذج الموافقة الأخلاقية الأربع (خلصت ولا لا) — نفس الحساب بصفحة الموافقة والرئيسية */
export const ethicsStepsDone = (ea: EthicalApproval): [boolean, boolean, boolean, boolean] => [
  filledStr(ea.applicationDate) && filledStr(ea.expectedStartDate) && filledStr(ea.expectedEndDate),
  (["piName", "piAffiliation", "piEmail", "supervisorNames"] as const).every((k) => filledStr(ea[k])),
  principlesAnswered(ea.principles) === PRINCIPLE_KEYS.length,
  ETHICS_ATTACHMENT_KEYS.every((k) => ea.attachments[k]),
];
