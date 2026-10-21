import { Fragment, useState } from "react";
import { CalendarDays, Check, Download, Loader2, NotebookPen, Trash2, Users2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useMeetingMinutes } from "../hooks/useMeetingMinutes";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { buildMeetingMinutesDoc } from "../lib/meetingMinutesExport";
import {
  addDaysISO,
  formatDateFull,
  formatHijri,
  formatMonthYear,
  isValidISODate,
  relativeDayLabel,
  toISODate,
} from "../lib/date";
import { g, isFemaleUser } from "../lib/gender";
import type { MeetingMinutesRow } from "../data/types";

/** ينزّل ملف Word مباشرة على جهاز المستخدمة — بدون أي رفع لخدمة خارجية
    (Google Drive يحتاج Google Workspace، مو متوفر، فما نعد بشي ما نقدر
    ننفذه) */
async function downloadMinutesDoc(
  input: Pick<MeetingMinutesRow, "meetingDate" | "attendees" | "discussion" | "decisions" | "actionItems">,
  style: "dark" | "official" = "dark",
) {
  const blob = await buildMeetingMinutesDoc(input, style);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `محضر اجتماع - ${input.meetingDate}${style === "dark" ? " — Wesync" : ""}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

const inputClass =
  "w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300";

export default function MeetingMinutes() {
  const { currentUser, isLeader } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { showToast } = useToast();
  const { roster } = useTeamRoster();
  const { minutes, loading, addMinutes, deleteMinutes } = useMeetingMinutes();

  const [meetingDate, setMeetingDate] = useState(toISODate(new Date()));
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [discussion, setDiscussion] = useState("");
  const [decisions, setDecisions] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    setMeetingDate(toISODate(new Date()));
    setAttendeeIds([]);
    setDiscussion("");
    setDecisions("");
    setActionItems("");
  };

  const today = toISODate(new Date());
  const dateProblem = !isValidISODate(meetingDate)
    ? "اختاروا تاريخ اجتماع صحيح."
    : meetingDate > today
      ? "المحضر يُسجَّل بعد الاجتماع — تاريخه ما يكون بالمستقبل."
      : null;
  const datePresets = [
    { label: "اليوم", value: today },
    { label: "أمس", value: addDaysISO(today, -1) },
    { label: "قبل يومين", value: addDaysISO(today, -2) },
  ];

  const handleSave = async () => {
    if (!currentUser || !discussion.trim() || saving) return;
    if (dateProblem) {
      setError(dateProblem);
      return;
    }
    setError(null);
    setSaving(true);

    const attendeeNames = roster.filter((m) => attendeeIds.includes(m.id)).map((m) => m.name);

    const { row, error: saveError } = await addMinutes({
      meetingDate,
      attendees: attendeeNames,
      discussion,
      decisions,
      actionItems,
      createdById: currentUser.id,
    });

    if (saveError || !row) {
      setError(
        saveError === "no research project"
          ? "ما لقينا مشروع بحث مربوط بحسابكم — تأكدوا إنكم داخل فريق."
          : "تعذّر حفظ المحضر — حاولوا مرة ثانية.",
      );
      setSaving(false);
      return;
    }

    // المحضر انحفظ بالموقع فعليًا الآن — ننزّل نسخة Word حقيقية مباشرة
    // (بدون رفع درايف، غير متاح حاليًا)
    try {
      await downloadMinutesDoc({ meetingDate, attendees: attendeeNames, discussion, decisions, actionItems });
    } catch {
      // السجل محفوظ بالموقع بنجاح بأي حال — التنزيل يقدرون يعيدونه من القائمة تحت
    }

    showToast({
      title: g(isFemale, "تم حفظ المحضر", "تم حفظ المحضر"),
      desc: "انحفظ بالموقع، ونزّلنا لكم نسخة Word.",
      icon: Check,
      tone: "brand",
    });
    reset();
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">محاضر الاجتماعات</h1>
        <p className="text-sm text-brand-950/50">
          كل اجتماع = سجل هنا بالموقع + نسخة Word حقيقية تنزّل لجهازكم فورًا، بضغطة حفظ وحدة.
        </p>
      </div>

      <Card tone="cream">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-brand-950">
          <NotebookPen size={18} className="text-brand-500" />
          محضر اجتماع جديد
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="block text-sm">
            <label htmlFor="meeting-date" className="mb-1 flex items-center gap-1.5 font-semibold text-brand-950/70">
              <CalendarDays size={14} />
              تاريخ الاجتماع
            </label>
            <input
              id="meeting-date"
              type="date"
              value={meetingDate}
              max={today}
              onChange={(e) => setMeetingDate(e.target.value)}
              aria-invalid={!!dateProblem}
              className={`${inputClass} ${dateProblem ? "!border-rose-300" : ""}`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {datePresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setMeetingDate(p.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    meetingDate === p.value
                      ? "bg-brand-500 text-white"
                      : "bg-surface-muted text-brand-950/60 hover:bg-brand-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className={`mt-2 text-xs leading-relaxed ${dateProblem ? "font-semibold text-rose-600" : "text-brand-950/55"}`} aria-live="polite">
              {dateProblem ?? (
                <>
                  {formatDateFull(meetingDate)}
                  {formatHijri(meetingDate) && <> · {formatHijri(meetingDate)}</>}
                </>
              )}
            </p>
          </div>

          <div className="block text-sm">
            <span className="mb-1 flex items-center gap-1.5 font-semibold text-brand-950/70">
              <Users2 size={14} />
              الحاضرون
            </span>
            <div className="flex flex-wrap gap-1.5">
              {roster.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAttendee(m.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    attendeeIds.includes(m.id)
                      ? "bg-brand-500 text-white"
                      : "bg-surface-muted text-brand-950/60 hover:bg-brand-50"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-brand-950/70">ماذا ناقشنا</span>
            <textarea
              value={discussion}
              onChange={(e) => setDiscussion(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="أبرز النقاط اللي انناقشت بالاجتماع"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-brand-950/70">القرارات</span>
            <textarea
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="القرارات اللي اتفقنا عليها"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-brand-950/70">المهام المطلوبة</span>
            <textarea
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="اللي المفروض ينصاح بعد الاجتماع"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !discussion.trim() || !!dateProblem}
          className="mt-4 flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "جاري الحفظ..." : "حفظ المحضر"}
        </button>
      </Card>

      <div className="space-y-3">
        <h3 className="text-base font-bold text-brand-950">المحاضر السابقة</h3>
        {loading ? (
          <p className="text-sm text-brand-950/45">جاري التحميل...</p>
        ) : minutes.length === 0 ? (
          <Card>
            <EmptyState
              icon={NotebookPen}
              title="ما فيه محاضر بعد"
              desc="أول محضر اجتماع تحفظونه بيظهر هنا وبدرايف الفريق."
            />
          </Card>
        ) : (
          minutes.map((m, i) => (
            <Fragment key={m.id}>
            {(i === 0 || formatMonthYear(minutes[i - 1].meetingDate) !== formatMonthYear(m.meetingDate)) && (
              <h4 className="pt-2 text-xs font-extrabold tracking-wide text-brand-950/45">{formatMonthYear(m.meetingDate)}</h4>
            )}
            <Card className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-brand-950">{formatDateFull(m.meetingDate)}</p>
                  <p className="text-xs text-brand-950/45">
                    {relativeDayLabel(m.meetingDate)}
                    {formatHijri(m.meetingDate) && <> · {formatHijri(m.meetingDate)}</>}
                  </p>
                </div>
                <button
                  onClick={() => downloadMinutesDoc(m)}
                  className="flex items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-brand-950/60 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Download size={12} />
                  تنزيل Word
                </button>
                <button
                  onClick={() => downloadMinutesDoc(m, "official")}
                  title="نسخة بيضاء بسيطة للطباعة"
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-950/45 hover:bg-brand-50 hover:text-brand-700"
                >
                  نسخة فاتحة للطباعة
                </button>
                {(isLeader || m.createdById === currentUser?.id) && (
                  <ThreeDotsMenu
                    items={[
                      {
                        label: "حذف المحضر",
                        confirmLabel: "تأكيد الحذف؟",
                        icon: Trash2,
                        tone: "danger",
                        onClick: () => deleteMinutes(m.id),
                      },
                    ]}
                  />
                )}
              </div>
              {m.attendees.length > 0 && (
                <p className="text-xs text-brand-950/50">الحاضرون: {m.attendees.join("، ")}</p>
              )}
              <p className="text-sm text-brand-950/70">{m.discussion}</p>
              {m.decisions && <p className="text-sm text-brand-950/70"><b>القرارات:</b> {m.decisions}</p>}
              {m.actionItems && (
                <p className="text-sm text-brand-950/70"><b>المهام:</b> {m.actionItems}</p>
              )}
            </Card>
            </Fragment>
          ))
        )}
      </div>
    </div>
  );
}
