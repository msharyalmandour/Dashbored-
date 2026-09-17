import { useCallback, useEffect, useState } from "react";
import type { MeetingMinutesRow } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface MinutesRowDb {
  id: string;
  meeting_date: string;
  attendees: string[];
  discussion: string;
  decisions: string;
  action_items: string;
  created_by: string | null;
  drive_file_id: string | null;
  drive_view_link: string | null;
  created_at: string;
}

function mapRow(row: MinutesRowDb): MeetingMinutesRow {
  return {
    id: row.id,
    meetingDate: row.meeting_date,
    attendees: row.attendees,
    discussion: row.discussion,
    decisions: row.decisions,
    actionItems: row.action_items,
    createdById: row.created_by ?? "",
    driveFileId: row.drive_file_id,
    driveViewLink: row.drive_view_link,
    createdAt: row.created_at,
  };
}

/** محاضر الاجتماعات الحقيقية — تُحفظ بقاعدة البيانات فورًا (وضع Supabase
    فقط، ما فيها بديل تجريبي لأن الميزة كلها مربوطة بمشروع بحث حقيقي). */
export function useMeetingMinutes() {
  const [minutes, setMinutes] = useState<MeetingMinutesRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!
      .from("meeting_minutes")
      .select("*")
      .order("meeting_date", { ascending: false });
    if (data) setMinutes((data as MinutesRowDb[]).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addMinutes = async (input: {
    meetingDate: string;
    attendees: string[];
    discussion: string;
    decisions: string;
    actionItems: string;
    createdById: string;
  }) => {
    const { data, error } = await supabase!
      .from("meeting_minutes")
      .insert({
        meeting_date: input.meetingDate,
        attendees: input.attendees,
        discussion: input.discussion,
        decisions: input.decisions,
        action_items: input.actionItems,
        created_by: input.createdById,
      })
      .select()
      .single();
    if (!error && data) setMinutes((prev) => [mapRow(data as MinutesRowDb), ...prev]);
    return { row: data ? mapRow(data as MinutesRowDb) : null, error: error?.message };
  };

  return { minutes, loading, addMinutes, reload: load };
}
