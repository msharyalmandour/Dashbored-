import type { QuickReply } from "../../lib/agentExtras";

/** أزرار الردود السريعة تحت آخر رد للوكيل. للمصمم: التنسيق هنا فقط. */
export default function AgentQuickReplies({ items, onPick, disabled }: { items: QuickReply[]; onPick: (ask: string) => void; disabled?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div data-agent="quick-replies" className="flex flex-wrap gap-2 pt-1">
      {items.map((q) => (
        <button
          key={q.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q.ask)}
          className="rounded-full border border-[#FF8A24]/40 px-3.5 py-1.5 text-start text-[13px] text-[#E6DBD1] transition hover:bg-[#FF6B00]/10 disabled:opacity-50"
        >
          {q.label}
        </button>
      ))}
    </div>
  );
}
