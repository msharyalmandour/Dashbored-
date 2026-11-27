import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Check, CircleAlert, CircleCheck, Eye, Lock, Send, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useSupervisorMessages, type SupervisorMessage } from "../hooks/useSupervisorMessages";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { looksTeamOnly } from "../lib/docThread";
import { formatDateShort, formatWeekday } from "../lib/date";
import { downloadIcs } from "../lib/ics";
import { tr } from "../lib/i18n";
import { avatarLetter } from "../lib/avatarLetter";
import { LuxHead } from "../components/lux/Lux";
import { V3Glow } from "../components/v3/WriteHeader";
import { ChatGuard, DocAv, GroupBanner, GroupTabs, GroupsIntro, useGroupsIntro } from "../components/chat/Groups";

/* «مع الدكتورة» (ChatWithDoc / ChatDocM): نفس محادثة الدكتورة اللي تشوفها ببوابتها.
   هوية كريمية دافية: فقاعات الدكتورة كريمية، رسايلنا برتقالية، الإرسال «أرسلوا للدكتورة»، وتحت كل رسالة «تشوفها الدكتورة».
   قبل الإرسال: فحص خفيف (ChatGuard)، وتقدرون تحذفون الرسالة خلال دقيقتين. */

const TWO_MIN = 2 * 60_000;

export default function DocGroup() {
  const { currentUser, team } = useAuth();
  const { showToast } = useToast();
  const { messages, loading, markRead, reply, rsvps, rsvp, remove } = useSupervisorMessages();
  const { roster } = useTeamRoster();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [guard, setGuard] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [introOpen, closeIntro] = useGroupsIntro(currentUser?.id);
  const box = useRef<HTMLDivElement>(null);

  const docName = useMemo(() => {
    const n = [...messages].reverse().find((m) => m.sender === "supervisor" && m.senderName.trim())?.senderName.trim();
    if (!n) return tr("الدكتورة");
    return /^(د\.|د |dr)/i.test(n) ? n : `${tr("د.")} ${n}`;
  }, [messages]);

  useEffect(() => {
    if (messages.some((m) => m.sender === "supervisor" && !m.readAt)) void markRead();
  }, [messages, markRead]);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const sendDoc = async (body: string) => {
    setBusy(true);
    const r = await reply(body);
    setBusy(false);
    if (r.error) return showToast({ title: r.error, icon: CircleAlert });
    setText("");
  };
  const sendTeam = async (body: string) => {
    setBusy(true);
    const ok = !isSupabaseConfigured || !(await supabase!.from("team_messages").insert({ body }).then((x) => x.error));
    setBusy(false);
    if (!ok) return showToast({ title: tr("ما انرسلت — جرّبوا مرة ثانية."), icon: CircleAlert });
    setText("");
    showToast({ title: tr("انرسلت للفريق بس 🔒"), icon: CircleCheck });
  };
  const submit = () => {
    const body = text.trim();
    if (!body || busy) return;
    if (looksTeamOnly(body)) return setGuard(body);
    void sendDoc(body);
  };

  if (!team || !currentUser) return null;
  let lastDay = "";
  return (
    <div className="v3 relative">
      <V3Glow />
      <LuxHead kicker={tr("شغل الفريق")} title={tr("المحادثة")} sub={tr("قروبين: واحد مع الدكتورة، وواحد لكم بس")} />
      <GroupTabs active="doc" docName={docName} unreadDoc={0} unreadTeam={0} />

      <section className="gr-panel doc" aria-label={tr("مع الدكتورة")}>
        <GroupBanner group="doc" docName={docName} />
        <div ref={box} className="gr-msgs" role="log" aria-live="polite">
          {loading && <p className="gr-empty">{tr("نجيب الرسائل…")}</p>}
          {!loading && messages.length === 0 && <p className="gr-empty">{tr("ما فيه رسائل بعد. اسألوا {0} عن أي شي يخص البحث.", docName)}</p>}
          {messages.map((m) => {
            const day = m.createdAt.slice(0, 10);
            const sep = day !== lastDay ? (lastDay = day) : null;
            return (
              <div key={m.id}>
                {sep && <div className="dc-day">{formatDateShort(day)}</div>}
                <Row m={m} me={currentUser.id} docName={docName} roster={roster} myRsvp={rsvps[m.id]} now={now} onRsvp={rsvp} onRemove={async (id) => (await remove(id)) || showToast({ title: tr("فات وقت الحذف (دقيقتين)."), icon: CircleAlert })} />
              </div>
            );
          })}
        </div>

        <div className="gr-comp doc">
          <div className="gr-to">
            <DocAv name={docName} size={22} />
            {tr("ترسلون لـ {0} والفريق", docName)}
          </div>
          <div className="dc-input">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={1500}
              placeholder={tr("اكتبوا للدكتورة…")}
              aria-label={tr("رسالة للدكتورة")}
            />
            <button type="button" className="dc-send" disabled={!text.trim() || busy} onClick={submit}>
              <Send size={17} aria-hidden />
              {tr("أرسلوا للدكتورة")}
            </button>
          </div>
        </div>
      </section>

      {introOpen && <GroupsIntro docName={docName} onDone={closeIntro} />}
      {guard && (
        <ChatGuard
          docName={docName}
          text={guard}
          onClose={() => setGuard(null)}
          onTeam={() => {
            const b = guard;
            setGuard(null);
            void sendTeam(b);
          }}
          onDoc={() => {
            const b = guard;
            setGuard(null);
            void sendDoc(b);
          }}
        />
      )}
    </div>
  );
}

function Row({ m, me, docName, roster, myRsvp, now, onRsvp, onRemove }: { m: SupervisorMessage; me: string; docName: string; roster: { id: string; name: string }[]; myRsvp?: string; now: number; onRsvp: (id: string, v: "yes" | "no" | "other") => Promise<boolean>; onRemove: (id: string) => void }) {
  const doc = m.sender === "supervisor";
  const mine = !doc && m.createdBy === me;
  const t = new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const canDelete = mine && now - Date.parse(m.createdAt) < TWO_MIN;
  const p = m.payload as Record<string, string | number | undefined>;
  return (
    <div className={mine ? "dc-m mine" : "dc-m"}>
      {!mine && (doc ? <DocAv name={docName} size={34} /> : <span className="dc-av">{avatarLetter(m.senderName)}</span>)}
      <div className="dc-col">
        {!mine && (
          <span className="dc-meta">
            {doc ? docName : m.senderName} · <span dir="ltr">{t}</span>
          </span>
        )}
        <div className={doc ? "dc-b cream" : mine ? "dc-b doc" : "dc-b"} dir="auto">
          {m.body}
        </div>
        {m.kind === "request" && (
          <div className="dc-card gold">
            <span className="dc-tick">
              <Check size={14} aria-hidden />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#FFB547" }}>{tr("صار مهمة")}</span>
              <b style={{ display: "block", fontSize: 14 }}>{String(p.title ?? m.body)}</b>
            </div>
            {p.assignee_name && <span className="dc-av sm">{avatarLetter(String(p.assignee_name))}</span>}
            {p.due && <span style={{ fontSize: 12, color: "#ABA095" }}>{formatWeekday(String(p.due))}</span>}
          </div>
        )}
        {m.kind === "meeting" && p.date && (
          <div className="dc-card meet">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="dc-cal">
                <span>{formatWeekday(String(p.date))}</span>
                <b dir="ltr">{new Date(`${p.date}T12:00:00`).getDate()}</b>
              </span>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#FFB547" }}>{tr("موعد اجتماع")}</span>
                <b style={{ display: "block", fontSize: 15 }}>
                  <span dir="ltr">{String(p.time ?? "")}</span>
                  {p.place ? ` · ${p.place}` : ""}
                </b>
                <span style={{ fontSize: 12, color: "#ABA095" }}>{tr("انضاف لتقويم الفريق")}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className={myRsvp === "yes" ? "gr-rsvp on" : "gr-rsvp go"} aria-pressed={myRsvp === "yes"} onClick={() => void onRsvp(m.id, "yes")}>
                {myRsvp === "yes" ? tr("بنحضر ✓") : tr("نحضر ✓")}
              </button>
              <button type="button" className="gr-rsvp" onClick={() => downloadIcs(String(p.date), String(p.time ?? "12:00"), Number(p.duration ?? 30), docName)}>
                {tr("أضيفوه للتقويم")}
              </button>
              {myRsvp !== "no" && (
                <button type="button" className="gr-rsvp" onClick={() => void onRsvp(m.id, "no")}>
                  {tr("ما نقدر")}
                </button>
              )}
            </div>
            {roster.length > 0 && <span style={{ fontSize: 12, color: "#ABA095" }}>{tr("الدكتورة تشوف مين بيحضر")}</span>}
          </div>
        )}
        {m.kind === "approval" && (
          <div className="dc-card gold">
            <Award size={16} aria-hidden />
            <b>{tr("محضر معتمد ✓")}</b>
          </div>
        )}
        {mine && (
          <span className="dc-meta">
            <span dir="ltr">{t}</span> · <Eye size={12} aria-hidden /> {tr("تشوفها الدكتورة")}
            {canDelete && (
              <button type="button" className="gr-del" onClick={() => onRemove(m.id)}>
                <Trash2 size={12} aria-hidden />
                {tr("احذفوها")}
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export function TeamOnlyNote() {
  return (
    <span className="dc-meta">
      <Lock size={11} aria-hidden /> {tr("للفريق بس")}
    </span>
  );
}
