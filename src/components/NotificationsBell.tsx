import { useState } from "react";
import { Bell } from "lucide-react";
import { recentActivity, teamMembers } from "../data/mockData";
import Avatar from "./ui/Avatar";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const memberById = (id: string) => teamMembers.find((m) => m.id === id);
  const items = recentActivity.slice(0, 5);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="التنبيهات"
        className="relative rounded-xl border border-brand-100 p-2 text-brand-950/60 hover:bg-surface-muted"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-accent-500 text-[10px] font-bold text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-12 z-20 w-80 rounded-2xl border border-brand-100 bg-paper p-2 shadow-lg shadow-brand-950/10">
            <p className="px-2 py-1.5 text-xs font-bold text-brand-950/45">آخر تنبيهات الفريق</p>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {items.map((activity) => {
                const member = memberById(activity.memberId);
                if (!member) return null;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-muted"
                  >
                    <Avatar initials={member.initials} color={member.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-brand-950">
                        <span className="font-semibold">{member.name.split(" ")[0]}</span>{" "}
                        {activity.action}{" "}
                        <span className="font-semibold text-brand-700">"{activity.target}"</span>
                      </p>
                      <p className="mt-0.5 text-xs text-brand-950/40">{activity.timeAgo}</p>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-brand-950/40">لا توجد تنبيهات جديدة</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
