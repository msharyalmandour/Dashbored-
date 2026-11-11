import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { listCommitments, type Commitment } from "../lib/commitments";

let channelSeq = 0;

/** التزامات الفريق (طلبات الدكتورة ووعودها) — تتحدث مباشرة لما تنقرا رسالتها أو يعتمد القائد */
export function useCommitments() {
  const { team } = useAuth();
  const [items, setItems] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !team) return;
    try {
      setItems(await listCommitments());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => {
    if (!isSupabaseConfigured || !team) return;
    void reload();
    const ch = supabase!
      .channel(`commitments:${team.id}:${channelSeq++}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "commitments", filter: `team_id=eq.${team.id}` }, () => void reload())
      .subscribe();
    return () => void supabase!.removeChannel(ch);
  }, [team, reload]);

  const patchLocal = useCallback((id: string, patch: Partial<Commitment>) => setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))), []);
  return { items, loading, failed, reload, patchLocal };
}
