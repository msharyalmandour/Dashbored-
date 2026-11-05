import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BellRing, BookOpen, Check, CheckSquare, ChevronLeft, CircleAlert, CircleCheck, Copy, CornerUpLeft, FileText, Link2, MessageCircle, MoreHorizontal, Pencil, Plus, Search, SendHorizontal, Trash2, X } from "lucide-react";
import Dialog from "../components/ui/Dialog";
import Avatar from "../components/ui/Avatar";
import { V3Glow } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTeamPresence } from "../hooks/useTeamPresence";
import { usePush } from "../hooks/usePush";
import { useTasksData } from "../hooks/useTasksData";
import { useProposal } from "../hooks/useProposal";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { markChatRead, useTeamChat, type ChatMessage, type ChatRef } from "../hooks/useTeamChat";
import type { TeamMember } from "../data/types";
import { addDaysISO, formatDateShort, relativeDayLabel, toISODate } from "../lib/date";
import { publicBase } from "../lib/publicUrl";
import { tr } from "../lib/i18n";

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";
const time = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? tr("ص") : tr("م")}`;
};

function dayLabel(iso: string) {
  const d = toISODate(new Date(iso));
  const rel = relativeDayLabel(d);
  return rel === tr("اليوم") || rel === tr("أمس") ? rel : formatDateShort(d);
}

/** «آخر ظهور قبل ساعة» */
function ago(iso: string) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return min <= 1 ? tr("قبل دقيقة") : tr("قبل {0} دقيقة", min);
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? tr("قبل ساعة") : tr("قبل {0} ساعات", h);
  const d = Math.round(h / 24);
  return d === 1 ? tr("أمس") : tr("قبل {0} أيام", d);
}

// أحمد/احمد/إحمد نفس الاسم عند الإشارة
const fold = (t: string) => t.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").toLowerCase();

/** روابط و@الأسماء داخل الرسالة */
function richText(body: string, names: string[]): ReactNode[] {
  const parts = body.split(/(https?:\/\/\S+|@\S+)/g);
  return parts.map((p, i) => {
    if (/^https?:\/\//.test(p))
      return (
        <a key={i} href={p} target="_blank" rel="noreferrer" dir="ltr" onClick={(e) => e.stopPropagation()}>
          {p.replace(/^https?:\/\/(www\.)?/, "").slice(0, 38)}
          {p.length > 46 ? "…" : ""}
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

/** مين انشار له بالرسالة (@الاسم) */
function mentionedIds(body: string, roster: TeamMember[], me: string): string[] {
  const tokens = body.match(/@\S+/g) ?? [];
  return roster.filter((m) => m.id !== me && tokens.some((t) => fold(t.slice(1)).startsWith(fold(firstName(m.name))))).map((m) => m.id);
}

const refIcon = (t: ChatRef["type"]) => (t === "task" ? CheckSquare : t === "section" ? FileText : BookOpen);
const refLink = (r: ChatRef) => (r.type === "task" ? `/tasks?task=${r.id}` : r.type === "section" ? `/proposal?section=${r.id}` : "/evidence");
const refKind = (t: ChatRef["type"]) => (t === "task" ? tr("مهمة") : t === "section" ? tr("قسم بالمقترح") : tr("دراسة بالمكتبة"));
const sectionStatus = (s: string) => (s === "done" || s === "approved" ? tr("مكتمل") : s === "in-progress" || s === "draft" ? tr("قيد الكتابة") : tr("ما بدأ"));

const PUSH_ASK_KEY = "wesync.chat.pushAsk.hiddenAt";

/** شريط صغير: «فعّلوا الإشعارات عشان توصلكم رسائل الفريق» — يختفي لما تنفعّل، أو لأسبوع لو قفلوه */
function ChatPushBanner({ userId }: { userId: string }) {
  const { state, ready, enable } = usePush(userId);
  const { showToast } = useToast();
  const [hidden, setHidden] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem(PUSH_ASK_KEY) || 0) < 7 * 864e5;
    } catch {
      return false;
    }
  });
  if (!ready || hidden || state === "on" || state === "unsupported" || state === "busy") return null;
  const hide = () => {
    try {
      localStorage.setItem(PUSH_ASK_KEY, String(Date.now()));
    } catch {
      // ما يهم
    }
    setHidden(true);
  };
  return (
    <div className="tc-push" role="region" aria-label={tr("إشعارات المحادثة")}>
      <BellRing size={18} className="shrink-0 text-[#FFC777]" aria-hidden />
      <p className="m-0 min-w-0 flex-1">
        {state === "denied"
          ? tr("الإشعارات محظورة لهذا الموقع. فعّلوها من إعدادات المتصفح عشان توصلكم رسائل الفريق.")
          : state === "ios-install"
            ? tr("عشان توصلكم رسائل الفريق بالآيفون: افتحوا الموقع بسفاري ← مشاركة ← «إضافة إلى الشاشة الرئيسية»، وبعدها فعّلوا الإشعارات.")
            : tr("فعّلوا الإشعارات عشان توصلكم رسائل الفريق على الجوال حتى لو التطبيق مقفول.")}
      </p>
      {state === "off" && (
        <button
          className="tc-chip"
          onClick={async () => {
            const err = await enable();
            if (err) showToast({ title: tr("ما انفعّلت الإشعارات — حاولوا مرة ثانية."), icon: CircleAlert });
          }}
        >
          {tr("فعّلوها")}
        </button>
      )}
      <button className="tc-icon" onClick={hide} aria-label={tr("إخفاء")}>
        <X size={16} />
      </button>
    </div>
  );
}

/** محادثة الفريق: قروبكم داخل Wesync، وكل رسالة ممكن تصير مهمة أو تشير لمهمة/قسم/دراسة */
export default function TeamChat() {
  const { team, currentUser, isLeader, canWrite, mode } = useAuth();
  const { showToast } = useToast();
  const { roster } = useTeamRoster();
  const online = useTeamPresence();
  const { messages, loaded, unavailable, typers, reads, send, retry, edit, remove, typing, markRead } = useTeamChat();
  const { tasks, addTask } = useTasksData();
  const { sections } = useProposal();
  const { papers } = useEvidencePapers();

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attach, setAttach] = useState<ChatRef | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [refOpen, setRefOpen] = useState(false);
  const [toTask, setToTask] = useState<ChatMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchOn, setSearchOn] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionQ, setMentionQ] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastTyping = useRef(0);
  const press = useRef<number | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerH, setComposerH] = useState(82);

  // مربّع الكتابة ثابت تحت، فنحجز مكانه بآخر القائمة بنفس طوله
  useEffect(() => {
    const el = composerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setComposerH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [unavailable]);

  const people = useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster]);
  const names = useMemo(() => roster.map((m) => firstName(m.name)).filter(Boolean), [roster]);
  const onlineIds = new Set(online.map((u) => u.id));
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  // ننزل لآخر رسالة، ونعلّم المحادثة مقروءة (العدّاد + ✓✓ للباقين)
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const toEnd = () => window.scrollTo({ top: document.documentElement.scrollHeight });
    toEnd();
    const t = setTimeout(toEnd, 150);
    const last = [...messages].reverse().find((m) => !m.pending && !m.failed);
    if (team && currentUser && last) {
      markChatRead(team.id, currentUser.id, last.createdAt);
      markRead(last.createdAt);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, loaded]);

  useEffect(() => {
    const el = document.documentElement;
    if (el.scrollHeight - (window.scrollY + window.innerHeight) < 240) window.scrollTo({ top: el.scrollHeight });
  }, [composerH]);

  // يكبر مع الكتابة لين ٥ أسطر
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  if (!team || !currentUser) return null;

  const who = (id: string) => people.get(id);
  const nameOf = (id: string) => firstName(who(id)?.name ?? (id === currentUser.id ? currentUser.name : tr("عضو")));
  const solo = roster.length <= 1;
  const teamLink = `${publicBase()}#/login?team=${team.id}`;
  const inviteWa = `https://wa.me/?text=${encodeURIComponent(tr("انضموا لفريق بحثنا على Wesync عشان نشتغل على البحث مع بعض: {0}", teamLink))}`;
  const others = roster.filter((m) => m.id !== currentUser.id);
  const onlineCount = roster.filter((m) => m.id === currentUser.id || onlineIds.has(m.id)).length;
  const desktop = typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

  const refSub = (r: ChatRef): string => {
    if (r.type === "task") {
      const t = tasks.find((x) => x.id === r.id);
      return t ? [nameOf(t.assigneeId), t.dueDate ? relativeDayLabel(t.dueDate) : ""].filter(Boolean).join(" · ") : "";
    }
    if (r.type === "paper") {
      const p = papers.find((x) => x.id === r.id);
      return p ? [p.addedById ? tr("أضافها {0}", nameOf(p.addedById)) : "", p.year ? String(p.year) : ""].filter(Boolean).join(" · ") : "";
    }
    const s = sections.find((x) => x.key === r.id);
    return s ? sectionStatus(s.status) : "";
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(teamLink);
      showToast({ title: tr("انتسخ الرابط"), icon: CircleCheck });
    } catch {
      // المتصفح رفض
    }
  };

  const submit = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    if (editing) {
      const { error } = await edit(editing.id, body);
      if (error) showToast({ title: tr("ما انحفظ التعديل — حاولوا مرة ثانية."), icon: CircleAlert });
      setEditing(null);
    } else {
      void send(body, { replyTo: replyTo?.id ?? null, ref: attach, mentions: mentionedIds(body, roster, currentUser.id) });
      setReplyTo(null);
      setAttach(null);
    }
    setText("");
    setMentionQ(null);
    setBusy(false);
    inputRef.current?.focus();
  };

  const onType = (v: string, caret: number) => {
    setText(v);
    const m = v.slice(0, caret).match(/(^|\s)@(\S*)$/);
    setMentionQ(m ? m[2] : null);
    if (Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      typing();
    }
  };

  const mentionList = mentionQ === null ? [] : others.filter((m) => fold(firstName(m.name)).startsWith(fold(mentionQ))).slice(0, 5);
  const pickMention = (m: TeamMember) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@(\S*)$/, `@${firstName(m.name)} `);
    setText(before + text.slice(caret));
    setMentionQ(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  const jumpTo = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlash(id);
    setTimeout(() => setFlash(null), 1500);
  };

  // ضغطة طويلة بالجوال تحدد الرسالة
  const pressStart = (id: string, e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    press.current = window.setTimeout(() => {
      setSelected(id);
      navigator.vibrate?.(10);
    }, 420);
  };
  const pressEnd = () => {
    if (press.current) clearTimeout(press.current);
    press.current = null;
  };

  const shown = query.trim() ? messages.filter((m) => !m.deletedAt && fold(m.body).includes(fold(query.trim()))) : messages;
  const othersReadAll = (m: ChatMessage) => others.length > 0 && others.every((o) => (reads[o.id] ?? "") >= m.createdAt);

  const rows: ReactNode[] = [];
  let prevDay = "";
  shown.forEach((m, idx) => {
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
    const prev = shown[idx - 1];
    const next = shown[idx + 1];
    const sameDay = (x?: ChatMessage) => !!x && toISODate(new Date(x.createdAt)) === day;
    const firstOfRun = !prev || prev.authorId !== m.authorId || !sameDay(prev);
    const lastOfRun = !next || next.authorId !== m.authorId || !sameDay(next);
    const quoted = m.replyTo ? byId.get(m.replyTo) : null;
    const gone = !!m.deletedAt;
    const isSel = selected === m.id;
    const RefIcon = m.ref ? refIcon(m.ref.type) : null;
    const p = who(m.authorId);
    rows.push(
      <div key={m.id} id={`msg-${m.id}`} className={`tc-row${mine ? " me" : ""}${!firstOfRun ? " cont" : ""}${isSel ? " sel" : ""}`}>
        {!mine && (lastOfRun ? <Avatar initials="" name={p?.name ?? "?"} avatar={p?.avatar} px={30} /> : <span className="tc-av-gap" aria-hidden />)}
        <div
          role="group"
          tabIndex={gone || m.pending ? -1 : 0}
          aria-label={tr("رسالة من {0}", mine ? tr("أنت") : nameOf(m.authorId))}
          className={`tc-bubble${m.pending ? " pending" : ""}${m.failed ? " failed" : ""}${gone ? " gone" : ""}${flash === m.id ? " flash" : ""}`}
          onPointerDown={(e) => !gone && !m.pending && !m.failed && pressStart(m.id, e)}
          onPointerUp={pressEnd}
          onPointerLeave={pressEnd}
          onPointerCancel={pressEnd}
          onContextMenu={(e) => {
            if (gone || m.pending || m.failed) return;
            e.preventDefault();
            setSelected(m.id);
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && !gone) {
              e.preventDefault();
              setSelected(isSel ? null : m.id);
            }
          }}
        >
          {gone ? (
            <>
              <span className="tc-text">{tr("انحذفت الرسالة")}</span>
              <span className="tc-meta">{time(m.createdAt)}</span>
            </>
          ) : (
            <>
              {!mine && firstOfRun && <span className="tc-name">{nameOf(m.authorId)}</span>}
              {quoted && (
                <button type="button" className="tc-quote" onClick={() => jumpTo(quoted.id)}>
                  <b>{nameOf(quoted.authorId)}</b>
                  <span>{quoted.deletedAt ? tr("رسالة انحذفت") : quoted.body}</span>
                </button>
              )}
              <span className="tc-text">{richText(m.body, names)}</span>
              {m.ref && RefIcon && (
                <Link to={refLink(m.ref)} className="tc-ref">
                  <span className="tc-ref-ic">
                    <RefIcon size={18} aria-hidden />
                  </span>
                  <span className="tc-ref-tx">
                    <span className="tc-ref-k">{refKind(m.ref.type)}</span>
                    <span className="tc-ref-t" dir="auto">
                      {m.ref.label}
                    </span>
                    {refSub(m.ref) && <span className="tc-ref-s">{refSub(m.ref)}</span>}
                  </span>
                  <ChevronLeft size={16} className="shrink-0 text-[#ABA095] rtl:rotate-0 ltr:rotate-180" aria-hidden />
                </Link>
              )}
              {!m.failed && (
                <span className="tc-meta">
                  {m.editedAt ? tr("معدّلة · {0}", time(m.editedAt)) : time(m.createdAt)}
                  {mine && !m.pending && (othersReadAll(m) ? <span className="tc-read" aria-label={tr("انقرأت")}>✓✓</span> : <span className="tc-sent" aria-label={tr("انرسلت")}>✓</span>)}
                </span>
              )}
            </>
          )}
        </div>
        {!gone && !m.pending && !m.failed && desktop && (
          <button type="button" className="tc-more" aria-label={tr("خيارات الرسالة")} onClick={() => setSelected(m.id)}>
            <MoreHorizontal size={18} />
          </button>
        )}
      </div>,
    );
    if (m.failed) {
      rows.push(
        <span key={`f-${m.id}`} className="tc-failed" style={{ alignSelf: "flex-end" }}>
          {tr("ما انرسلت ·")}
          <button type="button" onClick={() => void retry(m)}>
            {tr("جرّب مرة ثانية")}
          </button>
        </span>,
      );
    }
    if (isSel) {
      rows.push(
        <div key={`a-${m.id}`} className="tc-menu" role="menu" aria-label={tr("خيارات الرسالة")}>
          <button role="menuitem" autoFocus onClick={() => { setReplyTo(m); setSelected(null); inputRef.current?.focus(); }}>
            <CornerUpLeft size={19} aria-hidden />
            {tr("رد")}
          </button>
          {isLeader && canWrite && (
            <button role="menuitem" className="gold" onClick={() => { setSelected(null); setToTask(m); }}>
              <CheckSquare size={19} aria-hidden />
              {tr("حوّلها مهمة")}
            </button>
          )}
          <button role="menuitem" onClick={() => { void navigator.clipboard?.writeText(m.body); setSelected(null); showToast({ title: tr("انتسخت"), icon: CircleCheck }); }}>
            <Copy size={19} aria-hidden />
            {tr("نسخ")}
          </button>
          {mine && (
            <>
              <button role="menuitem" onClick={() => { setEditing(m); setText(m.body); setSelected(null); inputRef.current?.focus(); }}>
                <Pencil size={19} aria-hidden />
                {tr("تعديل")}
              </button>
              <button role="menuitem" className="danger" onClick={() => { void remove(m.id); setSelected(null); }}>
                <Trash2 size={19} aria-hidden />
                {tr("حذف")}
              </button>
            </>
          )}
        </div>,
      );
    }
  });

  const typingPeople = typers.map((id) => who(id)).filter((x): x is TeamMember => !!x);

  // كل كرت إشارة جاء بالمحادثة، الأحدث فوق (لوحة الديسكتوب)
  const refsFeed = [...messages].reverse().filter((m) => m.ref && !m.deletedAt).slice(0, 12);

  return (
    <div className="v3 relative">
      <V3Glow />
      <div className="tc-shell">
        <div className="tc-wrap relative" style={{ "--tc-h": `${composerH}px` } as CSSProperties}>
          <header>
            <div className="tc-head">
              <div className="min-w-0 flex-1">
                <h1 className="tc-title">{tr("محادثة الفريق")}</h1>
                <p className="tc-sub">
                  <span className="dot" aria-hidden>
                    ●{" "}
                  </span>
                  {solo ? tr("أنت لحالك للحين") : onlineCount <= 1 ? tr("محد متصل غيرك الحين · {0} أعضاء", roster.length) : tr("{0} متصلين الحين · {1} أعضاء", onlineCount, roster.length)}
                </p>
              </div>
              <div className="tc-faces" aria-label={tr("أعضاء الفريق")}>
                {roster.slice(0, 5).map((m) => (
                  <Avatar key={m.id} initials="" name={m.name} avatar={m.avatar} px={30} online={m.id === currentUser.id || onlineIds.has(m.id)} />
                ))}
              </div>
              <button type="button" className="tc-round" aria-label={tr("بحث في المحادثة")} aria-pressed={searchOn} onClick={() => { setSearchOn(!searchOn); setQuery(""); }}>
                <Search size={19} />
              </button>
            </div>
            {searchOn && (
              <label className="tc-search">
                <Search size={16} aria-hidden />
                <span className="sr-only">{tr("بحث في المحادثة")}</span>
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("دوّروا كلمة بالرسائل…")} />
                {query && <span className="text-[12px]">{tr("{0} نتيجة", shown.length)}</span>}
              </label>
            )}
          </header>
          {mode === "supabase" && !unavailable && <ChatPushBanner userId={currentUser.id} />}

          {unavailable ? (
            <div className="tc-empty">
              <h2>{tr("المحادثة قريب")}</h2>
              <p>{tr("نجهّزها الحين، وتشتغل أول ما تنفعّل من إدارة الموقع.")}</p>
            </div>
          ) : !loaded ? (
            <div className="tc-list" role="status" aria-label={tr("نجيب رسائلكم…")}>
              {[160, 220, 120, 240, 180].map((w, i) => (
                <div key={i} className={`flex items-end gap-2 ${i % 2 ? "self-end" : "self-start"}`}>
                  {i % 2 === 0 && <span className="tc-skel h-[30px] w-[30px] !rounded-full" />}
                  <span className="tc-skel" style={{ width: w, height: i === 3 ? 64 : 44 }} />
                </div>
              ))}
              <p className="m-0 mt-2 text-center text-[13px] text-[#ABA095]">{tr("نجيب رسائلكم…")}</p>
            </div>
          ) : (
            <div className="tc-list" aria-live="polite">
              {messages.length === 0 &&
                (solo ? (
                  <div className="tc-empty">
                    <div className="flex items-center" aria-hidden>
                      <Avatar initials="" name={currentUser.name} avatar={currentUser.avatar} px={56} />
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="tc-slot">
                          <Plus size={20} />
                        </span>
                      ))}
                    </div>
                    <h2>{tr("ادعوا فريقكم وابدأوا هنا")}</h2>
                    <p>{tr("هنا قروب فريقكم بدل الواتساب: كل رسالة تقدر تصير مهمة، وكل دراسة تنشار لها بضغطة.")}</p>
                    {isLeader ? (
                      <>
                        <a className="tc-cream w-full max-w-[320px]" href={inviteWa} target="_blank" rel="noreferrer">
                          <MessageCircle size={19} aria-hidden />
                          {tr("أرسلوا الدعوة بواتساب")}
                        </a>
                        <button type="button" className="tc-ghost text-[#FFC777]" onClick={copyLink}>
                          <Link2 size={16} aria-hidden />
                          {tr("انسخوا الرابط")}
                        </button>
                      </>
                    ) : (
                      <p className="!text-[13px]">{tr("القائد يرسل رابط الفريق.")}</p>
                    )}
                  </div>
                ) : (
                  <div className="tc-empty">
                    <div className="tc-faces !ms-0" aria-hidden>
                      {roster.slice(0, 5).map((m) => (
                        <Avatar key={m.id} initials="" name={m.name} avatar={m.avatar} px={48} />
                      ))}
                    </div>
                    <h2>{tr("ابدأوا قروبكم هنا")}</h2>
                    <p>{tr("بدل ما تضيع الأشياء بواتساب: اتفقوا هنا، وحوّلوا أي رسالة لمهمة بضغطة.")}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[tr("وش نسوي هالأسبوع؟"), tr("مين ياخذ مراجعة الأدبيات؟"), tr("متى نجتمع؟")].map((q) => (
                        <button key={q} type="button" className="tc-chip" onClick={() => { setText(q); inputRef.current?.focus(); }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              {query.trim() && shown.length === 0 && <p className="m-0 py-8 text-center text-[14px] text-[#ABA095]">{tr("ما لقينا «{0}» بالرسائل.", query.trim())}</p>}
              {rows}
            </div>
          )}
          <div className="tc-spacer" aria-hidden />

          {!unavailable && (
            <div className="tc-composer" ref={composerRef}>
              <div className="tc-typing" aria-live="polite">
                {typingPeople.length > 0 && (
                  <>
                    <Avatar initials="" name={typingPeople[0].name} avatar={typingPeople[0].avatar} px={18} />
                    {tr("{0} يكتب…", typingPeople.map((p) => firstName(p.name)).join(tr(" و")))}
                  </>
                )}
              </div>
              {mentionList.length > 0 && (
                <div className="tc-mentions" role="listbox" aria-label={tr("أشيروا لعضو")}>
                  {mentionList.map((m) => (
                    <button key={m.id} type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => pickMention(m)}>
                      <Avatar initials="" name={m.name} avatar={m.avatar} px={28} online={onlineIds.has(m.id)} ring="#22160F" />
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="tc-box">
                {(replyTo || editing || attach) && (
                  <div className="tc-replying">
                    <span className="min-w-0 flex-1 truncate">
                      {editing ? (
                        <b>{tr("تعديل رسالتكم")}</b>
                      ) : replyTo ? (
                        <>
                          <b>{tr("رد على {0}: ", nameOf(replyTo.authorId))}</b>
                          {replyTo.body}
                        </>
                      ) : (
                        <>
                          <b>{refKind(attach!.type)}: </b>
                          <span dir="auto">{attach!.label}</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      className="tc-icon"
                      aria-label={tr("إلغاء")}
                      onClick={() => {
                        if (editing) setText("");
                        setReplyTo(null);
                        setEditing(null);
                        setAttach(null);
                      }}
                    >
                      <X size={16} />
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
                  <button type="button" className="tc-plus" aria-label={tr("أشيروا لمهمة أو قسم أو دراسة")} disabled={!canWrite} onClick={() => setRefOpen(true)}>
                    <Plus size={20} />
                  </button>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={text}
                    onChange={(e) => onType(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && mentionQ !== null) setMentionQ(null);
                      // بالديسكتوب: Enter يرسل و Shift+Enter سطر جديد. بالجوال Enter سطر جديد
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && desktop) {
                        e.preventDefault();
                        if (mentionList.length > 0) pickMention(mentionList[0]);
                        else void submit();
                      }
                    }}
                    maxLength={4000}
                    disabled={!canWrite}
                    placeholder={canWrite ? tr("اكتبوا للفريق…") : tr("المحادثة للقراءة بس لين يتجدد الاشتراك")}
                    aria-label={tr("رسالتكم للفريق")}
                    className="tc-input outline-none"
                  />
                  <button type="submit" className="tc-send" disabled={busy || !text.trim() || !canWrite} aria-label={editing ? tr("حفظ التعديل") : tr("أرسل")}>
                    {editing ? <Check size={19} strokeWidth={2.4} /> : <SendHorizontal size={19} strokeWidth={2.2} className="ltr:rotate-0 rtl:rotate-180" />}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <aside className="tc-panel" aria-label={tr("الفريق والإشارات")}>
          <section className="hg-card !p-4">
            <h2>{tr("الفريق")}</h2>
            {roster.map((m) => {
              const isTyping = typers.includes(m.id);
              const isOn = m.id === currentUser.id || onlineIds.has(m.id);
              return (
                <div key={m.id} className="tc-member">
                  <Avatar initials="" name={m.name} avatar={m.avatar} px={36} online={isOn} ring="#1A110C" />
                  <span className="min-w-0">
                    <b className="truncate">{m.id === currentUser.id ? tr("{0} (أنت)", firstName(m.name)) : m.name}</b>
                    <small className={isOn || isTyping ? "on" : ""}>{isTyping ? tr("يكتب…") : isOn ? tr("متصل الحين") : reads[m.id] ? tr("آخر ظهور {0}", ago(reads[m.id])) : tr("ما فتح المحادثة للحين")}</small>
                  </span>
                </div>
              );
            })}
          </section>
          <section className="hg-card !p-4">
            <h2>{tr("انشار له بالمحادثة")}</h2>
            {refsFeed.length === 0 && <p className="m-0 text-[13px] leading-relaxed text-[#ABA095]">{tr("لما أحد يشير لمهمة أو قسم أو دراسة بيطلع هنا.")}</p>}
            <div className="flex flex-col gap-2">
              {refsFeed.map((m) => {
                const Icon = refIcon(m.ref!.type);
                return (
                  <Link key={m.id} to={refLink(m.ref!)} className="tc-ref !mt-0">
                    <span className="tc-ref-ic">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="tc-ref-tx">
                      <span className="tc-ref-k">{refKind(m.ref!.type)}</span>
                      <span className="tc-ref-t" dir="auto">
                        {m.ref!.label}
                      </span>
                      <span className="tc-ref-s">{tr("{0} · {1}", nameOf(m.authorId), time(m.createdAt))}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      {selected && <div className="tc-dim" aria-hidden onClick={() => setSelected(null)} />}

      <ReferenceSheet
        open={refOpen}
        onClose={() => setRefOpen(false)}
        onPick={(r) => {
          setAttach(r);
          setRefOpen(false);
          inputRef.current?.focus();
        }}
        tasks={tasks.filter((t) => t.status !== "done").map((t) => ({ type: "task" as const, id: t.id, label: t.title, sub: [nameOf(t.assigneeId), t.dueDate ? relativeDayLabel(t.dueDate) : ""].filter(Boolean).join(" · ") }))}
        sections={sections.map((s) => ({ type: "section" as const, id: s.key, label: s.labelAr, sub: sectionStatus(s.status) }))}
        papers={papers.map((p) => ({ type: "paper" as const, id: p.id, label: p.title, sub: [p.addedById ? tr("أضافها {0}", nameOf(p.addedById)) : "", p.year ? String(p.year) : ""].filter(Boolean).join(" · ") }))}
      />

      {toTask && (
        <MakeTaskSheet
          msg={toTask}
          roster={roster}
          authorName={nameOf(toTask.authorId)}
          defaultAssignee={mentionedIds(toTask.body, roster, "")[0] ?? toTask.authorId}
          onClose={() => setToTask(null)}
          onCreate={async ({ title, assignee, due }) => {
            const { error, id } = await addTask({ title: title.slice(0, 200), description: tr("من محادثة الفريق: «{0}»", toTask.body.slice(0, 400)), assigneeId: assignee, dueDate: due, priority: "medium" });
            if (error) {
              showToast({ title: tr("ما انضافت المهمة — حاولوا مرة ثانية."), icon: CircleAlert });
              return false;
            }
            // رسالة نظام فيها كرت المهمة، وصاحبها ينشار له فيجيه تنبيه
            const assigneeName = firstName(who(assignee)?.name ?? "");
            await send(tr("✓ صارت مهمة على @{0}", assigneeName), { replyTo: toTask.id, ref: id ? { type: "task", id, label: title } : null, mentions: assignee !== currentUser.id ? [assignee] : [] });
            setToTask(null);
            showToast({ title: tr("انضافت لمهام الفريق ✓"), icon: CircleCheck });
            return true;
          }}
        />
      )}
    </div>
  );
}

type PickItem = ChatRef & { sub: string };

/** «أشيروا لشي بالبحث»: ٣ تبويبات بعدادها، بحث، والمختار يتحط كرت بالرسالة */
function ReferenceSheet({ open, onClose, onPick, tasks, sections, papers }: { open: boolean; onClose: () => void; onPick: (r: ChatRef) => void; tasks: PickItem[]; sections: PickItem[]; papers: PickItem[] }) {
  const [tab, setTab] = useState<ChatRef["type"]>("task");
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState<PickItem | null>(null);
  const lists = { task: tasks, section: sections, paper: papers };
  const items = lists[tab].filter((r) => !q.trim() || fold(r.label).includes(fold(q.trim())));
  const close = () => {
    setChosen(null);
    setQ("");
    onClose();
  };
  return (
    <Dialog open={open} onClose={close} title={tr("أشيروا لشي بالبحث")}>
      <div className="flex flex-col gap-3">
        <div className="tc-tabs" role="group" aria-label={tr("النوع")}>
          {(["task", "section", "paper"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tab === t} onClick={() => { setTab(t); setChosen(null); }}>
              {(t === "task" ? tr("مهمة") : t === "section" ? tr("قسم") : tr("دراسة")) + " · " + lists[t].length}
            </button>
          ))}
        </div>
        <label className="tc-search !mt-0">
          <Search size={16} aria-hidden />
          <span className="sr-only">{tr("بحث")}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("دوّروا…")} />
        </label>
        <div className="max-h-[42vh] overflow-y-auto">
          {items.length === 0 && <p className="m-0 p-4 text-center text-[14px] text-[#ABA095]">{tr("ما فيه شي هنا للحين.")}</p>}
          {items.map((r) => {
            const Icon = refIcon(r.type);
            const on = chosen?.id === r.id && chosen.type === r.type;
            return (
              <button key={`${r.type}-${r.id}`} type="button" className="tc-pick" aria-pressed={on} onClick={() => setChosen(r)}>
                <span className="tc-ref-ic">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tc-pick-t" dir="auto">
                    {r.label}
                  </span>
                  {r.sub && <span className="tc-pick-s">{r.sub}</span>}
                </span>
                {on && <Check size={18} className="shrink-0 text-[#FF9A3C]" aria-hidden />}
              </button>
            );
          })}
        </div>
        <button type="button" className="tc-primary w-full" disabled={!chosen} onClick={() => chosen && (onPick({ type: chosen.type, id: chosen.id, label: chosen.label }), setChosen(null), setQ(""))}>
          <span className="truncate">{chosen ? tr("أشيروا لـ «{0}»", chosen.label.length > 28 ? `${chosen.label.slice(0, 28)}…` : chosen.label) : tr("اختاروا شي من القائمة")}</span>
        </button>
      </div>
    </Dialog>
  );
}

/** «حوّلوها مهمة»: العنوان من نص الرسالة، على مين (chips)، والموعد */
function MakeTaskSheet({ msg, roster, authorName, defaultAssignee, onClose, onCreate }: { msg: ChatMessage; roster: TeamMember[]; authorName: string; defaultAssignee: string; onClose: () => void; onCreate: (v: { title: string; assignee: string; due: string }) => Promise<boolean> }) {
  const today = toISODate(new Date());
  const [title, setTitle] = useState(() => msg.body.replace(/@\S+/g, "").replace(/\s+/g, " ").trim().slice(0, 120));
  const [assignee, setAssignee] = useState(defaultAssignee);
  const [dueKind, setDueKind] = useState<"1" | "3" | "7" | "other">("3");
  const [custom, setCustom] = useState(addDaysISO(today, 3));
  const [busy, setBusy] = useState(false);
  const due = dueKind === "other" ? custom : addDaysISO(today, Number(dueKind));
  const who = roster.find((m) => m.id === assignee);
  return (
    <Dialog open onClose={onClose} title={tr("حوّلوها مهمة")}>
      <div className="flex flex-col gap-4">
        <div className="tc-sheet-q">
          <b>{authorName}</b>
          <span className="line-clamp-2">{msg.body}</span>
        </div>
        <label>
          <span className="tc-label">{tr("المهمة")}</span>
          <input className="tc-field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </label>
        <fieldset>
          <legend className="tc-label">{tr("على مين")}</legend>
          <div className="flex flex-wrap gap-2">
            {roster.map((m) => (
              <button key={m.id} type="button" className="tc-chip !ps-1.5" aria-pressed={assignee === m.id} onClick={() => setAssignee(m.id)}>
                <Avatar initials="" name={m.name} avatar={m.avatar} px={30} />
                {firstName(m.name)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="tc-label">{tr("الموعد")}</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["1", tr("بكرا")],
                ["3", tr("بعد 3 أيام")],
                ["7", tr("بعد أسبوع")],
                ["other", tr("تاريخ ثاني")],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" className="tc-chip" aria-pressed={dueKind === k} onClick={() => setDueKind(k)}>
                {label}
              </button>
            ))}
          </div>
          {dueKind === "other" && <input type="date" className="tc-field mt-2" value={custom} min={today} onChange={(e) => setCustom(e.target.value)} aria-label={tr("التاريخ")} />}
        </fieldset>
        <div>
          <button
            type="button"
            className="tc-primary w-full"
            disabled={busy || !title.trim() || !due}
            onClick={async () => {
              setBusy(true);
              const ok = await onCreate({ title: title.trim(), assignee, due });
              if (!ok) setBusy(false);
            }}
          >
            {busy ? tr("لحظة…") : tr("أنشئوا المهمة")}
          </button>
          <p className="tc-help">{tr("توصل {0} تنبيه، وتطلع بمهامه وبالمحادثة.", firstName(who?.name ?? ""))}</p>
        </div>
      </div>
    </Dialog>
  );
}
