import { useEffect, useState } from "react";
import { teamMembers } from "../data/mockData";
import type { TeamMember } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export function useTeamRoster() {
  const [roster, setRoster] = useState<TeamMember[]>(
    isSupabaseConfigured ? [] : teamMembers,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase!
      .from("profiles")
      .select("id, name, initials, title, role, color, email")
      .then(({ data }) => {
        if (data) {
          setRoster(
            data.map((row) => ({
              ...row,
              progress: 0,
              tasksDone: 0,
              tasksTotal: 0,
            })) as TeamMember[],
          );
        }
        setLoading(false);
      });
  }, []);

  return { roster, loading };
}
