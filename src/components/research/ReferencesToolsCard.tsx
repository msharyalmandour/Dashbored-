import { useRef, useState } from "react";
import { AlertTriangle, Check, Download, FileUp, ListChecks } from "lucide-react";
import clsx from "clsx";
import { glassCard } from "../ui/researchUi";
import { useAuth } from "../../context/AuthContext";
import { useProposal } from "../../hooks/useProposal";
import type { EvidencePaper } from "../../data/types";
import { checkCitations, parseReferences, sameStudy, toBibtex, toRis, type CitationCheck, type RefEntry } from "../../lib/referenceIO";
import { tr } from "../../lib/i18n";

type Add = (p: {
  title: string;
  authors: string;
  year: number;
  theme: EvidencePaper["theme"];
  studyDesign: string;
  keyFinding: string;
  relevance: string;
  section: EvidencePaper["section"];
  addedById: string;
  link?: string;
}) => Promise<{ error?: string }>;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** أدوات المراجع: استيراد من Zotero/Mendeley/EndNote (BibTeX أو RIS)، تصدير لنفس الصيغ، وفحص تطابق الاستشهادات بنص المقترح مع المكتبة.
    للمصمم: التنسيق هنا فقط؛ المنطق بـ lib/referenceIO.ts. */
export default function ReferencesToolsCard({ papers, addPaper }: { papers: EvidencePaper[]; addPaper: Add }) {
  const { currentUser, canWrite } = useAuth();
  const { sections } = useProposal();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [found, setFound] = useState<(RefEntry & { on: boolean; dup: boolean })[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [check, setCheck] = useState<CitationCheck | null>(null);

  const parse = (text: string) => {
    setMsg(null);
    const list = parseReferences(text);
    if (list.length === 0) return setMsg(tr("ما لقينا مراجع بالنص. صدّروا من Zotero أو Mendeley بصيغة BibTeX أو RIS وارفعوا الملف."));
    setFound(list.slice(0, 200).map((e) => {
      const dup = papers.some((p) => sameStudy(e, p));
      return { ...e, dup, on: !dup };
    }));
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    parse(await f.text());
    if (fileRef.current) fileRef.current.value = "";
  };

  const addSelected = async () => {
    if (!currentUser) return;
    let n = 0;
    for (const e of found.filter((x) => x.on)) {
      const { error } = await addPaper({
        title: e.title,
        authors: e.authors,
        year: e.year ?? new Date().getFullYear(),
        theme: tr("عام") as never,
        studyDesign: "",
        keyFinding: "",
        relevance: "",
        section: "literature-review",
        addedById: currentUser.id,
        link: e.doi ? `https://doi.org/${e.doi}` : e.url || undefined,
      });
      if (!error) n++;
    }
    setFound([]);
    setPasted("");
    setMsg(tr("انضافت {0} دراسة للمكتبة.", n));
  };

  const runCheck = () => setCheck(checkCitations(sections.map((s) => s.content ?? ""), papers));
  const btn = "flex items-center gap-1.5 rounded-full border border-white/[0.14] px-3.5 py-1.5 text-xs font-semibold text-[#B8ADA2] transition hover:border-[#FF8A24]/50 hover:text-[#F4F0EC] disabled:opacity-40";

  return (
    <div className={clsx(glassCard, "space-y-3 p-5")} data-agent="references-tools">
      <div>
        <p className="text-sm font-extrabold text-[#F4F0EC]">{tr("المراجع: استيراد وتصدير وفحص")}</p>
        <p className="mt-0.5 text-xs text-[#B8ADA2]">{tr("تستخدمون Zotero أو Mendeley؟ استوردوا مراجعكم بملف BibTeX/RIS بدل الكتابة من جديد، وصدّروا مكتبتكم لهم، وافحصوا إن كل استشهاد بنصكم له مرجع.")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canWrite} onClick={() => fileRef.current?.click()} className={btn}>
          <FileUp size={13} /> {tr("استيراد ملف (BibTeX / RIS)")}
        </button>
        <input ref={fileRef} type="file" accept=".bib,.ris,.txt,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" disabled={papers.length === 0} onClick={() => download("wesync-references.bib", toBibtex(papers))} className={btn}>
          <Download size={13} /> BibTeX
        </button>
        <button type="button" disabled={papers.length === 0} onClick={() => download("wesync-references.ris", toRis(papers))} className={btn}>
          <Download size={13} /> RIS
        </button>
        <button type="button" onClick={runCheck} className={btn}>
          <ListChecks size={13} /> {tr("افحصوا الاستشهادات بالمقترح")}
        </button>
      </div>

      <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} onBlur={() => pasted.trim().length > 20 && parse(pasted)} rows={2} dir="ltr" placeholder={tr("أو الصقوا محتوى BibTeX/RIS هنا")} className="w-full rounded-2xl border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs text-[#F4F0EC] outline-none placeholder:text-[#B8ADA2]/60 focus:border-[#FF8A24]/60" />

      {msg && <p className="text-xs text-[#E6DBD1]">{msg}</p>}

      {found.length > 0 && (
        <div className="space-y-2">
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {found.map((e, i) => (
              <li key={`${e.title}-${i}`} className="flex items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs">
                <input type="checkbox" checked={e.on} onChange={() => setFound((f) => f.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))} className="mt-0.5" />
                <span dir="ltr" className="text-start text-[#E6DBD1]">
                  <b>{e.title}</b>
                  <span className="block text-[#B8ADA2]">
                    {e.authors} ({e.year ?? "—"}) {e.journal && `· ${e.journal}`}
                  </span>
                  {e.dup && <span className="text-[#FFB444]">{tr("موجودة بالمكتبة")}</span>}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addSelected} disabled={!canWrite || !found.some((x) => x.on)} className="rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-4 py-1.5 text-xs font-extrabold text-[#1A0F00] disabled:opacity-50">
            {tr("أضيفوا المحدد ({0})", found.filter((x) => x.on).length)}
          </button>
        </div>
      )}

      {check && (
        <div className="space-y-2 rounded-2xl border border-white/[0.12] p-3 text-xs">
          <p className="flex items-center gap-1.5 font-bold text-[#F4F0EC]">
            {check.missing.length === 0 ? <Check size={14} className="text-[#7fd6a0]" /> : <AlertTriangle size={14} className="text-[#FFB444]" />}
            {tr("{0} استشهاد مطابق لمكتبتكم", check.matched)}
          </p>
          {check.missing.length > 0 && (
            <div>
              <p className="font-semibold text-[#FFB444]">{tr("مذكورة بالنص وما لها مرجع بالمكتبة:")}</p>
              <p dir="ltr" className="text-start text-[#E6DBD1]">{check.missing.map((c) => c.raw).join(" · ")}</p>
            </div>
          )}
          {check.uncited.length > 0 && (
            <div>
              <p className="font-semibold text-[#B8ADA2]">{tr("بالمكتبة وما انذكرت بالنص:")}</p>
              <p dir="ltr" className="text-start text-[#E6DBD1]">{check.uncited.map((p) => `${p.authors.split(",")[0]} (${p.year})`).join(" · ")}</p>
            </div>
          )}
          <p className="text-[11px] text-[#B8ADA2]/80">{tr("الفحص يقرأ صيغة APA بالنص (Devon, 2010) و(Devon et al., 2010) ويطابق أول مؤلف والسنة. مراجعتكم النهائية تبقى مع المشرف/ة.")}</p>
        </div>
      )}
    </div>
  );
}
