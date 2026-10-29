import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import Dialog from "../ui/Dialog";
import { num } from "../v3/WriteHeader";
import type { Interview, InterviewInput, InterviewMode, InterviewStatus } from "../../hooks/useInterviews";
import { relativeDayLabel, toISODate } from "../../lib/date";
import { tr } from "../../lib/i18n";

/* سجل المقابلات: صف لكل مقابلة (الرمز · التاريخ · المدة · الطريقة · الحالة · مواضيع جديدة)، وإضافة بنافذة صغيرة.
   رمز المشارك بدل اسمه (P1، P2…) عشان سرية المشاركين. */

export const STATUS_LABEL: Record<InterviewStatus, string> = {
  planned: tr("مجدولة"),
  done: tr("انعملت"),
  transcribed: tr("انفرّغت"),
  coded: tr("انرمّزت"),
};
const STATUS_CLASS: Record<InterviewStatus, string> = { planned: "todo", done: "doing", transcribed: "doing", coded: "done" };
const MODE_LABEL: Record<InterviewMode, string> = { in_person: tr("حضوري"), phone: tr("جوال"), online: tr("أونلاين") };

const nextCode = (list: Interview[]) => {
  const max = list.reduce((m, i) => Math.max(m, Number(/^P(\d+)$/i.exec(i.code.trim())?.[1] ?? 0)), 0);
  return `P${max + 1}`;
};

export default function InterviewLog({
  interviews,
  canWrite,
  onAdd,
  onUpdate,
  onRemove,
}: {
  interviews: Interview[];
  canWrite: boolean;
  onAdd: (i: InterviewInput) => Promise<{ error?: string }>;
  onUpdate: (id: string, patch: Partial<InterviewInput>) => Promise<{ error?: string }>;
  onRemove: (id: string) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const blank = (): InterviewInput => ({ code: nextCode(interviews), date: toISODate(new Date()), durationMin: null, mode: "in_person", status: "done", newThemes: null, notes: "" });
  const [form, setForm] = useState<InterviewInput>(blank);

  const openForm = () => {
    setForm(blank());
    setErr(null);
    setOpen(true);
  };
  const save = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    const { error } = await onAdd({ ...form, code: form.code.trim() });
    setSaving(false);
    if (error) setErr(error);
    else setOpen(false);
  };
  const confirmRemove = async (i: Interview) => {
    if (!window.confirm(tr("تحذفون مقابلة {0} من السجل؟", i.code))) return;
    await onRemove(i.id);
  };

  return (
    <div>
      {interviews.length === 0 ? (
        <div className="v3-g2 px-4 py-3.5 text-sm">
          <p className="m-0 font-bold">{tr("ما فيه مقابلات بالسجل للحين")}</p>
          <p className="v3-mut m-0 mt-1 text-[13px]">{tr("سجّلوا كل مقابلة برمز المشارك (P1، P2…) بدل اسمه، وعدد المواضيع الجديدة اللي طلعت فيها عشان تعرفون متى توصلون للتشبّع.")}</p>
        </div>
      ) : (
        <>
          <div className="v3-mut hidden grid-cols-[56px_minmax(0,1fr)_80px_80px_120px_70px_44px] gap-3 px-1.5 pb-1.5 text-xs sm:grid" aria-hidden>
            <span>{tr("الرمز")}</span>
            <span>{tr("التاريخ")}</span>
            <span>{tr("المدة")}</span>
            <span>{tr("الطريقة")}</span>
            <span>{tr("الحالة")}</span>
            <span>{tr("مواضيع جديدة")}</span>
            <span />
          </div>
          <ul className="m-0 list-none p-0" aria-label={tr("سجل المقابلات")}>
            {interviews.map((i) => (
              <li
                key={i.id}
                className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-white/[0.07] px-1.5 py-[11px] text-sm sm:grid-cols-[56px_minmax(0,1fr)_80px_80px_120px_70px_44px]"
              >
                <span className="v3-k text-[15px]" dir="ltr">
                  {i.code}
                </span>
                <span className="v3-mut text-[13px] sm:text-sm">{i.date ? relativeDayLabel(i.date) : "—"}</span>
                <span className="v3-mut text-[13px] sm:text-sm">{i.durationMin ? tr("{0} د", num(i.durationMin)) : "—"}</span>
                <span className="v3-mut col-start-2 text-[13px] sm:col-start-auto sm:text-sm">{MODE_LABEL[i.mode]}</span>
                {canWrite ? (
                  <select
                    value={i.status}
                    onChange={(e) => onUpdate(i.id, { status: e.target.value as InterviewStatus })}
                    className={clsx("v3-st w-fit cursor-pointer border-0 text-xs [color-scheme:dark]", STATUS_CLASS[i.status])}
                    aria-label={tr("حالة مقابلة {0}", i.code)}
                  >
                    {(Object.keys(STATUS_LABEL) as InterviewStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={clsx("v3-st w-fit text-xs", STATUS_CLASS[i.status])}>{STATUS_LABEL[i.status]}</span>
                )}
                <span className="text-[13px] sm:text-sm">{i.newThemes ?? "—"}</span>
                {canWrite ? (
                  <button type="button" onClick={() => confirmRemove(i)} className="grid h-11 w-11 place-items-center rounded-full text-[var(--ws-c-muted)] hover:bg-white/[0.07] hover:text-[var(--ws-c-text)]" aria-label={tr("احذف مقابلة {0}", i.code)}>
                    <Trash2 size={15} aria-hidden />
                  </button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {canWrite && (
        <button type="button" className="v3-bd mt-3 !min-h-[44px] !text-sm" onClick={openForm}>
          <Plus size={16} aria-hidden />
          {tr("سجّلوا مقابلة")}
        </button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={tr("مقابلة جديدة")}>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("رمز المشارك")}
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="v3-select w-full" dir="ltr" maxLength={20} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("التاريخ")}
            <input type="date" value={form.date ?? ""} onChange={(e) => setForm({ ...form, date: e.target.value || null })} className="v3-select w-full [color-scheme:dark]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("المدة (دقيقة)")}
            <input type="number" min={0} max={600} inputMode="numeric" value={form.durationMin ?? ""} onChange={(e) => setForm({ ...form, durationMin: e.target.value === "" ? null : Math.max(0, Math.min(600, Number(e.target.value))) })} className="v3-select w-full" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("الطريقة")}
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as InterviewMode })} className="v3-select w-full [color-scheme:dark]">
              {(Object.keys(MODE_LABEL) as InterviewMode[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("الحالة")}
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InterviewStatus })} className="v3-select w-full [color-scheme:dark]">
              {(Object.keys(STATUS_LABEL) as InterviewStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("مواضيع جديدة")}
            <input type="number" min={0} max={200} inputMode="numeric" value={form.newThemes ?? ""} onChange={(e) => setForm({ ...form, newThemes: e.target.value === "" ? null : Math.max(0, Math.min(200, Number(e.target.value))) })} className="v3-select w-full" />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5 text-sm font-bold">
            {tr("ملاحظات (اختياري، بدون أسماء)")}
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="v3-select w-full" maxLength={1000} />
          </label>
        </div>
        {err && (
          <p className="m-0 mt-3 text-sm text-[var(--ws-c-late)]" role="alert">
            {err}
          </p>
        )}
        <button type="button" className="v3-bw mt-4 w-full" onClick={save} disabled={saving || !form.code.trim()}>
          {saving ? tr("نحفظ…") : tr("احفظ المقابلة")}
        </button>
      </Dialog>
    </div>
  );
}
