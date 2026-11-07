import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, FileUp, Loader2, PenLine, RotateCcw, Upload, X } from "lucide-react";
import clsx from "clsx";
import { readPaperFiles, type PaperReading } from "../../hooks/useProjectAgent";
import type { NewEvidencePaper } from "../../hooks/useEvidencePapers";
import type { EvidencePaper } from "../../data/types";
import { sectionLabelAr } from "./sectionLabelAr";
import { tr } from "../../lib/i18n";

/* «ارموا الدراسة»: ترمون PDF (أو صور صفحاتها) بأي مكان بمكتبة الأدلة، الوكيل يقراها،
   وتنضاف على طول للمكتبة وجدول الأدبيات بكل خاناتها (الدولة، الهدف، التصميم، العينة، جمع البيانات، النتيجة، الصلة).
   كذا ملف PDF مرة وحدة = كذا دراسة بالدور. الصور كلها مع بعض = دراسة وحدة (صفحاتها). وفيه «تراجع» لكل وحدة. */

type Status = "reading" | "saving" | "added" | "duplicate" | "failed" | "removed";
export interface DropItem {
  key: string;
  name: string;
  status: Status;
  paper?: PaperReading;
  paperId?: string;
  error?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

/** يقسم الملفات المرمية لدراسات: كل PDF دراسة، وكل الصور مع بعض دراسة وحدة */
export function splitStudies(files: File[]): { name: string; files: File[] }[] {
  const pdfs = files.filter(isPdf);
  const images = files.filter((f) => f.type.startsWith("image/"));
  const groups = pdfs.map((f) => ({ name: f.name, files: [f] }));
  if (images.length) groups.push({ name: images.length === 1 ? images[0].name : tr("{0} صور", images.length), files: images });
  return groups;
}

export function useStudyQueue({
  add,
  remove,
  existingTitles,
  addedById,
}: {
  add: (p: NewEvidencePaper) => Promise<{ error?: string; id?: string }>;
  remove: (id: string) => Promise<{ error?: string }>;
  existingTitles: string[];
  addedById: string;
}) {
  const [items, setItems] = useState<DropItem[]>([]);
  const queue = useRef<{ key: string; files: File[] }[]>([]);
  const running = useRef(false);
  const titles = useRef(existingTitles);
  titles.current = existingTitles;

  const patch = (key: string, p: Partial<DropItem>) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)));

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const job = queue.current.shift()!;
      const r = await readPaperFiles(job.files);
      if (!r.data) {
        patch(job.key, { status: "failed", error: r.message ?? tr("تعذّرت قراءة الورقة.") });
        continue;
      }
      const paper = r.data;
      if (paper.title && titles.current.some((t) => norm(t) === norm(paper.title))) {
        patch(job.key, { status: "duplicate", paper });
        continue;
      }
      patch(job.key, { status: "saving", paper });
      const saved = await add({
        title: paper.title || job.files[0].name.replace(/\.pdf$/i, ""),
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
        addedById,
      });
      if (saved.error) patch(job.key, { status: "failed", error: tr("قريناها بس ما انحفظت — جرّبوا مرة ثانية.") });
      else {
        titles.current = [...titles.current, paper.title];
        patch(job.key, { status: "added", paperId: saved.id });
      }
    }
    running.current = false;
  }, [add, addedById]);

  const addFiles = useCallback(
    (list: FileList | File[] | null | undefined) => {
      const files = list ? Array.from(list) : [];
      const groups = splitStudies(files);
      if (!groups.length) {
        if (files.length) setItems((prev) => [{ key: `bad-${Date.now()}`, name: files[0].name, status: "failed", error: tr("الملف لازم يكون PDF أو صور (JPG أو PNG).") }, ...prev]);
        return;
      }
      const fresh = groups.map((g, i) => ({ key: `${Date.now()}-${i}`, name: g.name, files: g.files }));
      setItems((prev) => [...fresh.map((g) => ({ key: g.key, name: g.name, status: "reading" as Status })), ...prev]);
      queue.current.push(...fresh.map((g) => ({ key: g.key, files: g.files })));
      void run();
    },
    [run],
  );

  const undo = async (it: DropItem) => {
    if (!it.paperId) return;
    const { error } = await remove(it.paperId);
    if (!error) patch(it.key, { status: "removed" });
  };
  const dismiss = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key));

  return { items, addFiles, undo, dismiss, busy: items.some((it) => it.status === "reading" || it.status === "saving") };
}

/** طبقة تغطي الصفحة وقت السحب: «ارموها هنا» */
export function usePageDrop(onFiles: (files: FileList) => void, enabled: boolean) {
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const overFn = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", overFn);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", overFn);
      window.removeEventListener("drop", drop);
    };
  }, [enabled, onFiles]);
  return over;
}

export function PageDropOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="sd-overlay" aria-hidden>
      <div className="sd-overlay-box">
        <Upload size={34} />
        <p className="m-0 text-[22px] font-extrabold text-[#F2EBE3]">{tr("ارموها هنا")}</p>
        <p className="m-0 text-[14px] text-[#E9D3B8]">{tr("نقراها ونعبّي جدول الأدبيات عنكم")}</p>
      </div>
    </div>
  );
}

const FIELDS: { key: keyof PaperReading; label: string }[] = [
  { key: "country", label: tr("الدولة") },
  { key: "aim", label: tr("الهدف") },
  { key: "studyDesign", label: tr("التصميم") },
  { key: "sampleAndSetting", label: tr("العينة") },
  { key: "dataCollection", label: tr("جمع البيانات") },
  { key: "keyFinding", label: tr("النتيجة") },
];

/** كرت «ارموا الدراسة هنا» + قائمة اللي انقرت */
export function StudyDropCard({
  items,
  onFiles,
  onUndo,
  onDismiss,
  onManual,
  pickRef,
}: {
  items: DropItem[];
  onFiles: (f: FileList | null) => void;
  onUndo: (it: DropItem) => void;
  onDismiss: (key: string) => void;
  onManual: () => void;
  /** زر «أضف دراسة» فوق يفتح نفس اختيار الملفات */
  pickRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hot, setHot] = useState(false);
  useEffect(() => {
    if (pickRef) pickRef.current = () => inputRef.current?.click();
  }, [pickRef]);

  return (
    <section className="sd-card" aria-labelledby="sd-h">
      <div
        className={clsx("sd-zone", hot && "hot")}
        onDragOver={(e) => {
          e.preventDefault();
          setHot(true);
        }}
        onDragLeave={() => setHot(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHot(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        <span className="sd-ic" aria-hidden>
          <FileUp size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="sd-h" className="m-0 text-[17px] font-extrabold text-[#F2EBE3]">
            {tr("ارموا الدراسة هنا")}
          </h2>
          <p className="m-0 mt-1 text-[14px] leading-relaxed text-[#E9D3B8]">{tr("PDF أو صور صفحاتها. نقراها ونحطها بالمكتبة وجدول الأدبيات بكل تفاصيلها. تقدرون ترمون كذا ملف مرة وحدة.")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" className="sd-pick" onClick={() => inputRef.current?.click()}>
            {tr("اختاروا ملف")}
          </button>
          <button type="button" className="sd-manual" onClick={onManual}>
            <PenLine size={15} aria-hidden />
            {tr("أو اكتبوها يدوي")}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="m-0 mt-3 list-none space-y-2 p-0" aria-live="polite">
          {items.map((it) => {
            const p = it.paper;
            const filled = p ? FIELDS.filter((f) => String(p[f.key] ?? "").trim()).length : 0;
            return (
              <li key={it.key} className={clsx("sd-item", it.status)}>
                <span className="sd-dot" aria-hidden>
                  {it.status === "reading" || it.status === "saving" ? <Loader2 size={16} className="animate-spin" /> : it.status === "added" ? <Check size={16} strokeWidth={3} /> : it.status === "removed" ? <RotateCcw size={15} /> : <X size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="sd-title" dir="auto">
                    {p?.title || it.name}
                  </p>
                  {it.status === "reading" && <p className="sd-sub">{tr("نقرا الدراسة… (عادةً أقل من دقيقة)")}</p>}
                  {it.status === "saving" && <p className="sd-sub">{tr("نحطها بالجدول…")}</p>}
                  {it.status === "added" && p && (
                    <>
                      <p className="sd-sub">
                        <bdi>{[p.authors, p.year].filter(Boolean).join(" · ")}</bdi>
                        {" · "}
                        {tr("بقسم «{0}»", sectionLabelAr[p.section])}
                      </p>
                      <p className="m-0 mt-1.5 flex flex-wrap gap-1.5">
                        {FIELDS.map((f) => (
                          <span key={f.key} className={clsx("sd-chip", !String(p[f.key] ?? "").trim() && "empty")}>
                            {f.label}
                          </span>
                        ))}
                      </p>
                      <p className="sd-sub">{filled === FIELDS.length ? tr("انضافت بكل خاناتها. راجعوا الأرقام بالأصل قبل ما تعتمدونها.") : tr("انضافت. {0} من {1} خانات انعبّت، كمّلوا الباقي من الجدول.", filled, FIELDS.length)}</p>
                    </>
                  )}
                  {it.status === "duplicate" && <p className="sd-sub">{tr("هذي الدراسة موجودة بمكتبتكم من قبل، ما أضفناها مرة ثانية.")}</p>}
                  {it.status === "removed" && <p className="sd-sub">{tr("تراجعنا وشلناها.")}</p>}
                  {it.status === "failed" && (
                    <p className="sd-sub !text-[#FF8A7A]" role="alert">
                      {it.error}
                    </p>
                  )}
                </div>
                <div className="sd-acts">
                  {it.status === "added" && (
                    <>
                      <Link to="/literature-review" className="sd-act">
                        {tr("بالجدول")}
                      </Link>
                      <button type="button" className="sd-act" onClick={() => onUndo(it)}>
                        {tr("تراجع")}
                      </button>
                    </>
                  )}
                  {it.status !== "reading" && it.status !== "saving" && (
                    <button type="button" className="sd-x" aria-label={tr("إخفاء")} onClick={() => onDismiss(it.key)}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
