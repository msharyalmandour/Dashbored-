import { useEffect, useState } from "react";
import { Copy, Gift, Share2, Trophy, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { publicOrigin } from "../lib/publicUrl";
import { LuxHead } from "../components/lux/Lux";
import { V3Glow } from "../components/v3/WriteHeader";
import { WesyAvatar } from "../components/brand/Wesy";
import { tr } from "../lib/i18n";

/* صفحة السفير (B08AmbassadorM): كود خاص مثل MSHARY-KAU، «شاركوا الكود»، كم فريق جبتوا وكم شهر مجاني ربحتوا،
   وترتيب الكليات هالشهر. المكافأة: الفريق الجديد لازم يفتح أول باب (مو بس يسجّل) — عشان ما فيه غش. */

interface Stats {
  teams: number;
  activated: number;
  colleges: { college: string; teams: number }[];
}

export default function Ambassador() {
  const { mode } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "soon">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode !== "supabase" || !supabase) return setState("soon");
    void (async () => {
      const c = await supabase!.rpc("my_ambassador_code");
      if (c.error || typeof c.data !== "string") return setState("soon");
      setCode(c.data);
      const s = await supabase!.rpc("my_ambassador_stats");
      if (!s.error && s.data) setStats(s.data as Stats);
      setState("ok");
    })();
  }, [mode]);

  const link = code ? `${publicOrigin()}/?ref=${code}` : "";
  const msg = tr("أبحث تخرجي على Wesync — كل الفريق والمشرفة بمكان واحد، وويسي يرتب الخطوات. سجّلوا بكودي {0} وناخذ شهر مجاني أنا وأنتم لما تبدأون: {1}", code ?? "", link);
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ text: msg });
    } catch {
      /* ألغوا */
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  return (
    <div className="v3 relative">
      <V3Glow />
      <LuxHead kicker={tr("سفراء Wesync")} title={tr("كودكم")} sub={tr("كل فريق يبدأ فعليًا من كودكم = شهر مجاني لكم وله")} />
      {state === "soon" && <p className="lx-card text-[14px] text-[#b8ada2]">{tr("برنامج السفراء ينفتح قريب.")}</p>}
      {state === "ok" && code && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="am-code lx-in" aria-labelledby="am-h">
            <WesyAvatar size={56} state="wink" />
            <span className="am-k" id="am-h">
              {tr("كود السفير")}
            </span>
            <b className="am-v" dir="ltr">
              {code}
            </b>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="dc-send" onClick={share}>
                <Share2 size={16} aria-hidden />
                {tr("شاركوا الكود")}
              </button>
              <button
                type="button"
                className="dh-glass"
                style={{ padding: "0 18px" }}
                onClick={async () => {
                  await navigator.clipboard.writeText(link).catch(() => undefined);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                <Copy size={15} aria-hidden />
                {copied ? tr("انسخ ✓") : tr("انسخوا الرابط")}
              </button>
            </div>
          </section>
          <div className="grid gap-4">
            <section className="lx-card lx-in grid grid-cols-2 gap-3">
              <div className="am-stat">
                <Users size={18} aria-hidden />
                <b dir="ltr">{stats?.teams ?? 0}</b>
                <span>{tr("فرق سجّلت من كودكم")}</span>
              </div>
              <div className="am-stat">
                <Gift size={18} aria-hidden />
                <b dir="ltr">{stats?.activated ?? 0}</b>
                <span>{tr("أشهر مجانية ربحتوها")}</span>
              </div>
              <p className="col-span-2 m-0 text-[12px] text-[#b8ada2]">{tr("الشهر ينحسب لما الفريق الجديد يفتح أول باب، مو بس يسجّل.")}</p>
            </section>
            <section className="lx-card lx-in" aria-labelledby="am-col-h">
              <div className="flex items-center gap-2">
                <Trophy size={17} className="text-[#FFC777]" aria-hidden />
                <b id="am-col-h" className="text-[17px]">
                  {tr("ترتيب الكليات هالشهر")}
                </b>
              </div>
              {(stats?.colleges ?? []).length === 0 && <p className="m-0 mt-2 text-[13px] text-[#b8ada2]">{tr("أول فريق يسجّل يحط كليته فوق.")}</p>}
              <ol className="m-0 mt-2 list-none p-0">
                {(stats?.colleges ?? []).map((c, i) => (
                  <li key={c.college} className="flex min-h-[44px] items-center gap-3 border-t border-white/[0.07] first:border-0">
                    <span className="w-6 text-[13px] font-extrabold text-[#FFC777]" dir="ltr">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[14px] font-bold" dir="auto">
                      {c.college}
                    </span>
                    <span className="text-[13px] text-[#b8ada2]">{tr("{0} فرق", c.teams)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
