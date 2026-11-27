import { useMemo, useState } from "react";
import { WSpin } from "../brand/WLogo";
import { Check, Users } from "lucide-react";
import SuggestCard from "../agent/SuggestCard";
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
    <SuggestCard
      data-agent="split-keywords"
      icon={Users}
      title={tr("وزّعوا البحث على الفريق")}
      body={tr("كل عضو ياخذ مجموعة كلمات مختلفة ويبحث بها في {0}، ويضيف أقرب الدراسات لمكتبة الأدلة. تنفتح له مهمة بصفحة «مهامي» موعدها بعد أسبوع.", DATABASES.join(" و"))}
    >
      <ul className="space-y-1.5">
        {groups.map((g) => (
          <li key={g.memberId} className="rounded-xl bg-surface-muted px-3 py-2 text-xs">
            <b className="text-brand-950">{g.memberId === currentUser?.id ? tr("{0} (أنت)", nameOf(g.memberId)) : nameOf(g.memberId)}</b>
            <span dir="ltr" className="mt-0.5 block text-start font-mono text-xs text-brand-950/70">
              {g.terms.join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      {done !== null ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ws-accent3">
          <Check size={15} /> {tr("انفتحت {0} مهام بصفحة مهامي.", done)}
          {error && <span className="text-xs text-rose-600">{tr(" (بعضها ما انحفظ — جرّبوا مرة ثانية)")}</span>}
        </p>
      ) : (
        <button type="button" onClick={create} disabled={busy} className="ws-btn-primary">
          {busy && <WSpin size={14} />}
          {tr("وافقوا وأنشئوا المهام")}
        </button>
      )}
    </SuggestCard>
  );
}
