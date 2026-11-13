import { useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, Plus } from "lucide-react";
import Card from "../ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useEvidencePapers } from "../../hooks/useEvidencePapers";
import { useSearchLog } from "../../hooks/useSearchLog";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { SEARCH_DATABASES, extractDois, extractTitleLines, resolveDoi, resolveTitle, scholarUrl, type ResolvedPaper } from "../../lib/scholarBridge";
import { tr } from "../../lib/i18n";

/** جسر قوقل سكولار: ما نقدر نبحث فيه من الموقع، لكن نفتحه لكم جاهز، نسجّل وش بحثتوا (والوكيل يعرفه)،
    وأي DOI أو عنوان تلصقونه يتحول لدراسة كاملة تنضاف للمكتبة. */
export default function ScholarBridgeCard({ suggestions }: { suggestions: string[] }) {
  const { currentUser, canWrite } = useAuth();
  const { roster } = useTeamRoster();
  const { rows, add } = useSearchLog();
  const { addPaper } = useEvidencePapers();
  const [query, setQuery] = useState(suggestions[0] ?? "");
  const [db, setDb] = useState<string>(SEARCH_DATABASES[0]);
  const [results, setResults] = useState("");
  const [selected, setSelected] = useState("");
  const [logMsg, setLogMsg] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<(ResolvedPaper & { on: boolean })[]>([]);
  const [saved, setSaved] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const nameOf = (id: string) => roster.find((m) => m.id === id)?.name.split(" ")[0] ?? "—";
  const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Math.max(0, Math.round(Number(v))));
  const field = "w-full rounded-xl border border-brand-100 bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand-300 focus:bg-paper";

  const logSearch = async () => {
    if (!currentUser || !query.trim()) return;
    const { error } = await add({ database: db, query, results: num(results), selected: num(selected) }, currentUser.id);
    setLogMsg(error ? tr("ما انسجّل البحث — حاولوا مرة ثانية.") : tr("انسجّل بحثكم."));
    if (!error) {
      setResults("");
      setSelected("");
    }
  };

  const convert = async () => {
    setBusy(true);
    setNote(null);
    setSaved(null);
    const dois = extractDois(pasted).slice(0, 10);
    const titles = extractTitleLines(pasted).slice(0, Math.max(0, 10 - dois.length));
    const out: ResolvedPaper[] = [];
    for (const d of dois) {
      const p = await resolveDoi(d);
      if (p) out.push(p);
    }
    let missed = 0;
    for (const t of titles) {
      const p = await resolveTitle(t);
      if (p && !out.some((o) => o.doi === p.doi)) out.push(p);
      else missed++;
    }
    setFound(out.map((p) => ({ ...p, on: true })));
    setBusy(false);
    setNote(out.length === 0 ? tr("ما قدرنا نتعرف على أي دراسة. ألصقوا رابط/DOI الدراسة أو عنوانها كاملًا.") : missed > 0 ? tr("{0} عنوان ما لقينا له تطابق دقيق — أضيفوه يدويًا من مكتبة الأدلة.", missed) : null);
  };

  const addSelected = async () => {
    if (!currentUser) return;
    let n = 0;
    for (const p of found.filter((x) => x.on)) {
      const { error } = await addPaper({
        title: p.title,
        authors: p.authors,
        year: p.year,
        theme: tr("عام") as never,
        studyDesign: "",
        keyFinding: "",
        relevance: "",
        section: "literature-review",
        addedById: currentUser.id,
        link: p.link || undefined,
      });
      if (!error) n++;
    }
    setSaved(n);
    setFound([]);
    setPasted("");
  };

  const chips = useMemo(() => suggestions.filter(Boolean).slice(0, 4), [suggestions]);

  return (
    <Card className="space-y-4" data-agent="scholar-bridge">
      <div>
        <p className="text-sm font-extrabold text-brand-950">{tr("قوقل سكولار — ابحثوا وسجّلوا هنا")}</p>
        <p className="mt-0.5 text-xs text-brand-950/55">{tr("قوقل ما يسمح بالبحث فيه من موقعنا، فنفتحه لكم جاهز بجملة البحث. بعد ما تبحثون: سجّلوا كم طلع وكم اخترتم (الوكيل يشوف سجلكم)، وألصقوا DOI أو عناوين الدراسات المختارة ونضيفها لمكتبتكم.")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-brand-950/70">{tr("1) جملة البحث")}</p>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button key={c} type="button" onClick={() => setQuery(c)} className="max-w-full truncate rounded-full border border-brand-200 px-3 py-1 text-[12px] font-semibold text-brand-800 hover:bg-surface-muted" dir="ltr" title={c}>
                {c}
              </button>
            ))}
          </div>
        )}
        <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={2} dir="ltr" className={field} placeholder='(delirium OR "early detection") AND nurses' />
        <a
          href={query.trim() ? scholarUrl(query, 2015) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!query.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          <ExternalLink size={13} /> {tr("افتحوه بقوقل سكولار (من 2015)")}
        </a>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-brand-950/70">{tr("2) سجّلوا بحثكم")}</p>
        <div className="grid grid-cols-3 gap-2">
          <select value={db} onChange={(e) => setDb(e.target.value)} className={field} aria-label={tr("القاعدة")}>
            {SEARCH_DATABASES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input value={results} onChange={(e) => setResults(e.target.value)} inputMode="numeric" className={field} placeholder={tr("كم نتيجة طلعت")} />
          <input value={selected} onChange={(e) => setSelected(e.target.value)} inputMode="numeric" className={field} placeholder={tr("كم اخترتم")} />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={logSearch} disabled={!canWrite || !query.trim()} className="rounded-full border border-brand-300 px-4 py-1.5 text-xs font-bold text-brand-800 hover:bg-surface-muted disabled:opacity-50">
            {tr("سجّلوا")}
          </button>
          {logMsg && <span className="text-xs text-brand-950/60">{logMsg}</span>}
        </div>
        {rows.length > 0 && (
          <ul className="space-y-1 text-[12px] text-brand-950/60">
            {rows.slice(0, 5).map((r) => (
              <li key={r.id} className="truncate">
                <b className="text-brand-950/80">{r.database}</b> · {r.results ?? "؟"} → {r.selected ?? "؟"} · {nameOf(r.by)} · <span dir="ltr">{r.query}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-brand-950/70">{tr("3) ألصقوا الدراسات اللي اخترتوها")}</p>
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4} dir="ltr" className={field} placeholder={"https://doi.org/10.1016/j.ijnurstu.2019.103456\nKnowledge and practice of nurses toward early delirium detection"} />
        <p className="text-[12px] text-brand-950/45">{tr("من نتيجة قوقل سكولار: افتحوا الدراسة وانسخوا رابطها أو DOI، أو انسخوا عنوانها. سطر لكل دراسة (حتى 10).")}</p>
        <button type="button" onClick={convert} disabled={busy || pasted.trim().length < 10} className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 px-4 py-1.5 text-xs font-bold text-brand-800 hover:bg-surface-muted disabled:opacity-50">
          {busy && <Loader2 size={13} className="animate-spin" />}
          {tr("تعرّف عليها")}
        </button>
        {note && <p className="text-xs text-brand-950/60">{note}</p>}
        {found.length > 0 && (
          <div className="space-y-2">
            <ul className="space-y-1.5">
              {found.map((p, i) => (
                <li key={p.doi || p.title} className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs">
                  <input type="checkbox" checked={p.on} onChange={() => setFound((f) => f.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))} className="mt-0.5" />
                  <span dir="ltr" className="text-start">
                    <b className="text-brand-950">{p.title}</b>
                    <span className="block text-brand-950/60">
                      {p.authors} ({p.year}) {p.journal && `· ${p.journal}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={addSelected} disabled={!canWrite || !found.some((f) => f.on)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              <Plus size={13} /> {tr("أضيفوا المحدد لمكتبة الأدلة")}
            </button>
          </div>
        )}
        {saved !== null && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#FFC777]">
            <Check size={15} /> {tr("انضافت {0} دراسة لمكتبتكم. كمّلوا بياناتها (العينة، الهدف…) برفع الورقة أو يدويًا.", saved)}
          </p>
        )}
      </div>
    </Card>
  );
}
