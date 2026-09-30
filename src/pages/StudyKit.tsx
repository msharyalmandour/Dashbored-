import { useEffect, useMemo, useState } from "react";
import { Check, Copy, FileDown, FileText, ListChecks, Languages } from "lucide-react";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useMethodology } from "../hooks/useMethodology";
import { useChecklist } from "../hooks/useChecklist";
import { beforeDataChecklist, buildTemplate, templateMeta, translationChecklist, type ChecklistItem, type TemplateId } from "../lib/studyTemplates";
import { downloadTextAsWord } from "../lib/textDoc";

type Tab = "docs" | "translation" | "before";

function Checklist({
  listKey,
  items,
  projectId,
  userId,
}: {
  listKey: string;
  items: ChecklistItem[];
  projectId: string | null;
  userId: string | null;
}) {
  const { done, toggle } = useChecklist(listKey, projectId, userId);
  const count = items.filter((i) => done[i.key]).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(count / items.length) * 100}%` }} />
        </div>
        <span className="text-xs font-extrabold text-brand-950/60">
          {count} / {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={it.key}>
            <button
              onClick={() => toggle(it.key)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-start transition-colors ${
                done[it.key] ? "border-brand-300 bg-brand-500/10" : "border-brand-100 bg-paper hover:bg-surface-muted"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                  done[it.key] ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200 text-brand-950/40"
                }`}
              >
                {done[it.key] ? <Check size={13} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${done[it.key] ? "text-brand-950/50 line-through" : "text-brand-950"}`}>{it.label}</span>
                {it.hint && <span className="mt-0.5 block text-xs text-brand-950/45">{it.hint}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StudyKit() {
  const { currentUser } = useAuth();
  const { project } = useResearchProject();
  const { roster } = useTeamRoster();
  const { methodology } = useMethodology();
  const [tab, setTab] = useState<Tab>("docs");
  const [template, setTemplate] = useState<TemplateId>("consent-ar");
  const [university, setUniversity] = useState("جامعة الملك عبدالعزيز — كلية التمريض");
  const [toolName, setToolName] = useState("");
  const [duration, setDuration] = useState("١٠–١٥ دقيقة");
  const [contactEmail, setContactEmail] = useState("");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const ctx = useMemo(
    () => ({
      title: project?.title ?? "",
      supervisor: project?.supervisorName ?? "",
      members: roster.map((m) => m.name),
      university,
      population: methodology.population ?? "",
      toolName,
      contactEmail,
      duration,
    }),
    [project?.title, project?.supervisorName, roster, university, methodology.population, toolName, contactEmail, duration],
  );

  // أي تغيير بالسياق أو القالب يعيد توليد النص (تعديلاتكم اليدوية تنمسح عند تغيير الحقول — انسخوا قبل)
  useEffect(() => {
    setText(buildTemplate(template, ctx));
  }, [template, ctx]);

  const meta = templateMeta[template];
  const ids = Object.keys(templateMeta) as TemplateId[];

  const tabs: { id: Tab; label: string; when: string; icon: typeof FileText }[] = [
    { id: "docs", label: "النماذج الجاهزة", when: "إذن، موافقة، خطاب جهة", icon: FileText },
    { id: "translation", label: "ترجمة الاستبيان", when: "خطواتها وتتبّعها", icon: Languages },
    { id: "before", label: "قبل جمع البيانات", when: "قائمة التحقق الأخيرة", icon: ListChecks },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">حقيبة الاستبيان والموافقات</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-950/55">
          كل الأوراق اللي تحتاجونها قبل ما توزعون الاستبيان: إذن الأداة، موافقة المشارك، خطاب الجهة، وخطوات الترجمة. تتعبأ ببيانات بحثكم وتعدّلونها
          وتنزّلونها Word.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {tabs.map(({ id, label, when, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-start transition-colors ${
                active ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/40" : "border-brand-100 bg-paper hover:bg-surface-muted"
              }`}
            >
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-brand-500 text-white" : "bg-surface-muted text-brand-950/50"}`}>
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-brand-950">{label}</span>
                <span className="mt-0.5 block text-xs text-brand-950/55">{when}</span>
              </span>
            </button>
          );
        })}
      </div>

      {tab === "docs" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
          <div className="space-y-3">
            <Card className="space-y-2">
              <p className="text-sm font-extrabold text-brand-950">اختاروا النموذج</p>
              {ids.map((id) => (
                <button
                  key={id}
                  onClick={() => setTemplate(id)}
                  className={`block w-full rounded-xl border px-3 py-2 text-start ${
                    template === id ? "border-brand-500 bg-brand-500/10" : "border-brand-100 hover:bg-surface-muted"
                  }`}
                >
                  <span className="block text-sm font-bold text-brand-950">{templateMeta[id].label}</span>
                  <span className="block text-[11px] text-brand-950/45">{templateMeta[id].hint}</span>
                </button>
              ))}
            </Card>
            <Card className="space-y-2.5">
              <p className="text-sm font-extrabold text-brand-950">بيانات تتعبّى بالنموذج</p>
              {(
                [
                  ["الجامعة / الكلية", university, setUniversity],
                  ["اسم الأداة (للإذن)", toolName, setToolName],
                  ["مدة تعبئة الاستبيان", duration, setDuration],
                  ["إيميل التواصل", contactEmail, setContactEmail],
                ] as const
              ).map(([label, val, set]) => (
                <label key={label} className="block">
                  <span className="mb-1 block text-[11px] font-bold text-brand-950/50">{label}</span>
                  <input
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="w-full rounded-lg border border-brand-100 bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-brand-300"
                  />
                </label>
              ))}
              <p className="text-[11px] text-brand-950/40">العنوان والمشرفة والفريق والفئة تنسحب تلقائيًا من بيانات مشروعكم.</p>
            </Card>
          </div>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-brand-950">{meta.label}</p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    } catch {
                      // نسخ يدوي
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-paper px-3 py-1.5 text-xs font-bold text-brand-950/70 hover:bg-surface-muted"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "تم النسخ" : "نسخ"}
                </button>
                <button
                  onClick={() => downloadTextAsWord(meta.label, text, meta.rtl, `${meta.label}.docx`)}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
                >
                  <FileDown size={13} />
                  تنزيل Word
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={22}
              dir={meta.rtl ? "rtl" : "ltr"}
              className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-300"
            />
            <p className="text-[11px] leading-relaxed text-brand-950/45">
              هذا قالب بداية مبني على عناصر الموافقة المستنيرة المعتمدة (الطوعية، حق الانسحاب، السرية). ما بين [أقواس] لازم تعبّونه. لجنة أخلاقيات
              الجهة والمشرفة لهم الكلمة النهائية — لو عندهم نموذج رسمي استخدموه. تنبيه: تعديلاتكم اليدوية على النص تنمسح لو غيّرتوا النموذج أو الحقول الجانبية — انسخوا أو نزّلوا قبلها.
            </p>
          </Card>
        </div>
      )}

      {tab === "translation" && (
        <Card className="space-y-3">
          <div>
            <h3 className="text-base font-bold text-brand-950">خطوات ترجمة وتكييف استبيان أجنبي</h3>
            <p className="text-xs leading-relaxed text-brand-950/55">
              لو تبون تستخدمون استبيان إنجليزي بعينة عربية، ما يكفي تترجمونه بأنفسكم — لازم خطوات موثّقة (ترجمة أمامية وعكسية ومراجعة خبراء). الخطوات
              مشتركة مع فريقكم، وأي عضو يعلّم اللي خلّصتوه.
            </p>
          </div>
          <Checklist listKey="translation" items={translationChecklist} projectId={project?.id ?? null} userId={currentUser?.id ?? null} />
        </Card>
      )}

      {tab === "before" && (
        <Card className="space-y-3">
          <div>
            <h3 className="text-base font-bold text-brand-950">جاهزين لجمع البيانات؟</h3>
            <p className="text-xs leading-relaxed text-brand-950/55">تأكدوا من كل نقطة قبل ما توزعون أول استبيان — ضياع الموافقات أكثر شي يوقف البحث بآخر لحظة.</p>
          </div>
          <Checklist listKey="before-data" items={beforeDataChecklist} projectId={project?.id ?? null} userId={currentUser?.id ?? null} />
        </Card>
      )}
    </div>
  );
}
