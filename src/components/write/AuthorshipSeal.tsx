import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { sealPercent } from "../../lib/authorship";
import { tr } from "../../lib/i18n";

/** «ختم الأصالة» تحت القسم: كتبه الفريق ٪ · اقتراح ويسي معدّل ٪ — سجل، مو حكم */
export default function AuthorshipSeal({ section, bump }: { section: string; bump?: unknown }) {
  const [p, setP] = useState<{ human: number; ai: number } | null>(null);
  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("section_authorship")
      .select("human_chars, ai_edited_chars")
      .eq("section_key", section)
      .maybeSingle()
      .then(({ data, error }) => setP(!error && data ? sealPercent(data.human_chars, data.ai_edited_chars) : null));
  }, [section, bump]);
  if (!p) return null;
  return (
    <p className="as-seal" title={tr("سجل مين كتب وش — يشوفه الفريق والمشرفة بس")}>
      <PenLine size={14} aria-hidden />
      <b>{tr("ختم الأصالة")}</b>
      <span>{tr("كتبه الفريق {0}%", p.human)}</span>
      {p.ai > 0 && <span>{tr("· اقتراح ويسي معدّل {0}%", p.ai)}</span>}
    </p>
  );
}
