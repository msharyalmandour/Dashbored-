import { useMemo, useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
import Card from "../ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useTasksData } from "../../hooks/useTasksData";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { addDaysISO, toISODate } from "../../lib/date";
import { splitKeywords, taskTextFor } from "../../lib/keywordSplit";
import { tr } from "../../lib/i18n";

const DATABASES = ["PubMed", "Google Scholar"];
const TARGET = 5;

/** «وزّعوا البحث على الفريق»: الكلمات المفتاحية تنقسم بين الأعضاء، ولكل عضو مهمة بكلماته وجملة بحث جاهزة.
    القائدة تراجع التقسيم وتوافق، وما ينشأ شي قبل الضغط. */
export default function SplitKeywordsCard({ terms }: { terms: string[] }) {
  const { isLeader, canWrite, currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const { addTask } = useTasksData();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const groups = useMemo(() => splitKeywords(terms, roster.map((m) => m.id)), [terms, roster]);
  const nameOf = (id: string) => roster.find((m) => m.id === id)?.name.split(" ")[0] ?? "—";

  if (!isLeader || !canWrite || groups.length === 0) return null;

  const create = async () => {
    setBusy(true);
    setError(false);
    let created = 0;
    for (const g of groups) {
      const t = taskTextFor(g.terms, DATABASES, TARGET);
      const { error: e } = await addTask({ ...t, assigneeId: g.memberId, dueDate: addDaysISO(toISODate(new Date()), 7), priority: "medium" });
      if (e) setError(true);
      else created++;
    }
    setBusy(false);
    setDone(created);
  };

  return (
    <Card className="space-y-3" data-agent="split-keywords">
      <div>
        <p className="flex items-center gap-2 text-sm font-extrabold text-brand-950">
          <Users size={16} className="text-brand-500" />
          {tr("وزّعوا البحث على الفريق")}
        </p>
        <p className="mt-0.5 text-xs text-brand-950/55">{tr("كل عضو ياخذ مجموعة كلمات مختلفة ويبحث بها في {0}، ويضيف أقرب الدراسات لمكتبة الأدلة. تنفتح له مهمة بصفحة «مهامي» موعدها بعد أسبوع.", DATABASES.join(" و"))}</p>
      </div>
      <ul className="space-y-1.5">
        {groups.map((g) => (
          <li key={g.memberId} className="rounded-xl bg-surface-muted px-3 py-2 text-xs">
            <b className="text-brand-950">{g.memberId === currentUser?.id ? tr("{0} (أنت)", nameOf(g.memberId)) : nameOf(g.memberId)}</b>
            <span dir="ltr" className="mt-0.5 block text-start font-mono text-[11px] text-brand-950/70">
              {g.terms.join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      {done !== null ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <Check size={15} /> {tr("انفتحت {0} مهام بصفحة مهامي.", done)}
          {error && <span className="text-xs text-rose-600">{tr(" (بعضها ما انحفظ — جرّبوا مرة ثانية)")}</span>}
        </p>
      ) : (
        <button type="button" onClick={create} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 size={14} className="animate-spin" />}
          {tr("وافقوا وأنشئوا المهام")}
        </button>
      )}
    </Card>
  );
}
