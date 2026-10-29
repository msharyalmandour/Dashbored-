import { isSupabaseConfigured, supabase } from "./supabaseClient";

/** تفضيلات العرض بالحساب (profiles.reduce_motion / profiles.paper_mode) عشان تمشي مع المستخدم على أي جهاز.
    الجهاز يبقى هو المصدر السريع (localStorage)، والحساب يتحدّث بالخلفية ويغلب أول ما يوصل. */
export type ProfilePrefField = "reduce_motion" | "paper_mode";

export function saveProfilePref(userId: string | null | undefined, field: ProfilePrefField, value: boolean) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  void supabase
    .from("profiles")
    .update({ [field]: value })
    .eq("id", userId)
    .then(({ error }) => {
      if (error) console.warn("profile pref not saved", field, error.message);
    });
}

export async function loadProfilePrefs(userId: string): Promise<{ reduceMotion: boolean | null; paperMode: boolean | null } | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.from("profiles").select("reduce_motion, paper_mode").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  const row = data as { reduce_motion: boolean | null; paper_mode: boolean | null };
  return { reduceMotion: row.reduce_motion, paperMode: row.paper_mode };
}
