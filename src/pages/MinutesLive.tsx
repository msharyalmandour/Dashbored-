import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Check, CircleAlert, FileText, Mic, MicOff, Square } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import { DocAvatar } from "../components/sup/SupParts";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useMeetingMinutes } from "../hooks/useMeetingMinutes";
import { useMeetings } from "../hooks/useMeetings";
import { useCommitments } from "../hooks/useCommitments";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { notifySupervisor } from "../lib/supervisorNotify";
import { toISODate } from "../lib/date";
import { tr } from "../lib/i18n";
import { canTranscribeLive, extractVoice, listen } from "../lib/voice";
import { buildMinutes, clock, emptyDraft, forgotten, loadDraft, ringPct, saveDraft, tagFromKind, TAGS, type Capture, type LiveDraft, type Tag } from "../lib/minutesLive";

/* وضع الاجتماع — القيم منقولة من design-reference/supervisor (MinLiveD/M، SupForgotM، MinSpec):
   حلقة وقت ذهبية تمتلي مرة وتتحدث كل دقيقة (بدون نبض)، «اللي انقال» سطر بسطر بوسمه، و«المحضر يتكوّن» يتجمع لحاله */

const TAG_LABEL: Record<Tag, string> = { point: tr("نقطة"), decision: tr("قرار"), task: tr("مهمة"), question: tr("سؤال") };
const SUP_ID = "supervisor";
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Ring({ pct, size, children }: { pct: number; size: number; children: React.ReactNode }) {
  const r = size / 2 - 7;
  const len = 2 * Math.PI * r;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }} role="img" aria-label={tr("الوقت")}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
        <defs>
          <linearGradient id="ml-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#FFC777" />
            <stop offset="1" stopColor="#FF7A1A" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
        <circle className="ml-ring" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ml-ring)" strokeWidth="6" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - pct)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export default function MinutesLive() {
  const { team, currentUser, canWrite } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { roster } = useTeamRoster();
  const { addMinutes } = useMeetingMinutes();
  const meetings = useMeetings();
  const { items: commitments } = useCommitments();
  const teamId = team?.id ?? "";
  const [d, setD] = useState<LiveDraft>(() => (teamId ? loadDraft(teamId) : null) ?? emptyDraft());
  const [now, setNow] = useState(() => Date.now());
  const [tag, setTag] = useState<Tag>("point");
  const [text, setText] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [interim, setInterim] = useState("");
  const [ending, setEnding] = useState<null | { minutesId: string }>(null);
  const [busy, setBusy] = useState(false);
  const [desk, setDesk] = useState(() => window.matchMedia?.("(min-width: 1024px)").matches ?? true);
  const stopMic = useRef<null | (() => void)>(null);
  const heard = useRef("");
  const input = useRef<HTMLInputElement>(null);

  // نحفظ كل تغيير بالجهاز (لو انقفل المتصفح وسط الاجتماع ما يضيع شي)
  useEffect(() => {
    if (teamId) saveDraft(teamId, d.startedAt ? d : null);
  }, [d, teamId]);
  useEffect(() => {
    const mq = window.matchMedia?.("(min-width: 1024px)");
    const on = () => setDesk(mq.matches);
    mq?.addEventListener("change", on);
    return () => mq?.removeEventListener("change", on);
  }, []);
  // الساعة توقف لما يخلص الاجتماع
  useEffect(() => {
    if (!d.startedAt || ending) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [d.startedAt, ending]);
  // الحضور الافتراضي: الفريق + الدكتورة
  useEffect(() => {
    if (d.startedAt || d.attendance.length || !roster.length) return;
    setD((p) => ({ ...p, attendance: [...roster.map((m) => ({ id: m.id, name: m.name, joinedAt: null })), { id: SUP_ID, name: tr("الدكتورة"), joinedAt: null, role: "supervisor" as const }] }));
  }, [roster, d.startedAt, d.attendance.length]);

  const add = useCallback((c: Omit<Capture, "id" | "at"> & { at?: string }) => setD((p) => ({ ...p, captures: [...p.captures, { id: uid(), at: c.at ?? new Date().toISOString(), ...c }] })), []);
  const who = (id: string | null) => (id ? roster.find((m) => m.id === id) : undefined);

  // المايك يشتغل طول الاجتماع: كل ما يتجمع كلام كافي، الذكاء يطلّع منه سطور موسومة
  const toggleMic = () => {
    if (stopMic.current) {
      stopMic.current();
      stopMic.current = null;
      setMicOn(false);
      setInterim("");
      return;
    }
    const stop = listen(
      (f) => {
        heard.current = `${heard.current} ${f}`.trim();
        if (heard.current.split(/\s+/).length >= 18) {
          const chunk = heard.current;
          heard.current = "";
          void extractVoice(chunk).then((ex) => {
            const items = ex?.items ?? [];
            if (!items.length) add({ by: null, tag: "point", text: chunk.slice(0, 280), auto: true });
            for (const it of items) add({ by: it.assignee_id, tag: tagFromKind(it.kind), text: it.title, auto: true, dueDate: it.due });
          });
        }
      },
      setInterim,
    );
    if (!stop) {
      showToast({ title: tr("متصفحكم ما يكتب الكلام — اكتبوا السطور بأنفسكم"), icon: CircleAlert });
      return;
    }
    stopMic.current = stop;
    setMicOn(true);
  };
  useEffect(() => () => stopMic.current?.(), []);

  const submitLine = (t: Tag = tag) => {
    const v = text.trim();
    if (!v) return;
    add({ by: currentUser?.id ?? null, tag: t, text: v.slice(0, 400) });
    setText("");
  };

  // 1–4 للوسوم (لما ما نكتب بالمربع)
  useEffect(() => {
    if (!d.startedAt) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      const i = ["1", "2", "3", "4"].indexOf(e.key);
      if (i >= 0) {
        setTag(TAGS[i]);
        input.current?.focus();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [d.startedAt]);

  const start = () => {
    const at = new Date().toISOString();
    setD((p) => ({ ...p, title: p.title.trim() || tr("اجتماع الإشراف"), startedAt: at, attendance: p.attendance.map((a) => (a.joinedAt === "pending" ? { ...a, joinedAt: at } : a)) }));
  };
  const toggleAtt = (id: string) =>
    setD((p) => ({ ...p, attendance: p.attendance.map((a) => (a.id === id ? { ...a, joinedAt: a.joinedAt ? null : p.startedAt ? new Date().toISOString() : "pending" } : a)) }));

  const built = useMemo(() => buildMinutes(d), [d]);
  const allText = useMemo(() => d.captures.map((c) => c.text).join(" "), [d.captures]);
  const openReqs = useMemo(() => forgotten(commitments, allText), [commitments, allText]);

  // «خلّصنا»: نحفظ المحضر أول (ما يضيع)، وبعدها «نسيتوا شي؟»
  const finish = async () => {
    if (!currentUser || busy) return;
    stopMic.current?.();
    stopMic.current = null;
    setMicOn(false);
    setBusy(true);
    const endedAt = new Date().toISOString();
    const present = d.attendance.filter((a) => a.joinedAt);
    const { row, error } = await addMinutes({
      meetingDate: toISODate(new Date(d.startedAt ?? endedAt)),
      agenda: d.agenda.join("\n"),
      attendees: present.map((a) => a.name),
      discussion: built.discussion || tr("—"),
      decisions: built.decisions,
      actionItems: built.tasks.map((t) => t.text).join("\n"),
      createdById: currentUser.id,
    });
    if (error || !row) {
      setBusy(false);
      return showToast({ title: tr("ما انحفظ المحضر — جرّبوا مرة ثانية."), icon: CircleAlert });
    }
    if (isSupabaseConfigured) {
      await supabase!
        .from("meeting_minutes")
        .update({ title: d.title.slice(0, 200), room: d.room.slice(0, 120), started_at: d.startedAt, ended_at: endedAt, planned_minutes: d.planned, attendance: d.attendance, captures: d.captures, open_items: built.open })
        .eq("id", row.id)
        .then(() => {}, () => {});
    }
    setBusy(false);
    setEnding({ minutesId: row.id });
  };

  const addForgot = (c: (typeof commitments)[number]) => add({ by: c.assignee_id, tag: "task", text: c.title, linkTaskId: c.created_task_id });

  const send = async () => {
    if (!ending || busy) return;
    setBusy(true);
    const fresh = buildMinutes(d);
    const toCreate = fresh.tasks.filter((t) => !t.linkTaskId);
    const due = toISODate(new Date(Date.now() + 3 * 864e5));
    if (toCreate.length) await meetings.createActions(ending.minutesId, toCreate.map((t) => ({ text: t.text, assigneeId: t.assigneeId ?? currentUser?.id ?? "", dueDate: t.dueDate ?? due })));
    // آخر تحديث للسطور (لو أضافوا من «نسيتوا شي؟»)
    if (isSupabaseConfigured) await supabase!.from("meeting_minutes").update({ captures: d.captures, action_items: fresh.tasks.map((t) => t.text).join("\n") }).eq("id", ending.minutesId).then(() => {}, () => {});
    const r = await meetings.requestApproval(ending.minutesId);
    if (!r.error) {
      void notifySupervisor("minutes", ending.minutesId);
      // طلبها «أرسلوا المحضر بعد الاجتماع» يخلص ← يطلع لها إيصال
      const minutesReq = commitments.filter((c) => c.direction === "from_supervisor" && c.created_task_id && c.status !== "done" && /محضر|minutes/i.test(c.title));
      for (const c of minutesReq) await supabase!.from("tasks").update({ status: "done" }).eq("id", c.created_task_id!).then(() => {}, () => {});
    }
    setBusy(false);
    if (teamId) saveDraft(teamId, null);
    showToast({ title: r.error ? tr("انحفظ المحضر، بس ما انرسل للاعتماد") : tr("انرسل المحضر للدكتورة ✓"), icon: r.error ? CircleAlert : Check });
    navigate(`/meeting-minutes/${ending.minutesId}`);
  };

  if (!team || !currentUser) return null;
  const elapsed = d.startedAt ? now - Date.parse(d.startedAt) : 0;
  const pct = ringPct(elapsed, d.planned);
  const present = d.attendance.filter((a) => a.joinedAt && a.joinedAt !== "pending").length;
  const agendaNow = d.agenda[d.current];

  // ───────── قبل البداية ─────────
  if (!d.startedAt) {
    return (
      <div className="v3 mx-auto max-w-[640px] px-4 pb-[140px] pt-6">
        <section className="sup-glass">
          <div className="text-[12px] font-bold text-[#FFB444]">{tr("وضع الاجتماع")}</div>
          <h1 className="m-0 mt-1 bg-gradient-to-b from-[#FFF6EC] to-[#E9C9A0] bg-clip-text text-[26px] font-extrabold text-transparent">{tr("نبدأ الاجتماع")}</h1>
          <label className="sup-lbl block" htmlFor="ml-title">
            {tr("عنوان الاجتماع")}
          </label>
          <input id="ml-title" className="sup-when" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder={tr("اجتماع الإشراف الأسبوعي")} maxLength={200} />
          <label className="sup-lbl block" htmlFor="ml-room">
            {tr("المكان")}
          </label>
          <input id="ml-room" className="sup-when" value={d.room} onChange={(e) => setD({ ...d, room: e.target.value })} placeholder={tr("قاعة 3 · مبنى التمريض")} maxLength={120} />
          <div className="sup-lbl">{tr("المدة")}</div>
          <div className="mt-1 grid grid-cols-4 gap-1.5" role="group" aria-label={tr("المدة")}>
            {[15, 30, 45, 60].map((m) => (
              <button key={m} type="button" className="ci-seg" aria-pressed={d.planned === m} onClick={() => setD({ ...d, planned: m })}>
                {tr("{0} دقيقة", m)}
              </button>
            ))}
          </div>
          <label className="sup-lbl block" htmlFor="ml-agenda">
            {tr("جدول الأعمال (بند بكل سطر)")}
          </label>
          <textarea id="ml-agenda" className="sup-when !min-h-[110px] py-2" value={d.agenda.join("\n")} onChange={(e) => setD({ ...d, agenda: e.target.value.split("\n").slice(0, 12) })} placeholder={tr("حجم العينة\nأداة القياس\nالموافقة الأخلاقية")} />
          <div className="sup-lbl">{tr("مين حاضر؟")}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {d.attendance.map((a) => (
              <button key={a.id} type="button" className="sup-who" aria-pressed={!!a.joinedAt} onClick={() => toggleAtt(a.id)}>
                {a.role === "supervisor" ? <DocAvatar name={a.name} px={28} /> : <Avatar initials="" name={a.name} avatar={who(a.id)?.avatar ?? undefined} px={28} ring="#1A120E" />}
                {a.name.split(/\s+/)[0]}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="sup-btn-primary" disabled={!canWrite} onClick={start}>
              {tr("بدأنا")}
            </button>
            <button type="button" className="sup-btn-ghost" onClick={() => navigate("/meeting-minutes")}>
              {tr("بعدين")}
            </button>
          </div>
          {!canTranscribeLive() && <p className="m-0 mt-3 text-[13px] text-[#ABA095]">{tr("متصفحكم ما يكتب الكلام — تقدرون تكتبون السطور بأنفسكم.")}</p>}
        </section>
      </div>
    );
  }

  const faces = (
    <div className="flex items-center gap-2">
      <div className="flex">
        {d.attendance.map((a) => (
          <button key={a.id} type="button" className="ml-face" aria-pressed={!!a.joinedAt} aria-label={a.joinedAt ? tr("{0} حاضر", a.name) : tr("علّموا {0} حاضر", a.name)} onClick={() => toggleAtt(a.id)}>
            {a.role === "supervisor" ? <DocAvatar name={a.name} px={30} /> : <Avatar initials="" name={a.name} avatar={who(a.id)?.avatar ?? undefined} px={30} ring="#1A120E" />}
            {a.joinedAt && <i aria-hidden>✓</i>}
          </button>
        ))}
      </div>
      <span className="text-[13px] text-[#EAE3DC]">
        <b>
          {present}/{d.attendance.length}
        </b>{" "}
        {tr("حاضرين")}
      </span>
    </div>
  );

  const line = (c: Capture) => {
    const p = who(c.by);
    const sup = c.by === SUP_ID;
    return (
      <div key={c.id} className={`ml-line${c.tag === "decision" ? " dec" : ""}`}>
        <span className="w-10 flex-none pt-1 text-[12px] text-[#ABA095]" dir="ltr">
          {hhmm(c.at)}
        </span>
        {sup ? <DocAvatar name={tr("الدكتورة")} px={28} /> : p ? <Avatar initials="" name={p.name} avatar={p.avatar ?? undefined} px={28} ring="#1A120E" /> : <span className="ml-mic-av" aria-label={tr("من الصوت")}><Mic size={14} aria-hidden /></span>}
        <div className="min-w-0 flex-1">
          <span className={`sup-chip${c.tag === "decision" || c.tag === "task" ? " gold" : ""}`}>{TAG_LABEL[c.tag]}</span>
          <div className="mt-1 text-[15px] leading-[1.7] text-[#EAE3DC]" dir="auto">
            {c.text}
          </div>
        </div>
      </div>
    );
  };

  const tagBar = (
    <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={tr("وسم السطر")}>
      {TAGS.map((t, i) => (
        <button key={t} type="button" className={`ml-tag${t === "decision" || t === "task" ? " warm" : ""}`} aria-pressed={tag === t} onClick={() => { setTag(t); input.current?.focus(); }}>
          {desk && <small dir="ltr">{i + 1}</small>} {TAG_LABEL[t]}
        </button>
      ))}
    </div>
  );
  const composer = (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); submitLine(); }}>
      <input ref={input} className="sup-when !mt-0 flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder={micOn ? interim || tr("نسمعكم… أو اكتبوا") : tr("اكتبوا سطر ({0})", TAG_LABEL[tag])} aria-label={tr("سطر جديد")} maxLength={400} />
      {desk && (
        <button type="button" className="ml-micbtn" aria-pressed={micOn} aria-label={micOn ? tr("وقّفوا المايك") : tr("شغّلوا المايك")} onClick={toggleMic}>
          {micOn ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
        </button>
      )}
    </form>
  );

  const building = (
    <section className="sup-glass">
      <div className="flex items-center gap-2">
        <span className="text-[#FFC777]">✦</span>
        <b className="flex-1 text-[17px]">{tr("المحضر يتكوّن")}</b>
        <span className="text-[12px] text-[#ABA095]">{tr("لحاله")}</span>
      </div>
      <div className="sup-sec">{tr("القرارات")}</div>
      {built.decisions ? built.decisions.split("\n").map((x, i) => (
        <div key={i} className="ml-built">
          <b className="text-[#FFC777]">{i + 1}</b> <span dir="auto">{x}</span>
        </div>
      )) : <p className="m-0 text-[13px] text-[#ABA095]">{tr("لا شي للحين")}</p>}
      <div className="sup-sec">{tr("بنود العمل")}</div>
      {built.tasks.length ? built.tasks.map((t, i) => {
        const p = who(t.assigneeId);
        return (
          <div key={i} className="ml-built">
            <span aria-hidden className="ml-box" />
            <span className="min-w-0 flex-1" dir="auto">{t.text}</span>
            {p && <Avatar initials="" name={p.name} avatar={p.avatar ?? undefined} px={22} ring="#1A120E" />}
          </div>
        );
      }) : <p className="m-0 text-[13px] text-[#ABA095]">{tr("لا شي للحين")}</p>}
      <div className="sup-sec">{tr("مفتوح")}</div>
      {built.open ? built.open.split("\n").map((x, i) => <div key={i} className="ml-built" dir="auto">{x}</div>) : <p className="m-0 text-[13px] text-[#ABA095]">{tr("لا شي للحين")}</p>}
    </section>
  );

  const forgotSheet = ending &&
    createPortal(
      <>
        <div aria-hidden className="ci-scrim" />
        <section role="dialog" aria-modal="true" aria-labelledby="ml-forgot-h" className="ml-sheet">
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-center gap-3">
            <span className="sup-ic" style={{ width: 44, height: 44, borderRadius: 14 }}>
              <FileText size={20} aria-hidden />
            </span>
            <div>
              <div className="text-[12px] font-bold text-[#FFB444]">{tr("انحفظ المحضر · قبل لا ترسلونه")}</div>
              <h2 id="ml-forgot-h" className="m-0 text-[24px] font-extrabold text-[#F2EBE3]">
                {tr("نسيتوا شي؟")}
              </h2>
            </div>
          </div>
          <p className="m-0 mt-2 text-[14px] text-[#E9D3B8]">
            {!openReqs.length
              ? tr("ما فيه طلبات مفتوحة من الدكتورة ✓")
              : openReqs.length === 1
                ? openReqs[0].covered
                  ? tr("الدكتورة طلبت شي واحد قبل، وانذكر بالمحضر ✓")
                  : tr("الدكتورة طلبت شي واحد قبل، وما انذكر بالمحضر.")
                : tr("الدكتورة طلبت {0} أشياء قبل، و{1} منها ما انذكرت بالمحضر.", openReqs.length, openReqs.filter((x) => !x.covered).length)}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {openReqs.map(({ item, covered }) => (
              <div key={item.id} className={`ml-req${covered ? " ok" : ""}`}>
                <span className={`ml-req-ic${covered ? " ok" : ""}`} aria-hidden>
                  {covered ? <Check size={14} /> : "!"}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[14px]" dir="auto">{item.title}</b>
                  <span className="text-[12px] text-[#ABA095]">{covered ? tr("انذكرت بالمحضر ✓") : tr("ما انذكرت")}</span>
                </div>
                {!covered && (
                  <button type="button" className="ci-cream" onClick={() => addForgot(item)}>
                    {tr("أضيفوها")}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="sup-btn-primary mt-3 w-full" disabled={busy} onClick={() => void send()}>
            {tr("أرسلوا المحضر للدكتورة")}
          </button>
          {openReqs.some((x) => !x.covered) && (
            <button type="button" className="vm-textbtn !text-[#EAE3DC]" onClick={() => openReqs.filter((x) => !x.covered).forEach((x) => addForgot(x.item))}>
              {tr("أضيفوا الكل للمحضر")}
            </button>
          )}
          <button type="button" className="vm-textbtn !text-[#ABA095]" onClick={() => { if (teamId) saveDraft(teamId, null); navigate(`/meeting-minutes/${ending.minutesId}`); }}>
            {tr("أرسله بعدين")}
          </button>
        </section>
      </>,
      document.body,
    );

  // ───────── الجوال (MinLiveM) ─────────
  if (!desk) {
    return (
      <div className="v3 flex min-h-[calc(100vh-160px)] flex-col px-4 pb-[300px] pt-4">
        <div className="flex items-center justify-between">
          <span className="ml-live">{tr("الاجتماع شغّال")}</span>
          {faces}
        </div>
        <div className="mt-4 flex justify-center">
          <Ring pct={pct} size={190}>
            <div className="text-[46px] font-extrabold leading-none text-[#F2EBE3]" dir="ltr">
              {clock(elapsed)}
            </div>
            <div className="mt-2 text-[12px] text-[#ABA095]">{tr("من {0} دقيقة", d.planned)}</div>
          </Ring>
        </div>
        {agendaNow && (
          <p className="m-0 mt-3 text-center text-[13px] text-[#E9D3B8]">
            {tr("البند {0} من {1} · ", d.current + 1, d.agenda.length)}
            <b>{agendaNow}</b>
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">{d.captures.slice(-3).map(line)}</div>
        <div className="ml-mbar">
          {composer}
          <div className="mt-2">{tagBar}</div>
          <div className="mt-2 flex gap-2">
            <button type="button" className="sup-btn-cream flex items-center justify-center gap-2" style={{ flex: 2.4 }} aria-pressed={micOn} onClick={toggleMic}>
              {micOn ? <Square size={16} aria-hidden /> : <Mic size={18} aria-hidden />}
              {micOn ? tr("وقّفوا المايك") : tr("اضغطوا وتكلموا")}
            </button>
            <button type="button" className="sup-btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void finish()}>
              {tr("خلّصنا")}
            </button>
          </div>
        </div>
        {forgotSheet}
      </div>
    );
  }

  // ───────── الديسكتوب (MinLiveD) ─────────
  return (
    <div className="v3 flex flex-col gap-4 px-6 py-6">
      <section className="sup-glass ml-head">
        <Ring pct={pct} size={124}>
          <div className="text-[30px] font-extrabold leading-none text-[#F2EBE3]" dir="ltr">
            {clock(elapsed)}
          </div>
          <div className="mt-1.5 text-[12px] text-[#ABA095]">{tr("من {0} دقيقة", d.planned)}</div>
        </Ring>
        <div className="min-w-0 flex-1">
          <span className="ml-live">{tr("الاجتماع شغّال")}</span>
          <h1 className="m-0 mt-1 truncate bg-gradient-to-b from-[#FFF6EC] to-[#E9C9A0] bg-clip-text text-[36px] font-extrabold text-transparent">{d.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {faces}
            {d.room && <span className="text-[13px] text-[#ABA095]">{d.room}</span>}
          </div>
        </div>
        <button type="button" className="sup-btn-primary !flex-none px-7" disabled={busy} onClick={() => void finish()}>
          {tr("خلّصنا الاجتماع")}
        </button>
      </section>
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)" }}>
        <section className="sup-glass">
          <div className="sup-sec !mt-0">{tr("جدول الأعمال")}</div>
          {d.agenda.length ? d.agenda.map((a, i) => (
            <button key={i} type="button" className={`ml-agenda${i === d.current ? " now" : ""}`} onClick={() => setD({ ...d, current: i })} aria-current={i === d.current}>
              {i < d.current ? <span className="ml-done" aria-label={tr("خلص")}><Check size={13} /></span> : <b className="w-5 text-center text-[#ABA095]">{i + 1}</b>}
              <span className="min-w-0 flex-1 text-start" dir="auto">{a}</span>
              {i === d.current && <span className="text-[12px] font-bold text-[#FFC777]">{tr("الحين")}</span>}
            </button>
          )) : <p className="m-0 text-[13px] text-[#ABA095]">{tr("ما فيه جدول أعمال")}</p>}
        </section>
        <section className="sup-glass flex min-h-[420px] flex-col">
          <div className="flex items-center">
            <b className="flex-1 text-[18px]">{tr("اللي انقال")}</b>
            <span className="text-[12px] text-[#ABA095]">{tr("صوت + كتابة · كل سطر له وسم")}</span>
          </div>
          <div className="mt-2 flex flex-1 flex-col gap-2" aria-live="polite">
            {d.captures.length ? d.captures.map(line) : <p className="m-auto text-[14px] text-[#ABA095]">{tr("شغّلوا المايك أو اكتبوا أول سطر")}</p>}
          </div>
          <div className="ml-composer">
            {tagBar}
            <div className="mt-2">{composer}</div>
          </div>
        </section>
        {building}
      </div>
      {forgotSheet}
    </div>
  );
}
