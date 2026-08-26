import { ClipboardList, FlaskConical, MapPin, Ruler, Users2 } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import MethodologyTemplateHelper from "../components/MethodologyTemplateHelper";
import { methodology } from "../data/mockData";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {value ? (
        <p className="mt-1 text-sm font-semibold text-brand-950">{value}</p>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/35">لم يُحدد بعد</p>
      )}
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-brand-950/75">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/35">لم تُحدد بعد</p>
      )}
    </div>
  );
}

export default function Methodology() {
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
            هذا القسم ما بدأ العمل عليه بعد — يبدأ بعد اكتمال هدف الدراسة وأسئلة البحث.
          </p>
        </div>
      </Card>

      <MethodologyTemplateHelper />

      <Card>
        <CardHeader title="تصميم الدراسة" subtitle="Study Design" />
        <Field label="نوع التصميم (كمي / كيفي / مختلط)" value={methodology.studyDesign} />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="مكان الدراسة"
            subtitle="Study Setting"
            action={<MapPin size={18} className="text-brand-600" />}
          />
          <Field label="المكان" value={methodology.studySetting} />
        </Card>
        <Card>
          <CardHeader
            title="مجتمع الدراسة"
            subtitle="Population"
            action={<Users2 size={18} className="text-brand-600" />}
          />
          <Field label="الفئة المستهدفة" value={methodology.population} />
        </Card>
      </div>

      <Card>
        <CardHeader title="العينة" subtitle="Sampling" action={<Ruler size={18} className="text-brand-600" />} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ListField label="معايير الاشتمال — Inclusion Criteria" items={methodology.sampling.inclusionCriteria} />
          <ListField label="معايير الاستبعاد — Exclusion Criteria" items={methodology.sampling.exclusionCriteria} />
          <Field label="حجم العينة — Sample Size" value={methodology.sampling.sampleSize} />
          <Field label="أسلوب اختيار العينة — Sampling Technique" value={methodology.sampling.samplingTechnique} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="جمع البيانات"
          subtitle="Data Collection"
          action={<ClipboardList size={18} className="text-brand-600" />}
        />
        <ListField label="طريقة الجمع (مقابلة / استبيان / ملاحظة / أخرى)" items={methodology.dataCollectionMethods} />
      </Card>

      <Card>
        <CardHeader title="أداة الدراسة" subtitle="Study Tool" />
        <Field
          label="النوع"
          value={
            methodology.studyTool.type === "existing"
              ? `أداة جاهزة — ${methodology.studyTool.name}`
              : methodology.studyTool.type === "developed"
                ? `أداة مطوَّرة — ${methodology.studyTool.name}`
                : ""
          }
        />
      </Card>
    </div>
  );
}
