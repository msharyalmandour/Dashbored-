import { useTeamPresence } from "../hooks/useTeamPresence";
import Avatar from "./ui/Avatar";

/** يشوف مين من الفريق متصل بالموقع الحين، لحظيًا — يظهر فقط بوضع Supabase الحقيقي */
export default function PresenceStack() {
  const online = useTeamPresence();

  if (online.length === 0) return null;

  return (
    <div className="hidden items-center gap-1.5 lg:flex" title="متصلون الآن">
      <div className="flex -space-x-2 [direction:ltr]">
        {online.slice(0, 4).map((u) => (
          <div key={u.id} className="relative" title={u.name}>
            <Avatar initials={u.initials} color={u.color} size="sm" />
            <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-emerald-500" />
          </div>
        ))}
      </div>
      {online.length > 4 && (
        <span className="text-xs font-bold text-brand-950/45">+{online.length - 4}</span>
      )}
    </div>
  );
}
