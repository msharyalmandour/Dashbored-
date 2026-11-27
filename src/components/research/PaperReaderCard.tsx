import { useEffect, useRef, useState } from "react";
import { WSpin } from "../brand/WLogo";
import { Link } from "react-router-dom";
import { BookOpenCheck, Check, FileUp, X } from "lucide-react";
import clsx from "clsx";
import { glassCard } from "../ui/researchUi";
import { readPaperFiles, type PaperReading } from "../../hooks/useProjectAgent";
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
  country: string;
  aim: string;
  sample: string;
  dataCollection: string;
}) => Promise<{ error?: string }>;

/** «اقرأ لي هذي الورقة»: ترفعون PDF أو صور صفحاتها (تصوير جوال/لقطات شاشة)، ويسي يطلّع بطاقة قراءة
    (الدولة، الهدف، التصميم، العينة، النتيجة، الحدود، علاقتها ببحثكم) وأنتم تراجعونها وتعتمدون إضافتها للمكتبة،
    وتنزل بجدول الأدبيات. الملخص من نص الورقة فقط — راجعوه قبل ما تعتمدونه بالبحث.
    compact: داخل ويسي العائم (بدون الإطار الزجاجي). */
export default function PaperReaderCard({ onSave, compact = false, onClose, initialFiles }: { onSave: Save; compact?: boolean; onClose?: () => void; /** ملفات اختارها الطالب من ويسي — تنقرا أول ما يفتح الكرت */ initialFiles?: File[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState<PaperReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  const started = useRef(false);
  useEffect(() => {
    if (started.current || !initialFiles?.length) return;
    started.current = true;
    void pick(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]);

  const pick = async (files: FileList | File[] | null | undefined) => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setPaper(null);
    setSaved(false);
    const r = await readPaperFiles(list);
    setBusy(false);
    if (r.data) setPaper(r.data);
    else setError(r.message ?? tr("تعذّرت قراءة الورقة."));
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
      country: paper.country,
      aim: paper.aim,
      sample: paper.sampleAndSetting,
      dataCollection: paper.dataCollection,
    });
    if (e) setError(tr("ما انحفظت الدراسة — حاولوا مرة ثانية."));
    else setSaved(true);
  };

  const rows: [string, string][] = paper
    ? [
        [tr("الدولة"), paper.country],
        [tr("الهدف"), paper.aim],
        [tr("التصميم"), paper.studyDesign],
        [tr("جمع البيانات"), paper.dataCollection],
        [tr("العينة والمكان"), paper.sampleAndSetting],
        [tr("أهم نتيجة"), paper.keyFinding],
        [tr("الحدود"), paper.limitations],
        [tr("علاقتها ببحثكم"), paper.relevance],
      ]
    : [];

  return (
    <div
      className={clsx(compact ? "space-y-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4" : clsx(glassCard, "space-y-3 p-5"), dragging && "ring-2 ring-ws-accent2/60")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold text-ws-text">
            <BookOpenCheck size={16} className="text-ws-accent3" /> {tr("اقرأ لي هذي الورقة")}
          </p>
          <p className="mt-0.5 text-xs text-ws-muted">{tr("ارفعوا PDF الدراسة، أو صوّروا صفحاتها (حتى 10 صور)، أو اسحبوها هنا. يطلع لكم ملخص منظّم، وتعتمدون إضافته لجدول الأدبيات.")}</p>
        </div>
        {onClose && !busy && (
          <button type="button" onClick={onClose} aria-label={tr("إغلاق")} className="rounded-full p-1.5 text-ws-muted hover:text-ws-text">
            <X size={14} />
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 rounded-full border border-ws-accent2/50 px-4 py-1.5 text-xs font-bold text-ws-accent3 transition hover:bg-ws-accent/10 disabled:opacity-50">
          {busy ? <WSpin size={14} /> : <FileUp size={14} />}
          {busy ? tr("أقرأها…") : tr("ارفعوا PDF أو صور")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,image/*"
          multiple
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">{error}</p>}

      {paper && (
        <div className="space-y-2.5 rounded-2xl border border-white/[0.12] p-4 text-sm">
          <p className="font-extrabold text-ws-text" dir="auto">
            {paper.title}
          </p>
          <p className="text-xs text-ws-muted" dir="auto">
            {paper.authors}
            {paper.year ? ` (${paper.year})` : ""}
          </p>
          <p className="leading-relaxed text-ws-text">{paper.summaryAr}</p>
          <dl className="space-y-1.5">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] font-bold text-ws-muted">{k}</dt>
                  <dd className="text-[13px] text-ws-text">{v}</dd>
                </div>
              ))}
          </dl>
          <p className="text-[12px] text-ws-muted">{tr("تنحفظ بقسم «{0}» — تقدرون تغيّرونه بعدين.", sectionLabelAr[paper.section])}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {saved ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ws-accent3">
                  <Check size={15} /> {tr("انضافت للمكتبة وجدول الأدبيات")}
                </span>
                <Link to="/literature-review" className="text-xs font-bold text-ws-accent3 hover:underline">
                  {tr("شوفوها بالجدول ←")}
                </Link>
              </>
            ) : (
              <>
                <button type="button" onClick={save} className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-ws-accent3 to-ws-accent px-4 py-1.5 text-xs font-extrabold text-[#1A0F00]">
                  <Check size={14} /> {tr("أضفها للمكتبة")}
                </button>
                <button type="button" onClick={() => setPaper(null)} className="flex items-center gap-1 text-xs font-semibold text-ws-muted hover:text-ws-text">
                  <X size={12} /> {tr("تجاهل")}
                </button>
              </>
            )}
          </div>
          <p className="text-[12px] text-ws-muted/80">{tr("الملخص من نص الورقة بالذكاء — راجعوا الأرقام بالأصل قبل ما تعتمدونها بالبحث.")}</p>
        </div>
      )}
    </div>
  );
}
