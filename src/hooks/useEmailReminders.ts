import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/** مفتاح «تذكيرات الإيميل» للمستخدم الحالي (profiles.email_reminders، الافتراضي true).
    team-digest ما يرسل تذكير يومي ولا تقرير أسبوعي لمن قيمته false.
    التحديث optimistic: المفتاح يتغيّر فورًا، ولو فشل الحفظ يرجع لحالته ويرجّع false. */
export function useEmailReminders(userId: string | undefined, enabled: boolean) {
  const [value, setValue] = useState(true);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled || !userId || !supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("email_reminders")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setValue((data as { email_reminders?: boolean } | null)?.email_reminders !== false);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId, enabled]);

  const update = useCallback(
    async (next: boolean): Promise<boolean> => {
      setValue(next);
      if (!enabled) return true;
      if (!userId || !supabase) {
        setValue(!next);
        return false;
      }
      setSaving(true);
      const { error } = await supabase.from("profiles").update({ email_reminders: next }).eq("id", userId);
      setSaving(false);
      if (error) {
        setValue(!next);
        return false;
      }
      return true;
    },
    [userId, enabled],
  );

  return { value, loading, saving, update };
}
