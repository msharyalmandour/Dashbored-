import { useRef, useState } from "react";
import { FileUp, Loader2, MessageCircleQuestion, Send, X } from "lucide-react";
import { useResearchAgent } from "../../hooks/useResearchAgent";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

const quickQuestions = [
  "وش حجم العينة وكيف اختاروها؟",
  "وش الأداة اللي استخدموها؟",
  "وش حدود الدراسة (Limitations)؟",
  "كيف تفيد بحثنا؟",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("تعذّر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

/** «اسألي عن هذي الدراسة» — يجاوب من الملخص المتوفر، أو من ملف PDF ترفعه
    الطالبة (Claude يقرأ الـ PDF مباشرة). الجواب مقيّد بالمادة المرفقة. */
export default function PaperQA({
  title,
  abstract,
  keyFinding,
  relevance,
  projectTitle,
  allowPdf = false,
}: {
  title: string;
  abstract?: string;
  keyFinding?: string;
  relevance?: string;
  projectTitle?: string;
  allowPdf?: boolean;
}) {
  const { busy, askPaper } = useResearchAgent();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [answers, setAnswers] = useState<{ q: string; a: string; usedPdf: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasMaterial = !!(pdf || abstract);

  const send = async (override?: string) => {
    const q = (override ?? question).trim();
    if (!q || busy) return;
    setError(null);
    let pdfBase64: string | undefined;
    if (pdf) {
      try {
        pdfBase64 = await fileToBase64(pdf);
      } catch {
        setError("تعذّر قراءة الملف — جربوا ملف ثاني.");
        return;
      }
    }
    const r = await askPaper({ question: q, title, abstract, keyFinding, relevance, projectTitle, pdfBase64 });
    if (r.message) {
      setError(r.message);
      return;
    }
    setAnswers((prev) => [...prev, { q, a: r.answer, usedPdf: r.usedPdf }]);
    setQuestion("");
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("الملف لازم يكون PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("الـ PDF أكبر من ٥ ميجا — جربوا ملف أصغر.");
      return;
    }
    setError(null);
    setPdf(file);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-brand-600 hover:bg-surface-muted"
      >
        <MessageCircleQuestion size={13} />
        اسألوا عن هذي الدراسة
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2.5 rounded-2xl border border-brand-100 bg-surface-muted/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-brand-950/70">اسألوا عن الدراسة</p>
        <button onClick={() => setOpen(false)} className="rounded-md p-1 text-brand-950/40 hover:bg-paper">
          <X size={14} />
        </button>
      </div>

      {answers.map((a, i) => (
        <div key={i} className="space-y-1.5">
          <p className="ms-auto w-fit max-w-[92%] rounded-2xl bg-brand-500 px-3 py-1.5 text-xs text-white">{a.q}</p>
          <p className="max-w-[96%] whitespace-pre-wrap rounded-2xl bg-paper px-3 py-2 text-xs leading-relaxed text-brand-950/80">
            {a.a}
            <span className="mt-1.5 block text-[10px] text-brand-950/35">
              {a.usedPdf ? "من ملف الـ PDF" : "من ملخص الدراسة فقط"}
            </span>
          </p>
        </div>
      ))}

      {!hasMaterial && (
        <p className="rounded-xl bg-amber-accent-50 px-3 py-2 text-[11px] font-semibold text-amber-accent-700">
          ما فيه ملخص محفوظ لهذي الدراسة — ارفعوا ملف PDF لها وأجاوب منه.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {quickQuestions.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={busy || !hasMaterial}
            className="rounded-full border border-brand-100 bg-paper px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {allowPdf && (
          <>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={onPick} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              title="ارفعوا PDF للدراسة (حتى ٥ ميجا)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-paper text-brand-950/50 hover:bg-brand-50"
            >
              <FileUp size={15} />
            </button>
          </>
        )}
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتبوا سؤالكم عن الدراسة..."
          className="min-w-0 flex-1 rounded-xl border border-brand-100 bg-paper px-3 py-2 text-xs outline-none focus:border-brand-300"
        />
        <button
          onClick={() => send()}
          disabled={busy || !question.trim() || !hasMaterial}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
      {pdf && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-950/55">
          <FileUp size={11} />
          {pdf.name}
          <button onClick={() => setPdf(null)} className="text-rose-500 hover:underline">
            إزالة
          </button>
        </p>
      )}
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
