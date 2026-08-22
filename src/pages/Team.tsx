import { Mail, ShieldCheck } from "lucide-react";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import { tasks, teamMembers } from "../data/mockData";

export default function Team() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {teamMembers.map((member) => {
        const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
        const overdue = memberTasks.filter((t) => t.status === "overdue").length;

        return (
          <Card key={member.id} className="flex flex-col">
            <div className="flex items-center gap-3">
              <Avatar initials={member.initials} color={member.color} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-brand-950">{member.name}</p>
                <p className="flex items-center gap-1 text-sm text-brand-950/50">
                  {member.role === "leader" && (
                    <ShieldCheck size={14} className="text-amber-accent-500" />
                  )}
                  {member.title}
                </p>
              </div>
            </div>

            <a
              href={`mailto:${member.email}`}
              className="mt-3 flex items-center gap-1.5 text-sm text-brand-950/45 hover:text-brand-600"
            >
              <Mail size={14} />
              {member.email}
            </a>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-semibold text-brand-950/50">
                <span>نسبة الإنجاز</span>
                <span className="text-brand-600">{member.progress}%</span>
              </div>
              <ProgressBar value={member.progress} color={member.color} />
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-brand-50 rounded-xl bg-surface-muted py-3 text-center">
              <div>
                <p className="text-base font-extrabold text-brand-950">{member.tasksTotal}</p>
                <p className="text-[11px] text-brand-950/45">إجمالي المهام</p>
              </div>
              <div>
                <p className="text-base font-extrabold text-brand-600">{member.tasksDone}</p>
                <p className="text-[11px] text-brand-950/45">مكتملة</p>
              </div>
              <div>
                <p className="text-base font-extrabold text-rose-500">{overdue}</p>
                <p className="text-[11px] text-brand-950/45">متأخرة</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
