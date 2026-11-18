import { tr } from "../../lib/i18n";

/** شارة المؤسسين (B06Founders): «فريق مؤسس رقم 37 من 100» — ذهبية، بدون حركة */
export default function FounderBadge({ n, compact }: { n: number | null; compact?: boolean }) {
  if (!n) return null;
  return (
    <span className={compact ? "fb-badge sm" : "fb-badge"} title={tr("من أول 100 فريق سجّلوا في Wesync")}>
      <svg width={compact ? 14 : 18} height={compact ? 14 : 18} viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15.6 6.6 18.5l1.2-6L3.3 8.3l6.1-.7z" fill="currentColor" />
      </svg>
      {tr("فريق مؤسس #{0}", n)}
      {!compact && <small>{tr("من 100")}</small>}
    </span>
  );
}
