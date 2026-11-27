import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CreditCard, HeartHandshake, Wand2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTeamPayments } from "../hooks/useTeamPayments";
import { supabase } from "../lib/supabaseClient";
import MoyasarPayment from "./MoyasarPayment";
import { tr, trx } from "../lib/i18n";
import { BEST_PLAN, GRANT_DONATION, PLAN_OPTIONS, perMonth, personPrice, planSaving, tierOf, type BillingPeriod } from "../lib/plans";

/** نافذة الدفع (2026-11-27 — السعر لكل شخص):
    ١) المدة: شهري · فصل · ⭐ السنة الدراسية (الأوفر، مختارة افتراضيًا) — السعر حسب شريحة الفريق (lib/plans TIER_PRICES)
    ٢) عن مين: حصتي · صاحبي (أي عضو ما دفع) · الفريق كامل
    ٣) «مقعد لزميل محتاج» +5 اختياري · خصم الاستمرار (الشهري ينقص STREAK_DISCOUNT) لو الفريق يستاهله — السيرفر يتحقق من كل شي.
    التحقق الحقيقي وتفعيل الاشتراك بالكامل عند moyasar-webhook. */

type Who = "me" | "friend" | "team";

const PLAN_LABEL: Record<BillingPeriod, () => string> = {
  month: () => tr("شهري"),
  semester: () => tr("فصل دراسي"),
  year: () => tr("السنة الدراسية"),
};
const PLAN_SPAN: Record<BillingPeriod, () => string> = {
  month: () => tr("شهر واحد"),
  semester: () => tr("4 شهور"),
  year: () => tr("9 شهور"),
};

export default function CheckoutModal({ onClose, forProfileId }: { onClose: () => void; forProfileId?: string }) {
  const { team, currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const memberIds = roster.map((m) => m.id);
  const { paidProfileIds } = useTeamPayments(memberIds);
  const [paid, setPaid] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>(BEST_PLAN);
  const [who, setWho] = useState<Who>(forProfileId ? "friend" : "me");
  const [friendId, setFriendId] = useState<string>(forProfileId ?? "");
  const [donate, setDonate] = useState(false);
  const [streak, setStreak] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "paid") setPaid(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // خصم الاستمرار (لو الدالة لسا ما انضافت بالقاعدة، ببساطة ما يطلع)
  useEffect(() => {
    if (!supabase || !team) return;
    void supabase.rpc("my_streak_ok").then(({ data, error }) => setStreak(!error && data === true));
  }, [team]);

  if (!team || !currentUser) return null;

  const memberCount = roster.length || 1;
  const friends = roster.filter((m) => m.id !== currentUser.id);
  const unpaidFriends = friends.filter((m) => !paidProfileIds.has(m.id));
  const friend = friends.find((m) => m.id === friendId) ?? unpaidFriends[0] ?? friends[0];
  const seats = who === "team" ? memberCount : 1;
  const tier = tierOf(memberCount, team.isFounder, team.priceTier);
  const unit = personPrice(period, streak, tier);
  const donation = donate ? GRANT_DONATION : 0;
  const total = unit * seats + donation;
  const forId = who === "friend" ? friend?.id : undefined;

  // بورتال: صفحة الاشتراك داخل حاوية فيها animation (transform)، فالنافذة كانت تنحبس تحت شريط الجوال السفلي
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-2xl shadow-black/25"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-[calc(1.75rem-1.5px)] bg-paper">
          <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-b from-brand-50 to-paper px-5 py-4">
            <p className="relative flex items-center gap-1.5 font-display text-base font-extrabold text-brand-950">
              <Wand2 size={15} className="text-amber-accent-500" />
              {paid ? tr("تم الدفع بنجاح") : tr("إتمام الاشتراك")}
            </p>
            <button onClick={onClose} aria-label={tr("إغلاق")} className="relative flex h-11 w-11 items-center justify-center rounded-xl text-brand-950/40 hover:bg-surface-muted">
              <X size={18} />
            </button>
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" style={{ animation: "success-fade 0.4s ease-out" }}>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white" style={{ animation: "success-pulse 0.6s ease-out" }}>
                <CheckCircle2 size={30} />
              </span>
              <p className="font-display text-lg font-extrabold text-brand-950">{tr("تفعّل اشتراككم 🎉")}</p>
              <p className="text-sm text-brand-950/55">{tr("شكرًا لكم! فريقكم رجع يقدر يضيف مهام ويعدّل عليها بكل حرية.")}</p>
              <button onClick={onClose} className="mt-2 min-h-11 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-5 text-sm font-bold text-white">
                {tr("تمام")}
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              {/* ١) المدة */}
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-brand-950/55">{tr("المدة")}</legend>
                <div className="grid gap-2" role="radiogroup">
                  {PLAN_OPTIONS.map((p) => {
                    const on = period === p.id;
                    const best = p.id === BEST_PLAN;
                    const price = personPrice(p.id, streak, tier);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setPeriod(p.id)}
                        className={`relative flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-start transition-colors ${
                          on ? "border-amber-accent-400 bg-amber-accent-50/70" : "border-brand-100 bg-paper"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-extrabold text-brand-950">
                            {PLAN_LABEL[p.id]()}
                            {best && <span className="ms-2 rounded-full bg-amber-accent-100 px-2 py-0.5 text-xs font-extrabold text-amber-accent-700">{tr("الأوفر")}</span>}
                          </span>
                          <span className="block text-xs text-brand-950/50">
                            {p.id === "month"
                              ? streak
                                ? tr("خصم الاستمرار: فريقكم اشتغل كل أسبوع 🔥")
                                : PLAN_SPAN.month()
                              : trx("{0} · يعني {1} بالشهر · توفّر {2} ريال", PLAN_SPAN[p.id](), perMonth(p.id, tier), planSaving(p.id, tier))}
                          </span>
                        </span>
                        <span className="shrink-0 text-end">
                          <b className="font-display text-xl font-extrabold text-brand-950">{price}</b>
                          <span className="ms-1 text-xs text-brand-950/50">{tr("ريال للشخص")}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* ٢) عن مين */}
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-brand-950/55">{tr("تدفع عن مين؟")}</legend>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-muted p-1" role="radiogroup">
                  {(
                    [
                      ["me", tr("حصتي")],
                      ["friend", tr("عن صاحبي")],
                      ["team", tr("الفريق كامل")],
                    ] as [Who, string][]
                  )
                    .filter(([w]) => w !== "friend" || friends.length > 0)
                    .map(([w, label]) => (
                      <button
                        key={w}
                        type="button"
                        role="radio"
                        aria-checked={who === w}
                        onClick={() => setWho(w)}
                        className={`min-h-11 rounded-xl px-2 text-xs font-bold transition-colors ${who === w ? "bg-paper text-brand-700 shadow-sm" : "text-brand-950/50"}`}
                      >
                        {label}
                      </button>
                    ))}
                </div>
                {who === "friend" && friends.length > 0 && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-brand-950/70">
                    {tr("عن:")}
                    <select
                      className="min-h-11 flex-1 rounded-xl border border-brand-100 bg-paper px-3 text-sm text-brand-950"
                      value={friend?.id ?? ""}
                      onChange={(e) => setFriendId(e.target.value)}
                    >
                      {friends.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {paidProfileIds.has(m.id) ? ` ✓ ${tr("دافع")}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {who === "friend" && friend && (
                  <p className="mt-1.5 text-xs text-brand-950/50">{friend.gender === "female" ? tr("بيوصلها إنك دفعت عنها 💛") : tr("بيوصله إنك دفعت عنه 💛")}</p>
                )}
              </fieldset>

              {/* ٣) صندوق المنح */}
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-brand-100 p-3">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-ws-accent" checked={donate} onChange={(e) => setDonate(e.target.checked)} />
                <span className="text-sm text-brand-950/75">
                  <span className="flex items-center gap-1.5 font-bold text-brand-950">
                    <HeartHandshake size={15} className="text-amber-accent-600" />
                    {trx("+{0} ريال لصندوق منح زملائك", GRANT_DONATION)}
                  </span>
                  {tr("تروح كلها لطلاب ظروفهم ما تسمح يدفعون.")}
                </span>
              </label>

              {/* الملخص */}
              <div className="rounded-2xl bg-surface-muted p-4">
                <div className="flex items-center justify-between text-sm text-brand-950/60">
                  <span>{who === "team" ? trx("{0} × {1} أعضاء", unit, memberCount) : who === "friend" ? trx("حصة {0}", friend?.name ?? "") : tr("حصتك")}</span>
                  <span>{trx("{0} ريال", unit * seats)}</span>
                </div>
                {donation > 0 && (
                  <div className="mt-1 flex items-center justify-between text-sm text-brand-950/60">
                    <span>{tr("صندوق المنح")}</span>
                    <span>{trx("{0} ريال", donation)}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-brand-100 pt-3">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-brand-950">
                    <CreditCard size={14} />
                    {tr("المبلغ الآن")}
                  </span>
                  <span className="font-display text-lg font-extrabold text-brand-700">{trx("{0} ريال", total)}</span>
                </div>
                <p className="mt-2 text-xs text-brand-950/45">
                  {who === "team"
                    ? trx("يغطي الفريق كامل {0}.", PLAN_SPAN[period]())
                    : tr("دفعتك تمدد اشتراك الفريق بنصيبك — كل عضو يدفع يزيد الأيام، بدون انتظار البقية.")}
                </p>
                <p className="mt-1 text-xs font-semibold text-brand-950/50">{tr("سعرك ثابت لين تتخرجون · ضمان أول شهر: ما عجبكم؟ نرجّع فلوسكم")}</p>
              </div>

              <MoyasarPayment
                amount={total}
                label={tr("ادفع {0} ريال — تفعيل فوري", total)}
                description={
                  who === "team"
                    ? tr("اشتراك فريق {0} — الفريق كامل ({1})", team.name, PLAN_LABEL[period]())
                    : who === "friend"
                      ? tr("حصة {0} (دفعها {1}) — فريق {2} ({3})", friend?.name ?? "", currentUser.name, team.name, PLAN_LABEL[period]())
                      : tr("حصة {0} — فريق {1} ({2})", currentUser.name, team.name, PLAN_LABEL[period]())
                }
                metadata={{
                  period,
                  mode: who === "team" ? "full" : "share",
                  ...(forId ? { for_profile_id: forId } : {}),
                  ...(donation ? { donation: String(donation) } : {}),
                  ...(streak && period === "month" ? { streak: "1" } : {}),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
