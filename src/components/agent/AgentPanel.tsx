import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, BarChart3, BookOpen, Clock, Mic, Plus, Send, Undo2, Users, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useProposal } from "../../hooks/useProposal";
import { useTasksData } from "../../hooks/useTasksData";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { useSupervisorFeedback } from "../../hooks/useSupervisorFeedback";
import { useResearchProject } from "../../hooks/useResearchProject";
import { askProjectAgent, type AgentAction, type AskTurn } from "../../hooks/useProjectAgent";
import { insertEvidencePaper } from "../../hooks/useEvidencePapers";
import AgentOrb from "../ui/AgentOrb";
import AgentWave from "../ui/AgentWave";
import StreamedText from "../ui/StreamedText";
import ThinkingLine from "../ui/ThinkingLine";
import AiLockedCard from "../AiLockedCard";
import PaperReaderCard from "../research/PaperReaderCard";
import AgentStreak from "./AgentStreak";
import { Initial, ListenView, NeedsList, NextList, PlanCard, ReceiptCard, type Person } from "./AgentParts";
import { useAgentRun } from "./useAgentRun";
import { buildNeeds, canUndo, daysBetween, isWrite, lightestMember, nextSuggestions, planRows, withEdits, type NeedCard, type PlanRow, type Receipt, type ReceiptItem } from "../../lib/agentPlan";
import { logAgentAction, markUndone, recentReceipts } from "../../lib/agentLog";
import { AGENT_CONTEXT_EVENT, OPEN_AGENT_EVENT } from "../../lib/agentBus";
import { THINKING_STEPS } from "../../lib/agentExtras";
import { homeSection, morePages, sectionForPath } from "../../lib/navSections";
import { hasAiAccess } from "../../lib/plans";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { isEn, tr } from "../../lib/i18n";

/* الوكيل (المرحلة 7) — مكان واحد: الكرة أو Ctrl K تفتح نفس اللوحة من أي صفحة.
   520px على الديسكتوب (بالجهة البعيدة عن القائمة) وشاشة كاملة على الجوال.
   القاعدة: يعرف ← يقترح ← توافقون ← ينفّذ ← إيصال + تراجع. ما يكتب ولا يرسل ولا يحذف شي قبل «وافقوا». */

type Turn =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "agent"; text: string; at: number; links?: { to: string; label: string }[] }
  | { id: number; role: "plan"; request: string; why: string; rows: PlanRow[]; state: "pending" | "running" | "done" }
  | { id: number; role: "receipt"; receipt: Receipt; failed: number; next: string[] };

// المحادثة تبقى لو انقفلت اللوحة أو تنقّلتوا بين الصفحات (لين يتحدّث المتصفح)
let cachedTurns: Turn[] = [];
let seq = 1;

const todayIso = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

function placeFor(pathname: string): string {
  const sec = sectionForPath(pathname);
  if (sec) return sec.label;
  if (pathname === "/") return homeSection.label;
  return morePages.find((m) => pathname === m.to || pathname.startsWith(`${m.to}/`))?.label ?? "Wesync";
}

/** الكرة العائمة + Ctrl K. اللوحة نفسها (وبياناتها) ما تنحمّل إلا لما تنفتح */
export default function AgentPanel() {
  const { mode, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; n: number } | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text ?? "";
      setOpen(true);
      if (text) setPrefill({ text, n: Date.now() });
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener(OPEN_AGENT_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_AGENT_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!currentUser || (mode !== "supabase" && isSupabaseConfigured)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tr("الوكيل (Ctrl K)")}
        title={tr("الوكيل · Ctrl K")}
        data-learn="agent"
        className={clsx("fixed bottom-6 start-6 z-40 hidden rounded-full transition-transform hover:scale-[1.03] print:hidden md:start-[320px]", !open && "md:flex")}
      >
        <AgentOrb size={56} symbol={<AgentWave size={24} color="#1A0802" />} />
      </button>
      {open && <AgentBody onClose={() => setOpen(false)} prefill={prefill} />}
    </>
  );
}

function AgentBody({ onClose, prefill }: { onClose: () => void; prefill: { text: string; n: number } | null }) {
  const { currentUser, team, isLeader, canWrite } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { project } = useResearchProject();
  const { sections, questions } = useProposal();
  const { tasks } = useTasksData();
  const { roster } = useTeamRoster();
  const { events } = useCalendarEvents();
  const { items: feedback } = useSupervisorFeedback();
  const { run, undo } = useAgentRun();

  const [turns, setTurnsState] = useState<Turn[]>(cachedTurns);
  const setTurns = (fn: (t: Turn[]) => Turn[]) =>
    setTurnsState((prev) => {
      cachedTurns = fn(prev);
      return cachedTurns;
    });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listen, setListen] = useState(false);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [recent, setRecent] = useState<Receipt[]>([]);
  const [study, setStudy] = useState<{ key: number; files: File[] } | null>(null);
  const [more, setMore] = useState(false);
  const [ctxLabel, setCtxLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const aiOk = hasAiAccess(team);
  const live = isSupabaseConfigured;
  const today = todayIso();
  const me = currentUser!;
  const people: Person[] = useMemo(() => roster.map((m) => ({ id: m.id, name: m.name, initials: m.initials })), [roster]);
  const nameOf = useCallback((id: string | null) => roster.find((m) => m.id === id)?.name.split(" ")[0] ?? tr("أحد الفريق"), [roster]);
  const supName = project?.supervisorName?.trim() ?? "";
  const nextMeeting = useMemo(
    () =>
      events
        .filter((e) => e.type === "meeting" && e.date >= today)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0] ?? null,
    [events, today],
  );

  useEffect(() => {
    if (prefill?.text) setText(prefill.text);
  }, [prefill?.n, prefill?.text]);
  useEffect(() => {
    const on = (e: Event) => setCtxLabel((e as CustomEvent<{ label: string | null }>).detail?.label ?? null);
    window.addEventListener(AGENT_CONTEXT_EVENT, on);
    return () => window.removeEventListener(AGENT_CONTEXT_EVENT, on);
  }, []);
  useEffect(() => {
    if (team) void recentReceipts(team.id, nameOf).then(setRecent);
  }, [team, nameOf]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, busy]);
  // Esc يقفل (أو يرجع من «نسمعك»)، والتركيز يروح لخانة الكتابة على الديسكتوب
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (listen) setListen(false);
      else onClose();
    };
    window.addEventListener("keydown", key);
    if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
    else panelRef.current?.focus();
    return () => window.removeEventListener("keydown", key);
  }, [listen, onClose]);

  // ── سياق: الموضوع · المقترح % · الفريق · الاجتماع ──
  const filled = sections.filter((s) => s.content.trim()).length;
  const proposalPct = sections.length ? Math.round((filled / sections.length) * 100) : 0;
  const meetIn = nextMeeting ? daysBetween(today, nextMeeting.date) : null;
  const chips = [
    project?.title ? { icon: BookOpen, label: project.title.length > 30 ? `${project.title.slice(0, 30)}…` : project.title } : null,
    sections.length ? { icon: BarChart3, label: tr("المقترح {0}%", proposalPct) } : null,
    { icon: Users, label: supName ? `${roster.length} + ${supName}` : tr("{0} أعضاء", roster.length) },
    meetIn !== null ? { icon: Clock, label: meetIn === 0 ? tr("الاجتماع اليوم") : meetIn === 1 ? tr("الاجتماع بكرة") : tr("الاجتماع بعد {0} أيام", meetIn) } : null,
  ].filter(Boolean) as { icon: typeof BookOpen; label: string }[];

  const needs: NeedCard[] = useMemo(
    () =>
      buildNeeds({
        today,
        isLeader,
        me: me.id,
        members: roster.map((m) => ({ id: m.id, name: m.name })),
        questions: questions.map((q) => q.text).filter((q) => q.trim()),
        feedback: feedback.filter((f) => f.status === "open"),
        supervisorName: supName,
        tasks,
        nextMeeting: nextMeeting ? { title: nextMeeting.title, date: nextMeeting.date } : null,
        sections: sections.map((s) => ({ key: s.key, ownerId: s.ownerId ?? null })),
        deadline: project?.targetSubmissionDate ?? null,
      }),
    [today, isLeader, me.id, roster, questions, feedback, supName, tasks, nextMeeting, sections, project?.targetSubmissionDate],
  );
  const lastUndoable = recent.find((r) => canUndo(r));

  // ── المحادثة ──
  const pushPlan = (request: string, why: string, actions: AgentAction[]) => {
    const rows = planRows(actions, { today, isLeader, canWrite, me: me.id });
    setTurns((t) => [...t, { id: seq++, role: "plan", request, why, rows, state: "pending" }]);
  };

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    if (!live) {
      showToast({ title: tr("الوكيل يشتغل بالنسخة الحقيقية"), desc: tr("سجّلوا دخول بحساب فريقكم."), icon: AlertCircle, tone: "amber" });
      return;
    }
    setText("");
    setMore(false);
    const history: AskTurn[] = turns.flatMap((t): AskTurn[] => (t.role === "user" ? [{ role: "user", text: t.text }] : t.role === "agent" ? [{ role: "agent", text: t.text }] : []));
    setTurns((t) => [...t, { id: seq++, role: "user", text: q }]);
    setBusy(true);
    const r = await askProjectAgent(q, history);
    setBusy(false);
    const actions = r.data?.actions ?? [];
    const writes = actions.filter(isWrite);
    const links = actions.flatMap((a) => (a.type === "open" ? [{ to: a.to, label: a.label }] : []));
    if (writes.length) pushPlan(q, r.data?.answer ?? "", writes);
    else setTurns((t) => [...t, { id: seq++, role: "agent", text: r.data?.answer ?? r.message ?? tr("تعذّر الرد."), at: Date.now(), links }]);
  };

  const goNeed = (n: NeedCard) => {
    if (n.go.kind === "open") {
      navigate(n.go.to);
      onClose();
    } else if (n.go.kind === "ask") void send(n.go.text);
    else {
      setTurns((t) => [...t, { id: seq++, role: "user", text: n.go.kind === "plan" ? n.go.request : "" }]);
      pushPlan(n.go.request, n.go.why, n.go.actions);
    }
  };

  const approve = async (turnId: number, picked: { row: PlanRow; ownerId: string | null; due: string | null }[]) => {
    const turn = turns.find((t) => t.id === turnId);
    if (!turn || turn.role !== "plan" || !team) return;
    setTurns((t) => t.map((x) => (x.id === turnId && x.role === "plan" ? { ...x, state: "running" } : x)));
    const done: ReceiptItem[] = [];
    let failed = 0;
    for (const p of picked) {
      const item = await run(withEdits(p.row, { ownerId: p.ownerId, due: p.due }, today));
      if (item) done.push(item);
      else failed++;
    }
    if (!done.length) {
      setTurns((t) => t.map((x) => (x.id === turnId && x.role === "plan" ? { ...x, state: "pending" } : x)));
      showToast({ title: tr("ما انسوى شي"), desc: tr("جرّبوا مرة ثانية."), icon: AlertCircle, tone: "rose" });
      return;
    }
    const receipt = await logAgentAction({ teamId: team.id, userId: me.id, userName: me.name.split(" ")[0], request: turn.request, summary: turn.request, items: done });
    const busiest = roster.filter((m) => m.id !== me.id).sort((a, b) => tasks.filter((t) => t.assigneeId === b.id && t.status !== "done").length - tasks.filter((t) => t.assigneeId === a.id && t.status !== "done").length)[0];
    const next = nextSuggestions(
      done.map((d) => d.type),
      { nextMeetingTitle: nextMeeting?.title ?? null, busiestName: busiest && busiest.id !== lightestMember(roster, tasks)?.id ? busiest.name.split(" ")[0] : null },
    );
    setTurns((t) => [...t.map((x) => (x.id === turnId && x.role === "plan" ? { ...x, state: "done" as const } : x)), { id: seq++, role: "receipt", receipt, failed, next }]);
    setRecent((r) => [receipt, ...r]);
  };

  const undoReceipt = async (r: Receipt) => {
    if (!team || undoing) return;
    setUndoing(r.id);
    let ok = true;
    for (const it of [...r.items].reverse()) ok = (await undo(it.undo)) && ok;
    await markUndone(team.id, r.id);
    setUndoing(null);
    const undoneAt = new Date().toISOString();
    setTurns((t) => t.map((x) => (x.role === "receipt" && x.receipt.id === r.id ? { ...x, receipt: { ...x.receipt, undoneAt } } : x)));
    setRecent((list) => list.map((x) => (x.id === r.id ? { ...x, undoneAt } : x)));
    showToast(ok ? { title: tr("تراجعنا"), desc: tr("رجّعنا كل شي مثل ما كان."), icon: Undo2, tone: "brand" } : { title: tr("تراجعنا عن بعضها"), desc: tr("فيه خطوة ما رجعت. شيّكوا عليها بمكانها."), icon: AlertCircle, tone: "amber" });
  };

  // ── شرائح «@» بخانة الكتابة: القسم الحالي + شخص + «+n» للباقي ──
  const here = ctxLabel ?? placeFor(pathname);
  const others = people.filter((p) => p.id !== me.id);
  const mentionTargets = [...others.map((p) => ({ key: p.id, label: p.name.split(" ")[0], person: p as Person | null })), ...sections.filter((s) => !s.ownerId).concat(sections.filter((s) => !!s.ownerId)).slice(0, 2).map((s) => ({ key: s.key, label: isEn ? s.labelEn : s.labelAr, person: null }))];
  const mention = (label: string) => {
    setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@${label} `);
    setMore(false);
    inputRef.current?.focus();
  };

  const started = turns.length > 0;
  const hello = me.name.split(" ")[0];
  const hasText = !!text.trim();

  return (
    <>
      <div aria-hidden className="ag-scrim" onClick={onClose} />
      <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={tr("الوكيل")} className={clsx("ag-panel", !started && !listen && "ag-now")}>
        <span aria-hidden className="ag-panel-glow" />
        {listen ? (
          <ListenView
            onClose={() => setListen(false)}
            onSend={(t) => {
              setListen(false);
              void send(t);
            }}
          />
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col gap-4">
            <header className="ag-head">
              <AgentOrb size={44} state={busy ? "thinking" : "idle"} />
              <div className="min-w-0 flex-1 leading-[1.35]">
                <b className="block text-[19px]">{tr("الوكيل")}</b>
                <span className="ag-head-sub block truncate text-[13px]">{tr("يعرف بحثكم · ما يسوي شي بدون موافقتكم")}</span>
              </div>
              <button type="button" className="ag-x" onClick={onClose} aria-label={tr("إغلاق")}>
                <X size={18} />
              </button>
            </header>

            {!aiOk ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <AiLockedCard feature={tr("الوكيل")} />
              </div>
            ) : (
              <>
                <div className={clsx("ag-chips", !started && "ag-d-only")}>
                  {chips.map((c) => (
                    <span key={c.label} className="ag-pill">
                      <c.icon size={12} aria-hidden /> {c.label}
                    </span>
                  ))}
                </div>

                <div className="ag-scroll">
                  {study && currentUser ? (
                    <PaperReaderCard key={study.key} compact initialFiles={study.files} onClose={() => setStudy(null)} onSave={(p) => insertEvidencePaper({ ...p, addedById: currentUser.id })} />
                  ) : !started ? (
                    <>
                      <div className="ag-m-only ag-hello">
                        <span className="text-[16px] font-bold">{tr("هلا {0}", hello)}</span>
                        <h2 className="ag-h1">{tr("وش نخلّص اليوم؟")}</h2>
                      </div>
                      {needs.length > 0 ? (
                        <NeedsList needs={needs} onGo={goNeed} busy={busy} />
                      ) : (
                        <p className="m-0 text-[14px] text-[#E9D3B8]">{tr("ما فيه شي يحتاجكم الحين. اطلبوا أي شي تحت.")}</p>
                      )}
                      {lastUndoable && (
                        <div className="ag-last">
                          <span className="min-w-0 flex-1 truncate text-[13px] text-[#E9D3B8]">{tr("آخر شي سوّيته: {0}", lastUndoable.summary)}</span>
                          <button type="button" className="ag-link" disabled={!!undoing} onClick={() => void undoReceipt(lastUndoable)}>
                            {tr("تراجع")}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <ol className="m-0 flex list-none flex-col gap-3 p-0">
                      {turns.map((t) =>
                        t.role === "user" ? (
                          <li key={t.id} className="ag-user" dir="auto">
                            {t.text}
                          </li>
                        ) : t.role === "agent" ? (
                          <li key={t.id} className="ag-say">
                            <AgentOrb size={26} />
                            <div className="min-w-0 flex-1">
                              <p className="m-0 whitespace-pre-wrap">
                                <StreamedText text={t.text} at={t.at} />
                              </p>
                              {!!t.links?.length && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {t.links.map((l) => (
                                    <button key={l.to} type="button" className="ag-btn glass" onClick={() => (navigate(l.to), onClose())}>
                                      {l.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        ) : t.role === "plan" ? (
                          <li key={t.id} className="flex flex-col gap-3">
                            {t.state !== "done" && (
                              <div className="ag-say">
                                <AgentOrb size={26} />
                                <p className="m-0 flex-1">
                                  {tr("هذي خطتي.")} <b className="text-[#F2EBE3]">{tr("ما بسوي شي لين توافقون")}</b>
                                  {tr("، وتقدرون تشيلون أي خطوة.")}
                                </p>
                              </div>
                            )}
                            {t.state !== "done" && <PlanCard rows={t.rows} why={t.why} people={people} running={t.state === "running"} today={today} onApprove={(p) => void approve(t.id, p)} />}
                          </li>
                        ) : (
                          <li key={t.id} className="flex flex-col gap-4">
                            <ReceiptCard r={t.receipt} failed={t.failed} undoing={undoing === t.receipt.id} onUndo={() => void undoReceipt(t.receipt)} />
                            <NextList items={t.next} onPick={(s) => void send(s)} />
                          </li>
                        ),
                      )}
                      {busy && (
                        <li className="ag-say">
                          <AgentOrb size={26} state="thinking" />
                          <ThinkingLine steps={THINKING_STEPS} />
                        </li>
                      )}
                      <div ref={endRef} />
                    </ol>
                  )}
                </div>

                {/* خانة الكتابة: + · @شرائح · مايك · خط الضوء · إرسال (رمادي لين تكتبون) */}
                <form
                  className="ag-comp"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <span aria-hidden className="ag-comp-glow" />
                  <textarea
                    ref={inputRef}
                    value={text}
                    rows={1}
                    maxLength={800}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={live ? tr("اطلبوا أي شي… مثل «وزّع مهام الأسبوع»") : tr("الوكيل يشتغل بالنسخة الحقيقية")}
                    aria-label={tr("رسالتكم للوكيل")}
                    className="ag-input"
                  />
                  {!started && (
                    <div className="ag-ctx">
                      <input ref={fileRef} type="file" accept="application/pdf,.pdf,image/*" multiple hidden onChange={(e) => (e.target.files?.length && setStudy({ key: Date.now(), files: Array.from(e.target.files) }), (e.target.value = ""))} />
                      <button type="button" className="ag-sq" onClick={() => fileRef.current?.click()} aria-label={tr("أرفقوا دراسة (PDF أو صور)")} title={tr("أرفقوا دراسة: يقرأها ويحطها بجدول الأدبيات بعد موافقتكم")}>
                        <Plus size={17} />
                      </button>
                      <i aria-hidden className="ag-vr" />
                      <button type="button" className="ag-chip" onClick={() => mention(here)}>
                        <span aria-hidden className="ag-chip-orb" />
                        {here}
                      </button>
                      {others[0] && (
                        <button type="button" className="ag-chip" onClick={() => mention(others[0].name.split(" ")[0])}>
                          <Initial p={others[0]} size={24} />
                          {others[0].name.split(" ")[0]}
                        </button>
                      )}
                      {mentionTargets.length > 1 && (
                        <span className="relative">
                          <button type="button" className="ag-more" aria-expanded={more} aria-label={tr("أشخاص وأقسام ثانية")} onClick={() => setMore((m) => !m)} dir="ltr">
                            +{mentionTargets.length - 1}
                          </button>
                          {more && (
                            <span className="ag-pop" role="menu">
                              {mentionTargets.slice(1).map((m) => (
                                <button key={m.key} type="button" role="menuitem" className="ag-pop-i" onClick={() => mention(m.label)}>
                                  {m.person ? <Initial p={m.person} size={22} /> : <span aria-hidden className="ag-chip-orb !h-[22px] !w-[22px]" />}
                                  {m.label}
                                </button>
                              ))}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="ag-row">
                    <button type="button" className="ag-sq lg" onClick={() => setListen(true)} aria-label={tr("تكلّموا")} disabled={!live}>
                      <Mic size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <AgentStreak />
                    </div>
                    <button type="submit" className={clsx("ag-sq lg ag-send", hasText && "on")} disabled={busy || !hasText} aria-label={tr("أرسلوا")}>
                      <Send size={18} className="rtl:-scale-x-100" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
