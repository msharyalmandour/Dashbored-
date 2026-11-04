import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, ArrowUp, BookOpen, Check, CheckSquare, Copy, CornerUpLeft, FileText, ListPlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import Dialog from "../components/ui/Dialog";
import { V3Glow } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTeamPresence } from "../hooks/useTeamPresence";
import { useTasksData } from "../hooks/useTasksData";
import { useProposal } from "../hooks/useProposal";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { markChatRead, useTeamChat, type ChatMessage, type ChatRef } from "../hooks/useTeamChat";
import { addDaysISO, formatDateShort, relativeDayLabel, toISODate } from "../lib/date";
import { publicBase } from "../lib/publicUrl";
import { tr } from "../lib/i18n";

const AV_BG = ["linear-gradient(135deg,#FFD9A8,#FF9A3C)", "linear-gradient(135deg,#FFE7C2,#FFB547)", "linear-gradient(135deg,#F7C9A8,#E9774A)", "linear-gradient(135deg,#F2EBE3,#C9B8A6)", "linear-gradient(135deg,#FFC9A0,#D9682C)"];
const NAME_COLORS = ["#FFC777", "#FFB08A", "#E9C9A0", "#FFD9A8", "#F7A86B"];

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const d = toISODate(new Date(iso));
  const rel = relativeDayLabel(d);
  return rel === tr("اليوم") || rel === tr("أمس") ? rel : formatDateShort(d);
}

/** روابط و@الأسماء داخل الرسالة */
// أحمد/احمد/إحمد نفس الاسم عند الإشارة
const fold = (t: string) => t.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").toLowerCase();

function richText(body: string, names: string[]): ReactNode[] {
  const parts = body.split(/(https?:\/\/\S+|@\S+)/g);
  return parts.map((p, i) => {
    if (/^https?:\/\//.test(p))
      return (
        <a key={i} href={p} target="_blank" rel="noreferrer" dir="ltr">
          {p}
        </a>
      );
    if (p.startsWith("@") && names.some((n) => fold(p.slice(1)).startsWith(fold(n))))
      return (
        <span key={i} className="tc-mention">
          {p}
        </span>
      );
    return <Fragment key={i}>{p}</Fragment>;
  });
}

const refIcon = (t: ChatRef["type"]) => (t === "task" ? CheckSquare : t === "section" ? FileText : BookOpen);
const refLink = (r: ChatRef) => (r.type === "task" ? `/tasks?task=${r.id}` : r.type === "section" ? `/proposal?section=${r.id}` : "/evidence");
const refKind = (t: ChatRef["type"]) => (t === "task" ? tr("مهمة") : t === "section" ? tr("قسم بالمقترح") : tr("دراسة بالمكتبة"));

/** محادثة الفريق: قروبكم داخل Wesync، وكل رسالة ممكن تصير مهمة أو تشير لمهمة/قسم/دراسة */
export default function TeamChat() {
  const { team, currentUser, isLeader, canWrite } = useAuth();
  const { showToast } = useToast();
  const { roster } = useTeamRoster();
  const online = useTeamPresence();
  const { messages, loaded, unavailable, typers, send, edit, remove, typing } = useTeamChat();
  const { tasks, addTask } = useTasksData();
  const { sections } = useProposal();
  const { papers } = useEvidencePapers();

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attach, setAttach] = useState<ChatRef | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | ChatRef["type"]>(null);
  const [toTask, setToTask] = useState<{ msg: ChatMessage; title: string; assignee: string; due: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastTyping = useRef(0);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerH, setComposerH] = useState(82);

  // مربّع الكتابة ثابت تحت، فنحجز مكانه بآخر القائمة بنفس طوله (يكبر مع الرد/الإشارة/الأسطر)
  useEffect(() => {
    const el = composerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setComposerH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [unavailable]);

  const people = useMemo(() => new Map(roster.map((m, i) => [m.id, { ...m, i }])), [roster]);
  const names = useMemo(() => roster.map((m) => firstName(m.name)).filter(Boolean), [roster]);
  const onlineIds = new Set(online.map((u) => u.id));
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  // ننزل لآخر رسالة، ونعلّم المحادثة مقروءة
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    // نروح لآخر الصفحة (فيها مكان المربّع الثابت)، ومرة ثانية بعد ما تستقر الصفحة
    const toEnd = () => window.scrollTo({ top: document.documentElement.scrollHeight });
    toEnd();
    const t = setTimeout(toEnd, 150);
    const last = messages[messages.length - 1];
    if (team && currentUser && last && !last.pending) markChatRead(team.id, currentUser.id, last.createdAt);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, loaded]);

  // المربّع كبر (رد/إشارة/أسطر): لو كنا تحت نبقى تحت
  useEffect(() => {
    const el = document.documentElement;
    if (el.scrollHeight - (window.scrollY + window.innerHeight) < 240) window.scrollTo({ top: el.scrollHeight });
  }, [composerH]);

  // مربع الكتابة يكبر مع النص
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(140, el.scrollHeight)}px`;
  }, [text]);

  if (!team || !currentUser) return null;

  const who = (id: string) => people.get(id);
  const solo = roster.length <= 1;
  const teamLink = `${publicBase()}#/login?team=${team.id}`;

  const submit = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    if (editing) {
      const { error } = await edit(editing.id, body);
      if (error) showToast({ title: tr("ما انحفظ التعديل — حاولوا مرة ثانية."), icon: CircleAlert });
      setEditing(null);
    } else {
      const { error } = await send(body, { replyTo: replyTo?.id ?? null, ref: attach });
      if (error) showToast({ title: tr("ما انرسلت الرسالة — تأكدوا من الاتصال وحاولوا مرة ثانية."), icon: CircleAlert });
      setReplyTo(null);
      setAttach(null);
    }
    setText("");
    setBusy(false);
    inputRef.current?.focus();
  };

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      typing();
    }
  };

  const makeTask = async () => {
    if (!toTask) return;
    setBusy(true);
    const { error } = await addTask({ title: toTask.title.trim().slice(0, 200), description: tr("من محادثة الفريق: «{0}»", toTask.msg.body.slice(0, 400)), assigneeId: toTask.assignee, dueDate: toTask.due, priority: "medium" });
    setBusy(false);
    if (error) {
      showToast({ title: tr("ما انضافت المهمة — حاولوا مرة ثانية."), icon: CircleAlert });
      return;
    }
    const assignee = who(toTask.assignee);
    await send(tr("✓ صارت مهمة: «{0}» — {1} · {2}", toTask.title.trim(), firstName(assignee?.name ?? ""), formatDateShort(toTask.due)), { replyTo: toTask.msg.id });
    setToTask(null);
    showToast({ title: tr("انضافت لمهام الفريق ✓"), icon: CircleCheck });
  };

  const pickerItems: ChatRef[] =
    picker === "task"
      ? tasks.filter((t) => t.status !== "done").slice(0, 40).map((t) => ({ type: "task", id: t.id, label: t.title }))
      : picker === "section"
        ? sections.map((s) => ({ type: "section", id: s.key, label: s.labelAr }))
        : picker === "paper"
          ? papers.slice(0, 40).map((p) => ({ type: "paper", id: p.id, label: p.title }))
          : [];

  const avatar = (id: string, ghost = false) => {
    const p = who(id);
    return (
      <span className={`tc-av${ghost ? " ghost" : ""}`} style={{ background: AV_BG[(p?.i ?? 0) % AV_BG.length] }} aria-hidden>
        {(p?.initials || p?.name || "؟").trim().charAt(0)}
      </span>
    );
  };

  const rows: ReactNode[] = [];
  let prevDay = "";
  messages.forEach((m, idx) => {
    const day = toISODate(new Date(m.createdAt));
    if (day !== prevDay) {
      rows.push(
        <span key={`d-${day}`} className="tc-day">
          {dayLabel(m.createdAt)}
        </span>,
      );
      prevDay = day;
    }
    const mine = m.authorId === currentUser.id;
    const prev = messages[idx - 1];
    const next = messages[idx + 1];
    const firstOfRun = !prev || prev.authorId !== m.authorId || toISODate(new Date(prev.createdAt)) !== day;
    const lastOfRun = !next || next.authorId !== m.authorId;
    const p = who(m.authorId);
    const quoted = m.replyTo ? byId.get(m.replyTo) : null;
    const gone = !!m.deletedAt;
    const RefIcon = m.ref ? refIcon(m.ref.type) : null;
    rows.push(
      <div key={m.id} className={`tc-row${mine ? " me" : ""}`} style={{ marginTop: firstOfRun ? 8 : 0 }}>
        {!mine && avatar(m.authorId, !lastOfRun)}
        <button
          type="button"
          className={`tc-bubble${selected === m.id ? " sel" : ""}${m.pending ? " pending" : ""}${gone ? " gone" : ""}`}
          onClick={() => !gone && !m.pending && setSelected(selected === m.id ? null : m.id)}
          aria-expanded={selected === m.id}
        >
          {!mine && firstOfRun && (
            <span className="tc-name" style={{ color: NAME_COLORS[(p?.i ?? 0) % NAME_COLORS.length] }}>
              {firstName(p?.name ?? tr("عضو"))}
            </span>
          )}
          {quoted && !gone && (
            <span className="tc-quote">
              <b>{firstName(who(quoted.authorId)?.name ?? "")}</b>
              <span>{quoted.deletedAt ? tr("رسالة انحذفت") : quoted.body}</span>
            </span>
          )}
          {gone ? <span className="tc-text">{tr("انحذفت الرسالة")}</span> : <span className="tc-text">{richText(m.body, names)}</span>}
          {m.ref && RefIcon && !gone && (
            <Link to={refLink(m.ref)} className="tc-ref" onClick={(e) => e.stopPropagation()}>
              <RefIcon size={16} />
              <span className="min-w-0">
                <small>{refKind(m.ref.type)}</small>
                <span className="block truncate" dir="auto">{m.ref.label}</span>
              </span>
            </Link>
          )}
          <span className="tc-meta">
            {m.editedAt && !gone && <span>{tr("معدّلة")}</span>}
            {m.pending ? <Loader2 size={11} className="animate-spin" /> : <span>{time(m.createdAt)}</span>}
          </span>
        </button>
      </div>,
    );
    if (selected === m.id && !gone) {
      rows.push(
        <div key={`a-${m.id}`} className={`tc-actions${mine ? " me" : ""}`}>
          <button className="tc-act" onClick={() => { setReplyTo(m); setSelected(null); inputRef.current?.focus(); }}>
            <CornerUpLeft size={14} />
            {tr("رد")}
          </button>
          {isLeader && canWrite && (
            <button
              className="tc-act warm"
              onClick={() => {
                setSelected(null);
                setToTask({ msg: m, title: m.body.replace(/\s+/g, " ").slice(0, 120), assignee: m.authorId, due: addDaysISO(toISODate(new Date()), 3) });
              }}
            >
              <ListPlus size={14} />
              {tr("حوّلها مهمة")}
            </button>
          )}
          <button className="tc-act" onClick={() => { void navigator.clipboard?.writeText(m.body); setSelected(null); showToast({ title: tr("انتسخت"), icon: CircleCheck }); }}>
            <Copy size={14} />
            {tr("نسخ")}
          </button>
          {mine && (
            <>
              <button className="tc-act" onClick={() => { setEditing(m); setText(m.body); setSelected(null); inputRef.current?.focus(); }}>
                <Pencil size={14} />
                {tr("تعديل")}
              </button>
              <button className="tc-act danger" onClick={() => { void remove(m.id); setSelected(null); }}>
                <Trash2 size={14} />
                {tr("حذف")}
              </button>
            </>
          )}
        </div>,
      );
    }
  });

  const typingNames = typers.map((id) => firstName(who(id)?.name ?? "")).filter(Boolean);

  return (
    <div className="v3 relative">
      <V3Glow />
      <div className="tc-wrap relative" style={{ "--tc-h": `${composerH}px` } as CSSProperties}>
        <header className="hg-card !p-4 lg:!px-5">
          <div className="tc-head">
            <div className="min-w-0">
              <h1 className="tc-title">{tr("محادثة الفريق")}</h1>
              <p className="tc-sub">{tr("قروبكم داخل Wesync: أي رسالة تقدر تصير مهمة، أو تشير لمهمة أو قسم أو دراسة.")}</p>
            </div>
            <div className="tc-faces" aria-label={tr("أعضاء الفريق")}>
              {roster.slice(0, 5).map((m, i) => (
                <span key={m.id} className="tc-face" style={{ background: AV_BG[i % AV_BG.length] }} title={m.name}>
                  {(m.initials || m.name).trim().charAt(0)}
                  {(m.id === currentUser.id || onlineIds.has(m.id)) && <i aria-label={tr("متصل")} />}
                </span>
              ))}
            </div>
          </div>
        </header>

        {unavailable ? (
          <div className="tc-empty">
            <h2>{tr("المحادثة قريب")}</h2>
            <p>{tr("نجهّزها الحين، وتشتغل أول ما تنفعّل من إدارة الموقع.")}</p>
          </div>
        ) : !loaded ? (
          <div className="tc-empty">
            <Loader2 className="mx-auto animate-spin text-[#ABA095]" size={22} />
          </div>
        ) : (
          <div className="tc-list" aria-live="polite">
            {messages.length === 0 && (
              <div className="tc-empty">
                <h2>{solo ? tr("ادعوا فريقكم وابدأوا هنا") : tr("ابدأوا قروبكم هنا")}</h2>
                <p>{solo ? tr("المحادثة تصير قروبكم بدل واتساب. أرسلوا رابط الفريق لزملائكم، وأول ما ينضمون تشوفون رسائلهم هنا.") : tr("بدل ما تضيع الأشياء بواتساب: اتفقوا هنا، وحوّلوا أي رسالة لمهمة بضغطة.")}</p>
                {solo && isLeader ? (
                  <div className="tc-chips">
                    <a className="tc-act warm" href={`https://wa.me/?text=${encodeURIComponent(tr("انضموا لفريق بحثنا على Wesync عشان نشتغل على البحث مع بعض: {0}", teamLink))}`} target="_blank" rel="noreferrer">
                      {tr("أرسلوا الدعوة بواتساب")}
                    </a>
                  </div>
                ) : (
                  <div className="tc-chips">
                    {[tr("وش نسوي هالأسبوع؟"), tr("مين ياخذ مراجعة الأدبيات؟"), tr("متى نجتمع؟")].map((q) => (
                      <button key={q} className="tc-act" onClick={() => { setText(q); inputRef.current?.focus(); }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {rows}
          </div>
        )}
        <div className="tc-spacer" aria-hidden />

        {!unavailable && (
          <div className="tc-composer" ref={composerRef}>
            <p className="tc-typing m-0" aria-live="polite">
              {typingNames.length > 0 && tr("{0} يكتب…", typingNames.join(tr(" و")))}
            </p>
            {(replyTo || editing || attach) && (
              <div className="tc-replying">
                {editing ? (
                  <span className="min-w-0 flex-1 truncate">
                    <b>{tr("تعديل رسالتكم")}</b>
                  </span>
                ) : replyTo ? (
                  <span className="min-w-0 flex-1 truncate">
                    <b>{tr("رد على {0}: ", firstName(who(replyTo.authorId)?.name ?? ""))}</b>
                    {replyTo.body}
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 truncate">
                    <b>{refKind(attach!.type)}: </b>
                    {attach!.label}
                  </span>
                )}
                <button
                  className="tc-icon !h-8 !w-8"
                  aria-label={tr("إلغاء")}
                  onClick={() => {
                    if (editing) setText("");
                    setReplyTo(null);
                    setEditing(null);
                    setAttach(null);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <form
              className="tc-line"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <button type="button" className="tc-icon" aria-label={tr("أشيروا لمهمة أو قسم أو دراسة")} disabled={!canWrite} onClick={() => setPicker("task")}>
                <Plus size={20} />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                maxLength={4000}
                disabled={!canWrite}
                placeholder={canWrite ? tr("اكتبوا للفريق…") : tr("المحادثة للقراءة بس لين يتجدد الاشتراك")}
                aria-label={tr("رسالتكم للفريق")}
                className="tc-input outline-none"
              />
              <button type="submit" className="tc-send" disabled={busy || !text.trim() || !canWrite} aria-label={editing ? tr("حفظ التعديل") : tr("إرسال")}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : editing ? <Check size={18} strokeWidth={2.6} /> : <ArrowUp size={18} strokeWidth={2.6} />}
              </button>
            </form>
          </div>
        )}
      </div>

      <Dialog open={!!picker} onClose={() => setPicker(null)} title={tr("أشيروا لشي بالبحث")}>
        <div className="tc-tabs" role="group">
          {(["task", "section", "paper"] as const).map((t) => (
            <button key={t} aria-pressed={picker === t} onClick={() => setPicker(t)}>
              {t === "task" ? tr("مهمة") : t === "section" ? tr("قسم") : tr("دراسة")}
            </button>
          ))}
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {pickerItems.length === 0 && <p className="m-0 p-4 text-center text-sm text-[#ABA095]">{tr("ما فيه شي هنا للحين.")}</p>}
          {pickerItems.map((r) => {
            const Icon = refIcon(r.type);
            return (
              <button
                key={`${r.type}-${r.id}`}
                className="tc-pick"
                onClick={() => {
                  setAttach(r);
                  setPicker(null);
                  inputRef.current?.focus();
                }}
              >
                <Icon size={18} className="shrink-0 text-[#FFC777]" />
                <span className="min-w-0 truncate">{r.label}</span>
              </button>
            );
          })}
        </div>
      </Dialog>

      <Dialog open={!!toTask} onClose={() => setToTask(null)} title={tr("حوّلوها مهمة")}>
        {toTask && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              {tr("المهمة")}
              <input value={toTask.title} onChange={(e) => setToTask({ ...toTask, title: e.target.value })} maxLength={200} className="v3-select w-full" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              {tr("على مين")}
              <select value={toTask.assignee} onChange={(e) => setToTask({ ...toTask, assignee: e.target.value })} className="v3-select w-full">
                {roster.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              {tr("الموعد")}
              <input type="date" value={toTask.due} onChange={(e) => setToTask({ ...toTask, due: e.target.value })} className="v3-select w-full [color-scheme:dark]" />
            </label>
            <button type="button" className="v3-bw" onClick={makeTask} disabled={busy || !toTask.title.trim() || !toTask.due}>
              {busy ? tr("لحظة…") : tr("أضيفوها لمهام الفريق")}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
