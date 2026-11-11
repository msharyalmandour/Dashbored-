import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchDrop, type DropItemRow, type DropResult, type DropRow } from "../lib/drops";

/** رمية وحدة بحالتها ونتايجها — تتحدث مباشرة (Realtime) من reading لـ ready بدون سؤال متكرر */
export function useDrop(dropId: string | null) {
  const [drop, setDrop] = useState<DropRow | null>(null);
  const [items, setItems] = useState<DropItemRow[]>([]);
  const [results, setResults] = useState<DropResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!dropId) return;
    const r = await fetchDrop(dropId);
    setDrop(r.drop);
    setItems(r.items);
    setResults(r.results);
    setLoaded(true);
  }, [dropId]);

  useEffect(() => {
    if (!dropId || !supabase) return;
    let alive = true;
    void fetchDrop(dropId).then((r) => {
      if (!alive) return;
      setDrop(r.drop);
      setItems(r.items);
      setResults(r.results);
      setLoaded(true);
    });
    const ch = supabase
      .channel(`drop:${dropId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drops", filter: `id=eq.${dropId}` }, (p) => {
        if (alive) setDrop((prev) => ({ ...(prev ?? ({} as DropRow)), ...(p.new as DropRow) }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "drop_results", filter: `drop_id=eq.${dropId}` }, (p) => {
        if (!alive) return;
        if (p.eventType === "DELETE") setResults((prev) => prev.filter((r) => r.id !== (p.old as { id: string }).id));
        else {
          const row = p.new as DropResult;
          setResults((prev) => [...prev.filter((r) => r.id !== row.id), row].sort((a, b) => a.ord - b.ord));
        }
      })
      .subscribe();
    return () => {
      alive = false;
      void supabase!.removeChannel(ch);
    };
  }, [dropId]);

  /** تعديل محلي فوري (والحفظ بالقاعدة يصير من الصفحة) */
  const patchLocal = useCallback((id: string, patch: Partial<DropResult>) => setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))), []);

  return { drop, items, results, loaded: !dropId || loaded, reload, patchLocal };
}
