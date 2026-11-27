import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { LuxHead } from "../components/lux/Lux";
import { V3Glow } from "../components/v3/WriteHeader";
import { tr } from "../lib/i18n";

/* حلقة النمو (B11Loop) — للمشرف العام بس: كل أسبوع كم فريق جديد ومن وين جا، تكلفة الفريق (الإنفاق يندخل يدوي)،
   ونسبة اللي فتحوا أول باب. قاعدة القياس: الاستخدام المتكرر، مو عدد التسجيلات — فأول باب هو المؤشر. */

interface Week {
  week: string;
  teams: number;
  by_source: Record<"team_referral" | "ambassador" | "influencer" | "doctor" | "other", number>;
  first_door: number;
}
const SRC: [keyof Week["by_source"], string][] = [
  ["team_referral", tr("إحالة فريق")],
  ["ambassador", tr("سفير")],
  ["influencer", tr("مؤثر")],
  ["doctor", tr("دكتورة")],
  ["other", tr("إعلان/غيره")],
];
const SPEND_KEY = "wesync.admin.spend";

export default function AdminGrowth() {
  const { isSuperAdmin } = useAuth();
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [err, setErr] = useState("");
  const [spend, setSpend] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(SPEND_KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    if (!isSuperAdmin || !supabase) return;
    void supabase.rpc("admin_growth_weekly", { p_weeks: 8 }).then(({ data, error }) => (error ? setErr(tr("اللوحة تشتغل بعد تشغيل ملف SQL حق النمو.")) : setWeeks((data ?? []) as Week[])));
  }, [isSuperAdmin]);
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  const setW = (w: string, v: string) => {
    const next = { ...spend, [w]: v };
    setSpend(next);
    try {
      localStorage.setItem(SPEND_KEY, JSON.stringify(next));
    } catch {
      /* ما يهم */
    }
  };
  return (
    <div className="v3 relative">
      <V3Glow />
      <LuxHead kicker={tr("الإدارة")} title={tr("حلقة النمو")} sub={tr("كل أسبوع: كم فريق جديد، من وين، بكم، وكم منهم بدأ فعليًا")} />
      {err && <p className="lx-card text-[14px] text-[#b8ada2]">{err}</p>}
      {weeks && (
        <section className="lx-card lx-in overflow-x-auto">
          <table className="ag-t">
            <thead>
              <tr>
                <th>{tr("الأسبوع")}</th>
                <th>{tr("فرق جديدة")}</th>
                {SRC.map(([k, l]) => (
                  <th key={k}>{l}</th>
                ))}
                <th>{tr("فتحوا أول باب")}</th>
                <th>{tr("الإنفاق (ر.س)")}</th>
                <th>{tr("تكلفة الفريق")}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const sp = Number(spend[w.week] || 0);
                return (
                  <tr key={w.week}>
                    <td dir="ltr">{w.week}</td>
                    <td>
                      <b>{w.teams}</b>
                    </td>
                    {SRC.map(([k]) => (
                      <td key={k}>{w.by_source[k] ?? 0}</td>
                    ))}
                    <td>
                      <b className="text-[#FFC777]">{w.teams ? Math.round((w.first_door / w.teams) * 100) : 0}%</b>
                    </td>
                    <td>
                      <input className="dc-extra-in w-[90px]" inputMode="numeric" value={spend[w.week] ?? ""} onChange={(e) => setW(w.week, e.target.value.replace(/[^\d.]/g, ""))} aria-label={tr("إنفاق أسبوع {0}", w.week)} />
                    </td>
                    <td>{sp && w.teams ? (sp / w.teams).toFixed(0) : "—"}</td>
                  </tr>
                );
              })}
              {weeks.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-[#b8ada2]">
                    {tr("ما فيه فرق جديدة بآخر 8 أسابيع.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
