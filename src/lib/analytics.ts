import { isSupabaseConfigured, supabase } from "./supabaseClient";

/** أحداث الاستخدام (جدول app_events: الفريق والمستخدم يتعبّون من القاعدة نفسها).
    ما يوقف أي شي لو فشل — ولو الجدول مو موجود نوقف المحاولة لين يتحدّث الموقع. */
let off = false;
export function track(name: string, props: Record<string, string | number | boolean | null> = {}) {
  if (off || !isSupabaseConfigured) return;
  void supabase!
    .from("app_events")
    .insert({ name, props })
    .then(({ error }) => {
      if (error && /app_events|PGRST205|42P01/.test(`${error.code} ${error.message}`)) off = true;
    });
}
