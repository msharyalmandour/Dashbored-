import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronLeft, X } from "lucide-react";
import Logo from "../components/Logo";
import { supabase } from "../lib/supabaseClient";
import { formatDateShort } from "../lib/date";
import { forgetTeam, loadTeams, type SavedTeam } from "../lib/supervisorLocal";

interface TeamCard {
  saved: SavedTeam;
  state: "loading" | "error" | "ok";
  total: number;
  done: number;
  overdue: number;
}

type Light = "red" | "amber" | "green";

/** إشارة الفريق: أحمر لو فيه مهمة متأخرة، أصفر لو ما بدأ فعليًا (بدون مهام أو أقل من ربع المهام مكتمل)، وإلا أخضر */
function lightOf(c: TeamCard): Light {
  if (c.overdue > 0) return "red";
  if (c.total === 0 || c.done / c.total < 0.25) return "amber";
  return "green";
}

const lightStyle: Record<Light, { dot: string; label: string; rank: number }> = {
  red: { dot: "bg-rose-500", label: "يحتاج متابعة", rank: 0 },
  amber: { dot: "bg-amber-accent-500", label: "بداية / بطيء", rank: 1 },
  green: { dot: "bg-brand-500", label: "ماشي زين", rank: 2 },
};

/** «فرقي» — كل الفرق اللي فتحتِ/فتحتَ رابطها من هذا الجهاز، مرتبة بمين يحتاج متابعة أول.
    تُحفظ الروابط على جهاز المشرف/ة فقط (ما فيه حساب)، وكل فريق يُجلب تقريره الحي. */
export default function SupervisorTeams() {
  const [cards, setCards] = useState<TeamCard[]>(() =>
    loadTeams().map((saved) => ({ saved, state: "loading", total: 0, done: 0, overdue: 0 })),
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    loadTeams().forEach(async (saved) => {
      const { data, error } = await supabase!.rpc("get_team_snapshot", { p_token: saved.token });
      if (cancelled) return;
      const tasks = (data as { tasks?: { status: string }[] } | null)?.tasks ?? [];
      const next: TeamCard =
        error || !data
          ? { saved, state: "error", total: 0, done: 0, overdue: 0 }
          : {
              saved,
              state: "ok",
              total: tasks.length,
              done: tasks.filter((t) => t.status === "done").length,
              overdue: tasks.filter((t) => t.status === "overdue").length,
            };
      setCards((prev) => prev.map((c) => (c.saved.token === saved.token ? next : c)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = [...cards].sort((a, b) => {
    const ra = a.state === "ok" ? lightStyle[lightOf(a)].rank : 3;
    const rb = b.state === "ok" ? lightStyle[lightOf(b)].rank : 3;
    return ra - rb;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-paper to-paper px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-display text-base font-extrabold text-brand-950">Wesync</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950">فرقي</h1>
        <p className="mt-1 text-sm text-brand-950/55">الفرق اللي فتحتم روابطها من هذا الجهاز — الأحمر أول.</p>

        {sorted.length === 0 && (
          <p className="mt-10 rounded-3xl border border-brand-100 bg-paper p-6 text-center text-sm text-brand-950/55">
            ما فيه فرق محفوظة بعد. افتحوا رابط المتابعة اللي يرسله لكم الفريق وبينحفظ هنا تلقائيًا.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {sorted.map((c) => {
            const light = c.state === "ok" ? lightOf(c) : null;
            return (
              <li key={c.saved.token} className="flex items-center gap-3 rounded-3xl border border-brand-100/70 bg-paper p-4 shadow-sm shadow-brand-950/5">
                <span className={`h-3 w-3 shrink-0 rounded-full ${light ? lightStyle[light].dot : "bg-brand-950/20"}`} />
                <Link to={`/supervisor/${c.saved.token}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-brand-950">{c.saved.teamName || "فريق بدون اسم"}</p>
                    <p className="mt-0.5 text-xs text-brand-950/50">
                      {c.state === "loading" && "جاري التحميل…"}
                      {c.state === "error" && (
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <AlertTriangle size={12} /> الرابط ما عاد يشتغل
                        </span>
                      )}
                      {c.state === "ok" && `${c.done}/${c.total} مهام مكتملة${c.overdue ? ` · ${c.overdue} متأخرة` : ""} · ${light ? lightStyle[light].label : ""}`}
                      {" · آخر زيارة "}
                      {formatDateShort(c.saved.visitedAt)}
                    </p>
                  </div>
                  <ChevronLeft size={16} className="text-brand-950/30" />
                </Link>
                <button
                  title="إزالة من القائمة"
                  onClick={() => {
                    forgetTeam(c.saved.token);
                    setCards((prev) => prev.filter((x) => x.saved.token !== c.saved.token));
                  }}
                  className="rounded-full p-1.5 text-brand-950/30 hover:bg-surface-muted hover:text-brand-950/60"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
