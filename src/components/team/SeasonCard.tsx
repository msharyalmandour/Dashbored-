import { useState } from "react";
import { CalendarRange, Trash2 } from "lucide-react";
import { useAcademicCalendar } from "../../hooks/useAcademicCalendar";
import { useAuth } from "../../context/AuthContext";
import { formatDateShort } from "../../lib/date";
import { seasonOf, type SeasonKind } from "../../lib/season";
import { tr } from "../../lib/i18n";

/* «مواسم الكلية» (B01Seasons): الاختبارات والتدريب والتسليمات — ويسي يخفف المهام أيام الاختبار ويظلم مكتبه قبل التسليم */
const KINDS: { k: SeasonKind; label: string }[] = [
  { k: "exam", label: tr("اختبارات") },
  { k: "training", label: tr("تدريب ميداني") },
  { k: "deadline", label: tr("تسليم") },
];

export default function SeasonCard() {
  const { team } = useAuth();
  const { events, available, add, remove } = useAcademicCalendar();
  const [kind, setKind] = useState<SeasonKind>("exam");
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  if (!available) return null;
  const s = seasonOf(events);
  return (
    <section className="lx-card lx-in" aria-labelledby="season-h">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.07] text-ws-accent3" aria-hidden>
          <CalendarRange size={17} />
        </span>
        <b id="season-h" className="flex-1 text-lg">
          {tr("مواسم الكلية")}
        </b>
      </div>
      <p className="m-0 mt-1 text-sm text-ws-muted">{s.line ?? tr("حطوا الاختبارات والتدريب والتسليمات، وويسي يرتب الضغط حسبها.")}</p>
      <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
        {events.map((e) => (
          <li key={e.id} className="flex min-h-[44px] items-center gap-3 rounded-2xl bg-black/20 px-3">
            <span className="text-xs font-extrabold text-ws-accent3">{KINDS.find((x) => x.k === e.kind)?.label}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{e.title}</span>
            <span className="text-xs text-ws-muted">
              {formatDateShort(e.startsOn)}
              {e.endsOn ? ` – ${formatDateShort(e.endsOn)}` : ""}
            </span>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-ws-muted hover:text-[#FF8A7A]" aria-label={tr("احذفوا {0}", e.title)} onClick={() => void remove(e.id)}>
              <Trash2 size={15} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!title.trim() || !from) return;
          if (await add({ kind, title: title.trim(), startsOn: from, endsOn: to || null }, team?.university ?? "")) {
            setTitle("");
            setFrom("");
            setTo("");
          }
        }}
      >
        <select className="dc-extra-in" value={kind} onChange={(e) => setKind(e.target.value as SeasonKind)} aria-label={tr("نوع الحدث")}>
          {KINDS.map((x) => (
            <option key={x.k} value={x.k}>
              {x.label}
            </option>
          ))}
        </select>
        <input className="dc-extra-in min-w-[140px] flex-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("مثال: اختبارات منتصف الفصل")} aria-label={tr("اسم الحدث")} maxLength={120} />
        <input className="dc-extra-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={tr("من")} />
        {kind !== "deadline" && <input className="dc-extra-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={tr("إلى")} />}
        <button type="submit" className="lx-ghost" disabled={!title.trim() || !from}>
          {tr("أضيفوه")}
        </button>
      </form>
    </section>
  );
}
