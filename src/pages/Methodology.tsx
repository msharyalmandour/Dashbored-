import { useState, type ChangeEvent } from "react";
import { ClipboardList, FlaskConical, MapPin, Ruler, Users2 } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import MethodologyTemplateHelper from "../components/MethodologyTemplateHelper";
import { useMethodology } from "../hooks/useMethodology";
import type { MethodologyTemplate } from "../data/methodologyTemplates";

/** حقل نصي بسطر واحد يُحفظ عند الخروج منه فقط */
function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      <input
        value={draft}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onSave(draft);
        }}
        placeholder="لم يُحدد بعد"
        className="mt-1 w-full bg-transparent text-sm font-semibold text-brand-950 outline-none placeholder:font-normal placeholder:italic placeholder:text-brand-950/35"
      />
    </div>
  );
}

/** قائمة سطور تُحرَّر كنص متعدد الأسطر (سطر لكل عنصر) وتُحفظ عند الخروج */
function EditableListField({
  label,
  items,
  onSave,
}: {
  label: string;
  items: string[];
  onSave: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState(items.join("\n"));
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      <textarea
        value={draft}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.split("\n").filter(Boolean);
          if (next.join("\n") !== items.join("\n")) onSave(next);
        }}
        rows={3}
        placeholder={"سطر لكل عنصر..."}
        className="mt-1 w-full resize-y bg-transparent text-sm text-brand-950/85 outline-none placeholder:italic placeholder:text-brand-950/35"
      />
    </div>
  );
}

export default function Methodology() {
  const { methodology, updateMethodology } = useMethodology();

  const applyTemplate = (t: MethodologyTemplate) => {
    updateMethodology({
      studyDesign: t.studyDesign,
      studyDesignStatus: "in-progress",
      sampling: {
        inclusionCriteria: t.inclusionCriteria,
        exclusionCriteria: t.exclusionCriteria,
        samplingTechnique: t.samplingTechnique,
        sampleSize: methodology.sampling.sampleSize,
      },
      dataCollectionMethods: t.dataCollectionMethods,
      studyTool: { type: "existing", name: t.suggestedTool },
    });
  };

  return (
    <div className="space-y-5">
      <Card tone="cream" className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
          <FlaskConical size={18} />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-brand-950">
            المنهجية — Methodology
          </h2>
          <p className="mt-0.5 text-sm text-brand-950/50">
            عبّوا الحقول تحت مباشرة — تُحفظ فورًا وتظهر لكل الفريق.
          </p>
        </div>
      </Card>

      <MethodologyTemplateHelper onApply={applyTemplate} />

      <Card>
        <CardHeader title="تصميم الدراسة" subtitle="Study Design" />
        <EditableField
          label="نوع التصميم (كمي / كيفي / مختلط)"
          value={methodology.studyDesign}
          onSave={(v) => updateMethodology({ studyDesign: v })}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="مكان الدراسة"
            subtitle="Study Setting"
            action={<MapPin size={18} className="text-brand-600" />}
          />
          <EditableField
            label="المكان"
            value={methodology.studySetting}
            onSave={(v) => updateMethodology({ studySetting: v })}
          />
        </Card>
        <Card>
          <CardHeader
            title="مجتمع الدراسة"
            subtitle="Population"
            action={<Users2 size={18} className="text-brand-600" />}
          />
          <EditableField
            label="الفئة المستهدفة"
            value={methodology.population}
            onSave={(v) => updateMethodology({ population: v })}
          />
        </Card>
      </div>

      <Card>
        <CardHeader title="العينة" subtitle="Sampling" action={<Ruler size={18} className="text-brand-600" />} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableListField
            label="معايير الاشتمال — Inclusion Criteria"
            items={methodology.sampling.inclusionCriteria}
            onSave={(v) => updateMethodology({ sampling: { ...methodology.sampling, inclusionCriteria: v } })}
          />
          <EditableListField
            label="معايير الاستبعاد — Exclusion Criteria"
            items={methodology.sampling.exclusionCriteria}
            onSave={(v) => updateMethodology({ sampling: { ...methodology.sampling, exclusionCriteria: v } })}
          />
          <EditableField
            label="حجم العينة — Sample Size"
            value={methodology.sampling.sampleSize}
            onSave={(v) => updateMethodology({ sampling: { ...methodology.sampling, sampleSize: v } })}
          />
          <EditableField
            label="أسلوب اختيار العينة — Sampling Technique"
            value={methodology.sampling.samplingTechnique}
            onSave={(v) => updateMethodology({ sampling: { ...methodology.sampling, samplingTechnique: v } })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="جمع البيانات"
          subtitle="Data Collection"
          action={<ClipboardList size={18} className="text-brand-600" />}
        />
        <EditableListField
          label="طريقة الجمع (مقابلة / استبيان / ملاحظة / أخرى)"
          items={methodology.dataCollectionMethods}
          onSave={(v) => updateMethodology({ dataCollectionMethods: v })}
        />
      </Card>

      <Card>
        <CardHeader title="أداة الدراسة" subtitle="Study Tool" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-bold text-brand-950/45">النوع</p>
            <select
              value={methodology.studyTool.type}
              onChange={(e) =>
                updateMethodology({
                  studyTool: { ...methodology.studyTool, type: e.target.value as typeof methodology.studyTool.type },
                })
              }
              className="mt-1 w-full bg-transparent text-sm font-semibold text-brand-950 outline-none"
            >
              <option value="undecided">لم يُحدد بعد</option>
              <option value="existing">أداة جاهزة</option>
              <option value="developed">أداة مطوَّرة</option>
            </select>
          </div>
          <EditableField
            label="اسم الأداة"
            value={methodology.studyTool.name}
            onSave={(v) => updateMethodology({ studyTool: { ...methodology.studyTool, name: v } })}
          />
        </div>
      </Card>
    </div>
  );
}
