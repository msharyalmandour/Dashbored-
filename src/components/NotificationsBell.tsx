import { useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Award, Bell, CalendarDays, Check, Clock, MessageSquare, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTasksData } from "../hooks/useTasksData";
import { useSupervisorMessages } from "../hooks/useSupervisorMessages";
import { daysUntil } from "../lib/date";
import { docDisplayName } from "../lib/docThread";
import { dayBucket, studNotifs, type NotifKind } from "../lib/studNotifs";
import { DocAv } from "./chat/Groups";
import { relTime } from "./supervisor/SvParts";
import { tr } from "../lib/i18n";

/* مركز التنبيهات (StudNotif): شيت من الجرس، «اليوم» و«أمس»، فلاتر الكل / من الدكتورة / المواعيد.
   صف الموعد فيه «نحضر ✓»، وصف الرسالة فيه «ردّوا عليها»، وغير المقروء نقطة برتقالية. */

type Filter = "all" | "doc" | "meet";
const KIND_IC: Record<NotifKind, typeof Bell> = { meeting: CalendarDays, message: MessageSquare, request: Check, approval: Award };

/** up: موجود للتوافق مع مكان الجرس القديم بالقائمة الجانبية */
export default function NotificationsBell({ up: _up = false }: { up?: boolean } = {}) {
  void _up;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const { tasks } = useTasksData();
  const { messages, unread, markRead, rsvps, rsvp } = useSupervisorMessages();
  const docName = docDisplayName(messages);
  const items = studNotifs(messages, docName);
  const urgent = tasks
    .filter((t) => t.assigneeId === currentUser?.id && t.status !== "done")
    .map((t) => ({ t, days: daysUntil(t.dueDate) }))
    .filter(({ days }) => days <= 2)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);
  const badge = unread + urgent.length;
  const shown = items.filter((n) => (filter === "meet" ? n.kind === "meeting" : true));
  const groups: [string, typeof shown][] = [
    [tr("اليوم"), shown.filter((n) => dayBucket(n.at) === "today")],
    [tr("أمس"), shown.filter((n) => dayBucket(n.at) === "yesterday")],
    [tr("قبل"), shown.filter((n) => dayBucket(n.at) === "older")],
  ];
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={badge ? tr("التنبيهات: {0} جديدة", badge) : tr("التنبيهات")} className="sn-bell">
        <Bell size={18} aria-hidden />
        {badge > 0 && <i className="sn-bell-b">{badge}</i>}
      </button>
      {open &&
        createPortal(
          <div className="sn-scrim" onClick={(e) => e.target === e.currentTarget && close()}>
            <aside className="sn-sheet" role="dialog" aria-modal="true" aria-labelledby="sn-h">
              <header className="sn-head">
                <h2 id="sn-h">{tr("التنبيهات")}</h2>
                {unread > 0 && (
                  <button type="button" className="sn-mark" onClick={() => void markRead()}>
                    {tr("علّموها مقروءة")}
                  </button>
                )}
                <button type="button" className="sn-x" onClick={close} aria-label={tr("إغلاق")} autoFocus>
                  <X size={18} aria-hidden />
                </button>
              </header>
              <div className="sn-filters" role="tablist" aria-label={tr("فلتر التنبيهات")}>
                {(
                  [
                    ["all", tr("الكل")],
                    ["doc", items.length ? tr("من الدكتورة {0}", items.length) : tr("من الدكتورة")],
                    ["meet", tr("المواعيد")],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={filter === k} className="sn-f" onClick={() => setFilter(k)}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="sn-list">
                {filter === "all" &&
                  urgent.map(({ t, days }) => (
                    <Link key={t.id} to={`/tasks?task=${t.id}`} onClick={close} className="sn-row">
                      <span className="sn-task-ic" aria-hidden>
                        <Clock size={16} />
                      </span>
                      <span className="sn-m">
                        <b>{t.title}</b>
                        <span style={{ color: days < 0 ? "#FF8A7A" : undefined }}>{days < 0 ? tr("متأخرة") : days === 0 ? tr("مستحقة اليوم") : days === 1 ? tr("مستحقة بكرة") : tr("مستحقة بعد يومين")}</span>
                      </span>
                    </Link>
                  ))}
                {groups.map(([label, list]) =>
                  list.length ? (
                    <section key={label}>
                      <h3 className="sn-day">{label}</h3>
                      {list.map((n) => {
                        const Ic = KIND_IC[n.kind];
                        const going = rsvps[n.id] === "yes";
                        return (
                          <div key={n.id} className={n.unread ? "sn-row unread" : "sn-row"}>
                            <span className="sn-av">
                              <DocAv name={docName} size={42} />
                              <i className="sn-kind" aria-hidden>
                                <Ic size={11} />
                              </i>
                            </span>
                            <span className="sn-m">
                              <b>{n.title}</b>
                              <span dir="auto">{n.sub}</span>
                              {n.kind === "meeting" && (
                                <span className="sn-acts">
                                  <button type="button" className={going ? "gr-rsvp on" : "gr-rsvp go"} aria-pressed={going} onClick={() => void rsvp(n.id, "yes")}>
                                    {going ? tr("بنحضر ✓") : tr("نحضر ✓")}
                                  </button>
                                  <button type="button" className="gr-rsvp" onClick={() => (close(), nav("/chat?g=doc"))}>
                                    {tr("ما نقدر · اقترحوا وقت")}
                                  </button>
                                </span>
                              )}
                              {n.kind === "message" && (
                                <span className="sn-acts">
                                  <button type="button" className="gr-rsvp cream" onClick={() => (close(), nav("/chat?g=doc"))}>
                                    {tr("ردّوا عليها")}
                                  </button>
                                </span>
                              )}
                            </span>
                            <span className="sn-t">
                              {n.unread && <i className="sn-dot" aria-label={tr("جديد")} />}
                              {relTime(n.at)}
                            </span>
                          </div>
                        );
                      })}
                    </section>
                  ) : null,
                )}
                {shown.length === 0 && (filter !== "all" || urgent.length === 0) && <p className="sn-empty">{tr("ما فيه تنبيهات جديدة")}</p>}
              </div>
              <p className="sn-foot">{tr("رسائل الدكتورة توصلكم تنبيه على الجوال حتى لو الموقع مسكّر")}</p>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
