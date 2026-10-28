import type { EvidenceSection } from "../../data/types";
import { tr } from "../../lib/i18n";

export const sectionLabelAr: Record<EvidenceSection, string> = {
  background: tr("الخلفية"),
  "literature-review": tr("مراجعة الأدبيات"),
  gap: tr("الفجوة البحثية"),
  methodology: tr("المنهجية"),
  other: tr("أخرى"),
};
