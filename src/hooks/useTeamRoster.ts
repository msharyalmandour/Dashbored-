import { useEffect, useState } from "react";
import { teamMembers } from "../data/mockData";
import type { TeamMember } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/** لكل عضو: عدد المهام المسندة له وعدد المكتمل منها، من جدول tasks
    الحقيقي نفسه اللي تستخدمه useTasksData.ts */
function computeTaskStats(memberId: string, tasks: { assignee_id: string; status: string }[]) {
  const assigned = tasks.filter((t) => t.assignee_id === memberId);
  const done = assigned.filter((t) => t.status === "done").length;
  return {
    tasksTotal: assigned.length,
    tasksDone: done,
    progress: assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 0,
  };
}

export function useTeamRoster() {
  const [roster, setRoster] = useState<TeamMember[]>(
    isSupabaseConfigured ? [] : teamMembers,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    Promise.all([
      supabase!.from("profiles").select("id, name, initials, title, role, color, email, gender"),
      supabase!.from("tasks").select("assignee_id, status"),
    ]).then(([profilesRes, tasksRes]) => {
      if (profilesRes.data) {
        const tasks = tasksRes.data ?? [];
        setRoster(
          profilesRes.data.map((row) => ({
            ...row,
            ...computeTaskStats(row.id, tasks),
          })) as TeamMember[],
        );
      }
      setLoading(false);
    });
  }, []);

  return { roster, loading };
}
