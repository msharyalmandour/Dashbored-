import { useState } from "react";
import { CalendarDays, Check, ExternalLink, Loader2, NotebookPen, Trash2, Users2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useMeetingMinutes } from "../hooks/useMeetingMinutes";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { buildMeetingMinutesDoc } from "../lib/meetingMinutesExport";
import { formatDateLong, toISODate } from "../lib/date";
import { g, isFemaleUser } from "../lib/gender";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const inputClass =
  "w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300";

export default function MeetingMinutes() {
  const { currentUser, isLeader } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { showToast } = useToast();
  const { roster } = useTeamRoster();
  const { minutes, loading, addMinutes, deleteMinutes, reload } = useMeetingMinutes();

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

  const handleSave = async () => {
    if (!currentUser || !discussion.trim() || saving) return;
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
      setError("تعذّر حفظ المحضر — حاولوا مرة ثانية.");
      setSaving(false);
      return;
    }

    // المحضر انحفظ بالموقع فعليًا الآن — نولّد ملف Word حقيقي ونرفعه لنفس
    // مجلد الفريق بدرايف، ونربطه بالسجل اللي حفظناه للتو
    try {
      const blob = await buildMeetingMinutesDoc({
        meetingDate,
        attendees: attendeeNames,
        discussion,
        decisions,
        actionItems,
      });
      if (isSupabaseConfigured && supabase) {
        const formData = new FormData();
        formData.append("file", blob, `محضر اجتماع - ${meetingDate}.docx`);
        formData.append("category", "meeting-minutes");
        formData.append("meeting_minutes_id", row.id);
        await supabase.functions.invoke("drive-upload", { body: formData });
        await reload();
      }
    } catch {
      // السجل محفوظ بالموقع بنجاح بأي حال — رفع درايف يمكن يُعاد لاحقًا يدويًا
    }

    showToast({
      title: g(isFemale, "تم حفظ المحضر", "تم حفظ المحضر"),
      desc: "انحفظ بالموقع، وجاري رفعه لدرايف.",
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
          كل اجتماع = سجل هنا بالموقع + ملف Word حقيقي بمجلد الفريق على Google Drive، بضغطة حفظ وحدة.
        </p>
      </div>

      <Card tone="cream">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-brand-950">
          <NotebookPen size={18} className="text-brand-500" />
          محضر اجتماع جديد
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 flex items-center gap-1.5 font-semibold text-brand-950/70">
              <CalendarDays size={14} />
              تاريخ الاجتماع
            </span>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className={inputClass}
            />
          </label>

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
          disabled={saving || !discussion.trim()}
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
          minutes.map((m) => (
            <Card key={m.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-brand-950">{formatDateLong(m.meetingDate)}</p>
                {m.driveViewLink ? (
                  <a
                    href={m.driveViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-brand-950/60 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <ExternalLink size={12} />
                    افتح بدرايف
                  </a>
                ) : (
                  <span className="text-xs text-brand-950/40">جاري الرفع لدرايف...</span>
                )}
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
          ))
        )}
      </div>
    </div>
  );
}
