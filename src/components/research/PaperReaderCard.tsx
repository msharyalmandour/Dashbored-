import { useRef, useState } from "react";
import { BookOpenCheck, Check, FileUp, Loader2, X } from "lucide-react";
import clsx from "clsx";
import { glassCard } from "../ui/researchUi";
import { readPaperPdf, type PaperReading } from "../../hooks/useProjectAgent";
import type { EvidencePaper } from "../../data/types";
import { sectionLabelAr } from "./sectionLabelAr";
import { tr } from "../../lib/i18n";

type Save = (p: {
  title: string;
  authors: string;
  year: number;
  theme: EvidencePaper["theme"];
  studyDesign: string;
  keyFinding: string;
  relevance: string;
  section: EvidencePaper["section"];
}) => Promise<{ error?: string }>;

/** «اقرأ لي هذي الورقة»: ترفعون PDF، الوكيل يطلّع بطاقة قراءة (التصميم، العينة، النتيجة، الحدود، علاقتها ببحثكم)
    وأنتم تراجعونها وتعتمدون إضافتها للمكتبة. الملخص من نص الورقة فقط — راجعوه قبل ما تعتمدونه بالبحث. */
export default function PaperReaderCard({ onSave }: { onSave: Save }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState<PaperReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setPaper(null);
    setSaved(false);
    const r = await readPaperPdf(file);
    setBusy(false);
    if (r.data) setPaper(r.data);
    else setError(r.message ?? tr("تعذّرت قراءة الورقة."));
    if (inputRef.current) inputRef.current.value = "";
  };

  const save = async () => {
    if (!paper) return;
    const { error: e } = await onSave({
      title: paper.title,
      authors: paper.authors,
      year: paper.year ?? new Date().getFullYear(),
      theme: paper.theme as EvidencePaper["theme"],
      studyDesign: paper.studyDesign,
      keyFinding: paper.keyFinding,
      relevance: paper.relevance,
      section: paper.section,
    });
    if (e) setError(tr("ما انحفظت الدراسة — حاولوا مرة ثانية."));
    else setSaved(true);
  };

  const rows: [string, string][] = paper
    ? [
        [tr("التصميم"), paper.studyDesign],
        [tr("العينة والمكان"), paper.sampleAndSetting],
        [tr("أهم نتيجة"), paper.keyFinding],
        [tr("الحدود"), paper.limitations],
        [tr("علاقتها ببحثكم"), paper.relevance],
      ]
    : [];

  return (
    <div className={clsx(glassCard, "space-y-3 p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#F4F0EC]">
            <BookOpenCheck size={16} className="text-[#FFB444]" /> {tr("اقرأ لي هذي الورقة")}
          </p>
          <p className="mt-0.5 text-xs text-[#B8ADA2]">{tr("ارفعوا PDF لدراسة (حتى ٤ ميغا) ويطلع لكم ملخص منظّم تعتمدون إضافته للمكتبة.")}</p>
        </div>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 rounded-full border border-[#FF8A24]/50 px-4 py-1.5 text-xs font-bold text-[#FFB444] transition hover:bg-[#FF6B00]/10 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          {busy ? tr("أقرأها…") : tr("ارفعوا ورقة PDF")}
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">{error}</p>}

      {paper && (
        <div className="space-y-2.5 rounded-2xl border border-white/[0.12] p-4 text-sm">
          <p className="font-extrabold text-[#F4F0EC]" dir="auto">
            {paper.title}
          </p>
          <p className="text-xs text-[#B8ADA2]" dir="auto">
            {paper.authors}
            {paper.year ? ` (${paper.year})` : ""}
          </p>
          <p className="leading-relaxed text-[#E6DBD1]">{paper.summaryAr}</p>
          <dl className="space-y-1.5">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] font-bold text-[#B8ADA2]">{k}</dt>
                  <dd className="text-[13px] text-[#E6DBD1]">{v}</dd>
                </div>
              ))}
          </dl>
          <p className="text-[11px] text-[#B8ADA2]">{tr("تنحفظ بقسم «{0}» — تقدرون تغيّرونه بعدين.", sectionLabelAr[paper.section])}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7fd6a0]">
                <Check size={15} /> {tr("انضافت للمكتبة")}
              </span>
            ) : (
              <>
                <button type="button" onClick={save} className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-4 py-1.5 text-xs font-extrabold text-[#1A0F00]">
                  <Check size={14} /> {tr("أضفها للمكتبة")}
                </button>
                <button type="button" onClick={() => setPaper(null)} className="flex items-center gap-1 text-xs font-semibold text-[#B8ADA2] hover:text-[#F4F0EC]">
                  <X size={12} /> {tr("تجاهل")}
                </button>
              </>
            )}
          </div>
          <p className="text-[11px] text-[#B8ADA2]/80">{tr("الملخص من نص الورقة بالذكاء — راجعوا الأرقام بالأصل قبل ما تعتمدونها بالبحث.")}</p>
        </div>
      )}
    </div>
  );
}
