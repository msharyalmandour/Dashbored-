import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Video } from "lucide-react";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { formatDateFull, formatDateShort, relativeDayLabel } from "../../lib/date";
import { tr } from "../../lib/i18n";

/** «الاجتماع الجاي» + مواعيد الأسبوع من التقويم */
export default function NextMeetingCard({ today, now, style }: { today: string; now: Date; style?: React.CSSProperties }) {
  const { events } = useCalendarEvents();
  const weekEnd = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const meeting = upcoming.find((e) => e.type === "meeting");
  const week = upcoming.filter((e) => e.date <= weekEnd && e.id !== meeting?.id).slice(0, 4);

  return (
    <section className="v3-g v3-hover v3-rise flex flex-col gap-3 !rounded-[28px] p-5 sm:p-6" style={style} aria-labelledby="meet-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="meet-title" className="v3-k m-0 text-[20px]">
          {tr("الاجتماع الجاي")}
        </h2>
        <Link to="/calendar" className="v3-link !text-[var(--ws-c-muted)]">
          {tr("التقويم ←")}
        </Link>
      </div>
      {meeting ? (
        <div className="v3-g2 flex items-start gap-3 !rounded-[20px] p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[rgba(255,140,40,.14)] text-[var(--ws-c-accent-2)]" aria-hidden>
            <Video size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold" dir="auto">
              {meeting.title}
            </div>
            <div className="text-sm text-[var(--ws-c-accent-2)]">
              {meeting.date === today ? tr("اليوم") : relativeDayLabel(meeting.date, now)} · {formatDateFull(meeting.date)} · {meeting.time}
            </div>
            {meeting.location && (
              <div className="v3-mut mt-0.5 flex items-center gap-1 truncate text-[13px]" dir="auto">
                <MapPin size={13} aria-hidden />
                {meeting.location}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="v3-g2 flex flex-wrap items-center gap-3 !rounded-[20px] p-4">
          <p className="v3-mut m-0 flex-1 text-[15px]">{tr("ما فيه اجتماع مجدول قريب.")}</p>
          <Link to="/meeting-minutes?tab=appointments" className="v3-bd !text-sm">
            {tr("احجزوا موعد")}
          </Link>
        </div>
      )}
      <div>
        <div className="v3-mut mb-1 flex items-center gap-1.5 text-[13px] font-bold">
          <CalendarDays size={14} aria-hidden />
          {tr("هالأسبوع")}
        </div>
        {week.length === 0 ? (
          <p className="v3-mut m-0 text-sm">{tr("ما فيه مواعيد ثانية هالأسبوع.")}</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {week.map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-t border-white/[0.07] py-2.5 text-sm first:border-t-0">
                <span className="w-[86px] shrink-0 whitespace-nowrap text-[var(--ws-c-accent-2)]">{e.date === today ? tr("اليوم") : formatDateShort(e.date)}</span>
                <span className="min-w-0 flex-1 truncate" dir="auto">
                  {e.title}
                </span>
                <span className="v3-mut shrink-0 text-[13px]" dir="ltr">
                  {e.time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
