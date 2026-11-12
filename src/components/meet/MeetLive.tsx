import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Video } from "lucide-react";
import { tr } from "../../lib/i18n";
import { meetStatus, type MeetStatus } from "../../lib/meet";

/** «الفريق في اجتماع الحين — ادخلوا»: يسأل كل دقيقة، ويختفي لو الاجتماعات مو مفعّلة أو ما أحد داخل */
export function useMeetLive(shareToken?: string) {
  const [s, setS] = useState<MeetStatus | null>(null);
  useEffect(() => {
    let off = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const load = async () => {
      const r = await meetStatus(shareToken);
      if (off) return;
      setS(r);
      if (r && !r.configured && timer) clearInterval(timer); // مو مفعّلة: لا نعيد السؤال
    };
    void load();
    timer = setInterval(() => document.visibilityState === "visible" && void load(), 60_000);
    return () => {
      off = true;
      if (timer) clearInterval(timer);
    };
  }, [shareToken]);
  return s;
}

export function MeetLiveStrip({ to = "/meet", shareToken }: { to?: string; shareToken?: string }) {
  const s = useMeetLive(shareToken);
  if (!s?.configured || !s.live) return null;
  const names = s.names.filter(Boolean).slice(0, 3).join(tr("، "));
  return (
    <section className="mt-strip-live sd-in" aria-label={tr("اجتماع شغّال")}>
      <span className="sup-ic gold" aria-hidden>
        <Video size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
        <b style={{ display: "block", fontSize: 15 }}>{tr("الفريق في اجتماع الحين")}</b>
        <span style={{ fontSize: 12, color: "#E9D3B8" }}>{names ? tr("{0} داخلين", names) : tr("{0} داخلين", s.count)}</span>
      </div>
      <Link to={to} className="sup-btn-cream" style={{ display: "flex", alignItems: "center", padding: "0 16px", minHeight: 44, flex: "none" }}>
        {tr("ادخلوا")}
      </Link>
    </section>
  );
}
