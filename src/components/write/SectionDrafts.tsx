import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateShort } from "../../lib/date";
import { tr } from "../../lib/i18n";

interface Draft {
  id: string;
  content: string;
  created_at: string;
}

/** مسودة قسم جات من «ارموا أي شي» (ملف Word): تنتظر قرار الفريق — نضيفها تحت نصكم، ما نكتب فوقه أبدًا */
export default function SectionDrafts({ sectionKey, content, onApply }: { sectionKey: string; content: string; onApply: (next: string) => Promise<unknown> | void }) {
  const { mode, canWrite } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "supabase" || !supabase) return;
    let alive = true;
    void supabase
      .from("proposal_section_drafts")
      .select("id, content, created_at")
      .eq("section_key", sectionKey)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => alive && setDrafts((data as Draft[] | null) ?? []));
    return () => {
      alive = false;
    };
  }, [mode, sectionKey]);

  const decide = async (d: Draft, accept: boolean) => {
    if (accept) await onApply(content.trim() ? `${content.trim()}\n\n${d.content.trim()}` : d.content.trim());
    await supabase!.from("proposal_section_drafts").update({ status: accept ? "accepted" : "dismissed" }).eq("id", d.id);
    setDrafts((prev) => prev.filter((x) => x.id !== d.id));
  };

  if (!drafts.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {drafts.map((d) => (
        <div key={d.id} className="dr-card rounded-[20px] p-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#FFC777]">
            <Download size={14} aria-hidden />
            {tr("مسودة لهالقسم من رمية · {0}", formatDateShort(d.created_at.slice(0, 10)))}
          </div>
          <p className={`m-0 mt-1.5 whitespace-pre-line text-[14px] leading-[1.75] text-[#E9D3B8] ${open === d.id ? "" : "line-clamp-3"}`} dir="auto">
            {d.content}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {canWrite && (
              <button type="button" className="dr-cream !flex-none" onClick={() => decide(d, true)}>
                {content.trim() ? tr("أضيفوها تحت نصكم") : tr("حطوها بالقسم")}
              </button>
            )}
            {canWrite && (
              <button type="button" className="dr-ghost !flex-none" onClick={() => decide(d, false)}>
                {tr("تجاهل")}
              </button>
            )}
            <button type="button" className="dr-text dim" onClick={() => setOpen(open === d.id ? null : d.id)}>
              {open === d.id ? tr("أقل") : tr("اقروها كاملة")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
