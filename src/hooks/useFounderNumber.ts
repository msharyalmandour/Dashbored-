import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

/** رقم الفريق المؤسس الحقيقي (1–100) من القاعدة — ما فيه رقم وهمي: لو ما فيه رقم ترجع null */
export function useFounderNumber(): number | null {
  const { team, mode } = useAuth();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (mode !== "supabase" || !supabase || !team?.id) return;
    void supabase.rpc("my_founder_number").then(({ data, error }) => setN(!error && typeof data === "number" ? data : null));
  }, [team?.id, mode]);
  return n;
}
