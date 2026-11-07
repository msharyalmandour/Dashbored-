import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTasksData } from "../../hooks/useTasksData";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { placeOf } from "../../lib/taskLinks";
import { addDaysISO, formatDateShort } from "../../lib/date";
import { tr } from "../../lib/i18n";

/** شريط فوق محرر القسم: مين مسؤول عنه، ومهامه المربوطة، وإضافة مهمة له بضغطة.
    المهام تنربط بالقسم من خانة section_key (أو من عنوانها لو قديمة). */
export default function SectionTasks({ sectionKey, ownerId, onOwner }: { sectionKey: string; ownerId: string; onOwner: (id: string | null) => void }) {
  const { isLeader, canWrite, currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const { tasks, addTask } = useTasksData();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = tasks.filter((t) => placeOf(t)?.key === sectionKey && !/^تذكير/.test(t.title));
  const open = mine.filter((t) => t.status !== "done");
  const owner = roster.find((m) => m.id === ownerId);
  const first = (id: string) => roster.find((m) => m.id === id)?.name.split(" ")[0] ?? "";

  const add = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    const { error } = await addTask({ title: title.trim(), description: "", assigneeId: ownerId || currentUser?.id || "", dueDate: addDaysISO(new Date().toISOString().slice(0, 10), 7), priority: "medium", sectionKey });
    setBusy(false);
    if (!error) {
      setTitle("");
      setAdding(false);
    }
  };

  return (
    <div className="st-bar">
      <div className="flex flex-wrap items-center gap-2">
        <UserRound size={15} className="text-[#FFC777]" aria-hidden />
        {isLeader && canWrite ? (
          <label className="flex items-center gap-2 text-[13px]">
            <span className="text-[#ABA095]">{tr("مسؤول القسم:")}</span>
            <select value={ownerId} onChange={(e) => onOwner(e.target.value || null)} className={`st-owner${ownerId ? "" : " empty"}`} aria-label={tr("مسؤول القسم")}>
              <option value="">{tr("ما أحد (اختاروا)")}</option>
              {roster.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-[13px] text-[#E9D3B8]">{owner ? tr("مسؤول القسم: {0}", owner.name) : tr("القسم بدون مسؤول، القائد يحدده")}</span>
        )}
        <span className="ms-auto text-[13px] text-[#ABA095]">{mine.length ? tr("{0} مهام · {1} مفتوحة", mine.length, open.length) : tr("ما فيه مهام لهالقسم")}</span>
      </div>
      {mine.length > 0 && (
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
          {mine.slice(0, 6).map((t) => (
            <li key={t.id}>
              <Link to={`/tasks?task=${t.id}`} className={`st-task${t.status === "done" ? " done" : ""}`} dir="auto">
                {t.status === "done" && <Check size={12} strokeWidth={3} aria-hidden />}
                <span className="truncate">{t.title}</span>
                <span className="text-[#ABA095]">
                  · {first(t.assigneeId)} · {formatDateShort(t.dueDate)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {canWrite &&
        (adding ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={tr("مثال: اكتبوا أول فقرة بهالقسم")} aria-label={tr("عنوان المهمة")} className="st-input" autoFocus />
            <button type="button" className="st-add" onClick={add} disabled={!title.trim() || busy}>
              {busy ? tr("لحظة…") : tr("أضيفوها")}
            </button>
          </div>
        ) : (
          <button type="button" className="st-more" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden />
            {tr("مهمة لهالقسم")}
          </button>
        ))}
    </div>
  );
}
