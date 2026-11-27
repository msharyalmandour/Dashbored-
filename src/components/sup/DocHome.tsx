import type { ReactNode } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { avatarLetter } from "../../lib/avatarLetter";
import { tr } from "../../lib/i18n";
import { relTime } from "../supervisor/SvParts";
import { TEAM_TONE, TONE_RANK, teamStatus, type TeamData, type WaitItem } from "../../lib/supervisorDash";

/* بوابة الدكتورة — الرئيسية (DocHome2 / DocHomeM2):
   الشريط البرتقالي «أشياء تنتظرك» (3 بلاطات بالكثير، فعل واحد لكل وحدة) ← «يومك» (3 بلاطات، الجاي كريمي) ← كروت الفرق مرتبة باللي يحتاجك أكثر. */

const AV = ["#FFB547", "#FFB547", "#FFE3C2", "#FF8A24"];

export function DocWaitStrip({ waits, icon, onOpen, onAll }: { waits: WaitItem[]; icon: (w: WaitItem) => ReactNode; onOpen: (w: WaitItem) => void; onAll: () => void }) {
  const list = waits.filter((w) => w.kind !== "radar");
  if (!list.length)
    return (
      <section className="sd-glass sd-calm sd-in">
        <b style={{ fontSize: 22 }}>{tr("ما فيه شي ينتظرك")}</b>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#E9D3B8" }}>{tr("كل الطلبات ماشية مع الطلاب.")}</p>
      </section>
    );
  return (
    <section className="dh-wait sd-in" aria-labelledby="dh-wait-h">
      <div className="dh-wait-h">
        <b className="dh-wait-n" dir="ltr">
          {list.length}
        </b>
        <b id="dh-wait-h" style={{ fontSize: 22 }}>
          {list.length === 1 ? tr("شي واحد ينتظرك") : tr("أشياء تنتظرك")}
        </b>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#3A1504" }}>{tr("والباقي ماشي مع الطلاب")}</span>
        {list.length > 3 && (
          <button type="button" className="dh-wait-all" onClick={onAll}>
            {tr("كلها ({0})", list.length)}
          </button>
        )}
      </div>
      <div className="dh-tiles">
        {list.slice(0, 3).map((w) => (
          <button key={w.key} type="button" className="dh-tile" onClick={() => onOpen(w)}>
            <span className="dh-tile-ic">{icon(w)}</span>
            <b className="dh-tile-t">{w.title}</b>
            <span className="dh-tile-s">{w.sub}</span>
            <span className="dh-tile-go">
              {w.kind === "extension" ? tr("وافقوا أو اقترحوا يوم") : w.kind === "minutes" ? tr("شوفوه واعتمدوه") : w.kind === "question" || w.kind === "decision" ? tr("جاوبوهم") : w.action}
              <ChevronLeft size={14} aria-hidden />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export interface DaySlot {
  id: string;
  time: string;
  durationMin: number;
  team: string;
  note?: string;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function DocDay({ slots, nowMin, onAll }: { slots: DaySlot[]; nowMin: number; onAll: () => void }) {
  const upcoming = slots.filter((s) => toMin(s.time) + s.durationMin > nowMin);
  const next = upcoming[0];
  const shown = (upcoming.length ? upcoming : slots).slice(0, 3);
  return (
    <section className="sd-glass sd-in sd-d2 dh-daycard" aria-labelledby="dh-day-h">
      <div className="sd-h">
        <b id="dh-day-h">{tr("يومك")}</b>
        <span style={{ flex: 1 }} />
        <button type="button" className="dh-link" onClick={onAll}>
          {tr("كل المواعيد")}
        </button>
      </div>
      {shown.length === 0 ? (
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#ABA095" }}>{tr("ما فيه اجتماعات اليوم.")}</p>
      ) : (
        <div className="dh-day">
          {shown.map((s) => {
            const isNext = s === next;
            const inMin = toMin(s.time) - nowMin;
            return (
              <div key={s.id} className={isNext ? "dh-slot next" : "dh-slot"}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b className="dh-slot-t" dir="ltr">
                    {s.time}
                  </b>
                  {isNext && inMin > 0 && inMin <= 180 && <span className="dh-soon">{inMin < 60 ? tr("بعد {0} دقيقة", inMin) : tr("بعد {0} ساعة", Math.round(inMin / 60))}</span>}
                  {isNext && inMin <= 0 && <span className="dh-soon">{tr("الحين")}</span>}
                </div>
                <b style={{ fontSize: 16 }}>{s.team}</b>
                <span className="dh-slot-n">{s.note || tr("{0} دقيقة", s.durationMin)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Ring({ pct, color }: { pct: number | null; color: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const v = pct ?? 0;
  return (
    <span className="dh-ring" aria-hidden>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 42 42)" />
      </svg>
      <b dir="ltr">{pct === null ? "—" : `${pct}%`}</b>
    </span>
  );
}

export function DocTeams({ teams, waits, onChat, onOpen }: { teams: TeamData[]; waits: WaitItem[]; onChat: (t: TeamData) => void; onOpen: (t: TeamData) => void }) {
  const rows = teams
    .filter((t) => t.state === "ok")
    .map((t) => ({ t, s: teamStatus(t, waits) }))
    .sort((a, b) => TONE_RANK[a.s.tone] - TONE_RANK[b.s.tone] || (a.s.pct ?? 0) - (b.s.pct ?? 0));
  if (!rows.length) return null;
  return (
    <>
      <div className="dh-sep">
        <b>{tr("فرقك")}</b> · {tr("مرتبة باللي يحتاجك أكثر")}
      </div>
      <div className="dh-teams">
        {rows.map(({ t, s }, i) => {
          const tone = TEAM_TONE[s.tone];
          const msg = t.dash?.lastTeamMessage;
          return (
            <article key={t.token} className={`dh-team sd-in sd-d${Math.min(4, i + 2)}${s.tone !== "ok" ? " hot" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b className="dh-team-n">{t.name || tr("فريق بدون اسم")}</b>
                  <div className="sd-avs" aria-hidden>
                    {(t.dash?.members ?? []).slice(0, 5).map((m, k) => (
                      <span key={m.id} style={{ background: AV[k % AV.length] }}>
                        {avatarLetter(m.name)}
                      </span>
                    ))}
                  </div>
                </div>
                <Ring pct={s.pct} color={tone.color} />
              </div>
              <div className="dh-tone" style={{ color: tone.color }}>
                <i style={{ background: tone.color }} />
                {tr(tone.label)}
              </div>
              <p className="dh-why">{s.reason}</p>
              <div className="dh-msg">
                {msg ? (
                  <>
                    <span className="dh-msg-t">{tr("آخر رسالة · {0}", relTime(msg.at))}</span>
                    <span className="dh-msg-b" dir="auto">
                      {msg.body}
                    </span>
                  </>
                ) : (
                  <span className="dh-msg-t">{tr("ما فيه رسائل بعد")}</span>
                )}
              </div>
              <div className="dh-acts">
                <button type="button" className="dh-cream" onClick={() => onChat(t)}>
                  <MessageCircle size={16} aria-hidden />
                  {tr("كلّموهم")}
                </button>
                <button type="button" className="dh-glass" onClick={() => onOpen(t)}>
                  {tr("افتحوا البحث")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
