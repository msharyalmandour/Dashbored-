import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, Check, ChevronLeft, Eye, FileText, LibraryBig, MessageSquareText, PenLine, Undo2, X } from "lucide-react";
import Vessel from "./Vessel";
import { DEST_ICON, DestinationSheet, EditSheet } from "./DropParts";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { useDrop } from "../../hooks/useDrop";
import { supabase } from "../../lib/supabaseClient";
import { CONFIDENT_AT, countOf, DEST_LABEL, DEST_PLACE, deepLink, fileDrop, fileTag, flushOfflineQueue, readDrop, retarget, startDrop, undoDrop, undoMessage, updateResult, type Destination, type DropError, type DropResult, type DropSource } from "../../lib/drops";
import { hasPending, PENDING_EVENT, queueDrop, takePending } from "../../lib/dropQueue";
import { announceFiled, announceLanded, sectionOf } from "../../lib/landed";
import { track } from "../../lib/analytics";
import { tr } from "../../lib/i18n";
import { parseDate } from "../../lib/date";
import type { TeamMember } from "../../data/types";
import { DEMO_DROP, DEMO_ITEMS, DEMO_RESULTS, heroDemo } from "./heroDemo";

/* ═══ هيرو «ارموا» — يطلع فوق أي صفحة ═══
   ١ السحب: ملف يدخل النافذة → الموقع يغمق ويرجع ورا، الوعاء يطلع، والأماكن الستة حوله، «افلتوها هنا».
   ٢ نقرا: الملفات تنسحب للوعاء + 3 خطوات.
   ٣ لقينا N أشياء: كروت من الوعاء بخطوط ذهبية، كل كرت يقول وين بينحط. ما ينحط شي قبل «حطوها بأماكنها».
   ٤ انحطت: خطوط تطير للقائمة + شارة +N، وشريط «انحطت N أشياء بأماكنها · تراجع».
   صفحة «ارموا» (/drop) لها شاشاتها؛ هنا نخدم باقي الصفحات (السحب، الكرة، المحادثة). */

type Phase = "drag" | "absorb" | "reveal" | "error";
const EASE_PLACES: { d: Destination; label: string; icon: typeof Check; x: number; y: number }[] = [
  { d: "library", label: tr("مكتبة الأدلة"), icon: LibraryBig, x: 250, y: 254 },
  { d: "tasks", label: tr("مهامي"), icon: Check, x: 196, y: 444 },
  { d: "minutes", label: tr("محضر اجتماع"), icon: FileText, x: 250, y: 634 },
  { d: "supervisor_note", label: tr("ملاحظات المشرف/ة"), icon: MessageSquareText, x: 1160, y: 254 },
  { d: "calendar", label: tr("التقويم"), icon: CalendarDays, x: 1220, y: 444 },
  { d: "proposal", label: tr("المقترح"), icon: PenLine, x: 1160, y: 634 },
];
// الشرر: يطلع مرة وحدة من فم الوعاء
const EMBERS = [
  [676, 302, 4], [867, 327, 5], [522, 380, 5], [831, 320, 5], [827, 380, 4], [830, 365, 6],
  [901, 304, 4], [710, 283, 5], [688, 371, 3], [729, 326, 6], [816, 344, 6], [730, 352, 3],
];
const W = 1440;
const H = 900;
const px = (x: number) => `${(x / W) * 100}%`;
const py = (y: number) => `${(y / H) * 100}%`;

function useIsWide() {
  const q = "(min-width: 768px)";
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

const tagOf = (name: string, mime?: string | null) => fileTag(name, mime);
const short = (s: string, n = 38) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function GlobalDrop() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { team, currentUser, mode, canWrite, isLeader } = useAuth();
  const { roster } = useTeamRoster();
  const live = mode === "supabase" && !!team && !!currentUser && !!supabase;
  const onDropPage = pathname === "/drop";
  const wide = useIsWide();

  // ── السحب ──
  const [drag, setDrag] = useState<{ count: number; names: { name: string; mime: string }[] } | null>(null);
  const inside = useRef(false);

  // ── الرمية ──
  const [open, setOpen] = useState(false);
  const [dropId, setDropId] = useState<string | null>(null);
  const [starting, setStarting] = useState<{ name: string; mime: string }[] | null>(null);
  const [localErr, setLocalErr] = useState<{ code: DropError; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [moveFor, setMoveFor] = useState<DropResult | null>(null);
  const [editQueue, setEditQueue] = useState<string[]>([]);
  const [landed, setLanded] = useState<{ id: string; n: number; places: string[]; flights: { d: string; len: number }[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const real = useDrop(dropId);
  // للتطوير بس: #/?hero=drag|absorb|reveal|landed يعرض الحالات ببيانات التصميم
  const demo = useMemo(() => heroDemo(), []);
  const [demoResults, setDemoResults] = useState(DEMO_RESULTS);
  const { drop, items, results, reload } = demo ? { drop: demo === "absorb" ? { ...DEMO_DROP, status: "reading" as const } : DEMO_DROP, items: DEMO_ITEMS, results: demo === "absorb" ? [] : demoResults, reload: async () => {} } : real;
  const patchLocal = demo ? (id: string, patch: Partial<DropResult>) => setDemoResults((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))) : real.patchLocal;
  useEffect(() => {
    if (!demo) return;
    if (demo === "drag") setDrag({ count: 2, names: [{ name: "", mime: "application/pdf" }, { name: "", mime: "image/png" }] });
    else if (demo === "landed") {
      setLanded({ id: "demo", n: 4, places: ["مكتبة الأدلة", "مهامي", "ملاحظات المشرف/ة", "التقويم"], flights: [{ d: "search", len: 0 }, { d: "tasks", len: 0 }, { d: "supervisor", len: 0 }, { d: "calendar", len: 0 }] });
      window.setTimeout(() => announceLanded({ search: 1, tasks: 2, supervisor: 1, calendar: 1 }), 50);
    } else {
      setOpen(true);
      setDropId("demo");
    }
  }, [demo]);

  // رميات انحفظت بدون نت: أول ما يرجع النت نقراها
  useEffect(() => {
    if (!live) return;
    const run = () => void flushOfflineQueue(team!.id, currentUser!.id);
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [live, team, currentUser]);

  const close = useCallback(() => {
    setOpen(false);
    setDropId(null);
    setStarting(null);
    setLocalErr(null);
    setEditQueue([]);
    setMoveFor(null);
  }, []);

  const begin = useCallback(
    async (files: File[], text: string, source: DropSource) => {
      if (!team || !currentUser) return;
      setLanded(null);
      setLocalErr(null);
      setDropId(null);
      setOpen(true);
      setStarting(files.length ? files.map((f) => ({ name: f.name, mime: f.type })) : [{ name: text.split("\n")[0].slice(0, 60), mime: "" }]);
      const r = await startDrop(team.id, currentUser.id, { files, text, source });
      setStarting(null);
      if (!("id" in r)) {
        setLocalErr({ code: r.error === "empty" || r.error === "no_team" || r.error === "not_allowed" ? "failed" : r.error, message: r.message });
        return;
      }
      setDropId(r.id);
      await readDrop(r.id);
      // لو فات Realtime شي: نجيب الحالة بعد ما تخلص القراءة
      setTick((t) => t + 1);
    },
    [team, currentUser],
  );
  useEffect(() => {
    if (dropId && !demo) void reload();
  }, [dropId, reload, demo, tick]);

  // رميات من الكرة / المحادثة / المشاركة: نقراها هنا فوق الصفحة نفسها
  useEffect(() => {
    if (!live || onDropPage) return;
    const take = () => {
      if (!hasPending()) return;
      const p = takePending()!;
      void begin(p.files, p.text ?? "", p.source);
    };
    take();
    window.addEventListener(PENDING_EVENT, take);
    return () => window.removeEventListener(PENDING_EVENT, take);
  }, [live, onDropPage, begin]);

  // ── سحب ملفات فوق أي صفحة (dragenter على window) ──
  const enabled = live && canWrite && pathname !== "/evidence";
  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const start = () => (inside.current = true);
    const end = () => (inside.current = false);
    const enter = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      depth += 1;
      const list = Array.from(e.dataTransfer?.items ?? []).filter((i) => i.kind === "file");
      setDrag({ count: Math.max(1, list.length), names: list.slice(0, 2).map((i) => ({ name: "", mime: i.type })) });
    };
    const over = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      // الماوس طلع برّا النافذة
      if (depth === 0 || e.relatedTarget === null) {
        depth = 0;
        setDrag(null);
      }
    };
    const drop = (e: DragEvent) => {
      if (inside.current || !hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDrag(null);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      if (onDropPage) queueDrop(files, "page");
      else void begin(files, "", pathname === "/chat" ? "chat" : "global");
    };
    window.addEventListener("dragstart", start);
    window.addEventListener("dragend", end);
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragstart", start);
      window.removeEventListener("dragend", end);
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [enabled, onDropPage, pathname, begin]);

  // ── Ctrl V بأي صفحة (برا خانات الكتابة): الملفات أو النص الملصوق يروح لـ«ارموا» ──
  useEffect(() => {
    if (!enabled) return;
    const paste = (e: ClipboardEvent) => {
      const el = (e.target as HTMLElement | null) ?? document.activeElement;
      if (el && (el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']") || (el as HTMLElement).isContentEditable)) return;
      if (open || document.querySelector("[role='dialog'][aria-modal='true']")) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      const text = (e.clipboardData?.getData("text/plain") ?? "").trim();
      if (!files.length && text.length < 2) return;
      e.preventDefault();
      if (onDropPage) queueDrop(files, "paste", files.length ? undefined : text);
      else void begin(files, files.length ? "" : text, "paste");
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [enabled, onDropPage, begin, open]);

  // ── النتايج ──
  const shown = useMemo(() => results.filter((r) => !r.undone_at), [results]);
  const included = shown.filter((r) => r.included);
  const nIncluded = included.reduce((s, r) => s + countOf(r), 0);
  const unsure = included.filter((r) => r.confidence < CONFIDENT_AT);
  const status = drop?.status;
  const errCode: DropError | null = localErr?.code ?? (status === "failed" ? drop?.error_code ?? "failed" : null);
  const phase: Phase | null = drag ? "drag" : !open ? null : errCode ? "error" : dropId && status === "ready" ? "reveal" : "absorb";

  // Esc: يلغي السحب أو يقفل الهيرو (الرمية تبقى بـ«آخر اللي رميتوه» لو جاهزة)
  useEffect(() => {
    if (!phase) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || moveFor || editQueue.length) return;
      if (phase === "drag") setDrag(null);
      else close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [phase, close, moveFor, editQueue.length]);

  // مرة وحدة لكل رمية
  const seen = useRef("");
  useEffect(() => {
    const k = errCode ? `e:${dropId}:${errCode}` : phase === "reveal" ? `r:${dropId}` : "";
    if (!k || seen.current === k) return;
    seen.current = k;
    if (errCode) track("drop_error", { code: errCode, hero: 1 });
    else track("drop_results_shown", { results: results.length, hero: 1 });
  }, [phase, errCode, dropId, results.length]);

  const say = (m: string) => {
    setNote(m);
    window.setTimeout(() => setNote((t) => (t === m ? null : t)), 6000);
  };
  const toggle = (r: DropResult, v: boolean) => {
    patchLocal(r.id, { included: v });
    void updateResult(r.id, { included: v }).then((x) => x.error && (patchLocal(r.id, { included: !v }), say(x.error)));
  };
  const move = (to: Destination) => {
    const r = moveFor;
    setMoveFor(null);
    if (!r || to === r.destination) return;
    const payload = retarget(r, to);
    if (!payload) return say(tr("ما تنفع بهالمكان"));
    patchLocal(r.id, { destination: to, payload, confidence: 1 });
    void updateResult(r.id, { destination: to, payload, confidence: 1 }).then((x) => x.error && say(x.error));
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveEdit = (title: string, payload: Record<string, any>) => {
    const id = editQueue[0];
    setEditQueue((q) => q.slice(1));
    if (!id) return;
    patchLocal(id, { title, payload, confidence: 1 });
    void updateResult(id, { title, payload, confidence: 1 }).then((x) => x.error && say(x.error));
  };
  const reviewOneByOne = () => setEditQueue((unsure.length ? unsure : included).map((r) => r.id));

  const file = async () => {
    if (!dropId || busy) return;
    setBusy(true);
    const r = await fileDrop(dropId);
    setBusy(false);
    if (r.error) return say(r.error);
    const filed = included;
    const dest: Record<string, number> = {};
    const bySection: Record<string, number> = {};
    for (const x of filed) {
      dest[x.destination] = (dest[x.destination] ?? 0) + countOf(x);
      const sec = sectionOf(deepLink(x));
      if (sec) bySection[sec] = (bySection[sec] ?? 0) + countOf(x);
    }
    track("drop_filed", { created: r.created ?? 0, hero: 1, ...dest });
    announceFiled({ dropId, names: items.map((i) => i.name), files: items.filter((i) => i.kind === "file").length, created: r.created ?? 0, dests: dest });
    if ((r.created ?? 0) > 0) void supabase!.functions.invoke("push-notify", { body: { action: "drop", dropId } }).catch(() => {});
    const places = [...new Set(filed.map((x) => DEST_PLACE[x.destination]))];
    const id = dropId;
    close();
    // خطوط تطير من الشريط للقائمة الجانبية (لو ظاهرة)
    const flights = wide ? Object.keys(bySection).map((d) => ({ d, len: 1400 })) : [];
    setLanded({ id, n: r.created ?? nIncluded, places, flights });
    announceLanded(bySection);
    window.setTimeout(() => setLanded((l) => (l?.id === id ? { ...l, flights: [] } : l)), 1900);
    window.setTimeout(() => setLanded((l) => (l?.id === id ? null : l)), 9000);
  };
  const undo = async () => {
    if (!landed) return;
    const r = await undoDrop(landed.id);
    setLanded(null);
    if (r.error) return say(r.error);
    track("drop_undo", { removed: r.removed ?? 0, kept: r.kept?.length ?? 0, hero: 1 });
    announceLanded({});
    say(undoMessage(r));
  };

  // ── كم ملف/صفحة/صورة ──
  const names = starting ?? items.map((i) => ({ name: i.name, mime: i.mime ?? "" }));
  const nFiles = names.length;
  const nImages = (starting ?? items).filter((i) => /^image\//.test(i.mime ?? "")).length;
  const nPages = items.reduce((s, i) => s + (i.page_count ?? 0), 0);
  const fileWord = nFiles === 1 ? (nImages === 1 ? tr("صورة وحدة") : tr("ملف واحد")) : nFiles === 2 ? tr("ملفين") : tr("{0} ملفات", nFiles);
  const kicker = [nFiles > 1 ? tr("{0} ملفات", nFiles) : null, nPages ? tr("{0} صفحات", nPages) : null, nImages === 1 ? tr("صورة وحدة") : nImages > 1 ? tr("{0} صور", nImages) : null].filter(Boolean).join(" · ") || fileWord;
  const readLabel = nFiles === 1 ? (nImages === 1 ? tr("قرينا الصورة") : tr("قرينا الملف")) : nFiles === 2 ? tr("قرينا الملفين") : tr("قرينا {0} ملفات", nFiles);
  const step = starting || !drop || status === "uploading" ? 1 : shown.length ? 3 : 2;

  const overlay = (() => {
    if (!phase) return null;
    if (phase === "drag")
      return (
        <DragHero count={drag!.count} mimes={drag!.names.map((n) => n.mime)} wide={wide} />
      );
    if (phase === "error") return <ErrorHero code={errCode!} message={localErr?.message} onClose={close} onRetry={() => (dropId && !localErr ? void readDrop(dropId).then(() => reload()) : close())} onPricing={() => (close(), navigate("/pricing"))} />;
    if (phase === "absorb")
      return wide ? (
        <div className="hd-stage" role="dialog" aria-modal="true" aria-label={tr("نقرا اللي رميتوه…")}>
          <Rings />
          <div className="absolute" style={{ left: "50%", top: py(340), transform: "translate(-50%,-50%)" }}>
            <div className="relative" style={{ filter: "brightness(1.1)" }}>
              <Vessel size={Math.min(500, Math.round(window.innerHeight * 0.56))} state="reading" />
              <span className="hd-pulse3" aria-hidden />
            </div>
          </div>
          <Embers />
          {names.slice(0, 2).map((f, i) => (
            <div key={i} aria-hidden className={`hd-file hd-sink`} style={{ left: px(600 + i * 50), top: py(250 + i * 36), animationDelay: `${i * 0.12}s`, ["--r" as string]: i ? "9deg" : "-8deg", ["--s" as string]: i ? ".38" : ".5" } as CSSProperties}>
              <span dir="ltr">{tagOf(f.name, f.mime)}</span>
              <span dir="auto">{f.name}</span>
            </div>
          ))}
          <div className="hd-tin absolute inset-x-0 text-center" style={{ top: py(590) }}>
            <div className="hd-kick">{kicker}</div>
            <h1 className="hd-h1 mt-1.5 text-[64px]">{tr("نقرا اللي رميتوه…")}</h1>
            <div className="mt-[22px]">
              <Steps step={step} readLabel={readLabel} />
            </div>
            <div className="hd-bar" aria-hidden>
              <i style={{ width: `${step === 1 ? 24 : step === 2 ? 58 : 86}%` }} />
            </div>
          </div>
          <button type="button" className="hd-glass absolute bottom-[34px] left-1/2 -translate-x-1/2" onClick={close}>
            {tr("إلغاء")}
          </button>
        </div>
      ) : (
        <div className="hd-m" role="dialog" aria-modal="true" aria-label={tr("نقرا اللي رميتوه…")}>
          <MTop label={sourceLabel(drop?.source)} onClose={close} />
          <div className="hd-m-body flex flex-col items-center text-center">
            <div className="relative mt-2">
              <Vessel size={250} state="reading" />
              <span className="hd-pulse3" aria-hidden />
              {names[0] && (
                <div aria-hidden className="hd-file hd-sink" style={{ left: 25, top: 70, ["--s" as string]: ".55" } as CSSProperties}>
                  <span dir="ltr">{tagOf(names[0].name, names[0].mime)}</span>
                  <span dir="auto">{names[0].name}</span>
                </div>
              )}
            </div>
            <div className="hd-kick mt-1">{kicker}</div>
            <h1 className="hd-h1 mt-1 text-[32px]">{tr("نقرا اللي رميتوه…")}</h1>
            <div className="hd-m-steps">
              <Steps step={step} readLabel={readLabel} vertical />
            </div>
            <div className="hd-bar !w-[260px]" aria-hidden>
              <i style={{ width: `${step === 1 ? 24 : step === 2 ? 58 : 86}%` }} />
            </div>
          </div>
        </div>
      );
    // ── لقينا N أشياء ──
    // العدد = الكروت (المهام ×2 كرت واحد) — زي التصميم «لقينا 4 أشياء»
    const nAll = shown.length;
    const noteLine = unsure.length === 1 ? tr("وحدة تحتاج تتأكدون منها: {0}", short(unsure[0].title, 40)) : unsure.length > 1 ? tr("{0} تحتاج تتأكدون منها", unsure.length) : drop?.summary || tr("كل شي واضح");
    const cards = shown.map((r, i) => <HeroCard key={r.id} r={r} i={i} roster={roster} isLeader={isLeader} onToggle={(v) => toggle(r, v)} onMove={() => setMoveFor(r)} />);
    if (!wide)
      return (
        <div className="hd-m" role="dialog" aria-modal="true" aria-label={tr("لقينا {0} أشياء", nAll)}>
          <MTop label={sourceLabel(drop?.source)} onClose={close} />
          <div className="hd-m-body">
            <div className="hd-tin pb-4 pt-6 text-center">
              <h1 className="hd-h1 text-[32px]">{tr("لقينا {0} أشياء", nAll)}</h1>
              <p className="hd-sub m-0 mt-1 text-[14px]">{tr("شوفوا وين بتنحط قبل لا نحطها")}</p>
            </div>
            <div className="flex flex-col gap-3">{cards}</div>
          </div>
          <div className="hd-m-dock">
            <button type="button" className="hd-glass !min-h-[52px] !rounded-[18px]" onClick={reviewOneByOne} disabled={!included.length}>
              {tr("راجعوها")}
            </button>
            <button type="button" className="hd-go flex-1" onClick={file} disabled={!nIncluded || busy || !canWrite}>
              {busy ? tr("نحطها…") : tr("حطوها بأماكنها")}
            </button>
          </div>
        </div>
      );
    const cols = Math.min(4, Math.max(1, shown.length));
    return (
      <div className="hd-stage flex flex-col items-center px-12 pb-[34px] pt-6" role="dialog" aria-modal="true" aria-label={tr("لقينا {0} أشياء", nAll)}>
        <div className="flex-none" style={{ marginBottom: -28 }}>
          <Vessel size={240} state="hover" style={{ filter: "brightness(1.05)" }} />
        </div>
        <div className="hd-tin pointer-events-none flex-none text-center">
          <h1 className="hd-h1 text-[46px]">{tr("لقينا {0} أشياء", nAll)}</h1>
          <div className="hd-sub mt-0.5 text-[15px]">{tr("شوفوا وين بتنحط · تقدرون تشيلون أي وحدة أو تغيّرون مكانها")}</div>
        </div>
        <Threads cols={cols} />
        <div className="min-h-0 w-full flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: "thin" }}>
          <div className="grid gap-[22px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {cards}
          </div>
        </div>
        <div className="hd-dock hd-tin w-full flex-none">
          <span className="hd-gold" aria-hidden>
            <Check size={17} strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1 leading-[1.4]">
            <b className="text-[16px]">{tr("{0} من {1} مختارة", included.length, nAll)}</b>
            <div className="truncate text-[13px] text-[#ABA095]">{noteLine}</div>
          </div>
          <button type="button" className="hd-glass !min-h-[52px] !rounded-[18px] !text-[15px]" onClick={reviewOneByOne} disabled={!included.length}>
            {tr("راجعوها وحدة وحدة")}
          </button>
          <button type="button" className="hd-go" onClick={file} disabled={!nIncluded || busy || !canWrite}>
            {busy ? tr("نحطها…") : tr("حطوها بأماكنها")}
            <ChevronLeft size={18} className="ltr:rotate-180" aria-hidden />
          </button>
        </div>
      </div>
    );
  })();

  const editing = shown.find((r) => r.id === editQueue[0]) ?? null;
  return (
    <>
      {overlay &&
        createPortal(
          <div className="hd-root" dir={document.documentElement.dir || "rtl"}>
            <div className={`hd-dim${phase === "reveal" ? " deep" : ""}`} aria-hidden />
            <div className="hd-glow" aria-hidden />
            {wide && <div className="hd-frame" aria-hidden />}
            {overlay}
          </div>,
          document.body,
        )}
      <DestinationSheet r={moveFor} onClose={() => setMoveFor(null)} onPick={move} />
      <EditSheet r={editing} roster={roster} onClose={() => setEditQueue((q) => q.slice(1))} onSave={saveEdit} />
      {landed &&
        createPortal(
          <>
            {landed.flights.length > 0 && <Flights ids={landed.flights.map((f) => f.d)} />}
            <div role="status" className="hd-toast">
              <span className="hd-gold" aria-hidden>
                <Check size={17} strokeWidth={2.6} />
              </span>
              <b className="whitespace-nowrap text-[16px]">{tr("انحطت {0} أشياء بأماكنها", landed.n)}</b>
              <span className="hd-places">{landed.places.join(" · ")}</span>
              <button type="button" className="hd-glass !px-4" onClick={undo}>
                <Undo2 size={16} aria-hidden />
                {tr("تراجع")}
              </button>
            </div>
          </>,
          document.body,
        )}
      {note &&
        createPortal(
          <div role="status" className="hd-toast !z-[130]">
            <span className="text-[14px]">{note}</span>
          </div>,
          document.body,
        )}
    </>
  );
}

function sourceLabel(s?: DropSource) {
  if (s === "share") return tr("من المشاركة");
  if (s === "chat") return tr("من المحادثة");
  if (s === "orb") return tr("من الكرة");
  return tr("ارموا أي شي");
}

function MTop({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="hd-m-top">
      <span className="text-[13px] font-bold text-[#E9D3B8]">{label}</span>
      <button type="button" className="hd-x end-4 top-2.5" onClick={onClose} aria-label={tr("إغلاق")}>
        <X size={18} />
      </button>
    </div>
  );
}

function Rings() {
  return (
    <svg aria-hidden className="hd-orb" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="hd-rgd" x1="0" x2="1">
          <stop offset="0" stopColor="#FFC777" stopOpacity="0" />
          <stop offset=".5" stopColor="#FFC777" stopOpacity=".7" />
          <stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="720" cy="430" rx="430" ry="250" fill="none" stroke="rgba(255,199,119,0.10)" vectorEffect="non-scaling-stroke" />
      <ellipse cx="720" cy="430" rx="340" ry="196" fill="none" stroke="url(#hd-rgd)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <ellipse cx="720" cy="430" rx="520" ry="300" fill="none" stroke="rgba(255,199,119,0.06)" strokeDasharray="2 10" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Embers() {
  return (
    <>
      {EMBERS.map(([x, y, s], i) => (
        <i key={i} aria-hidden className="hd-emb" style={{ left: px(x), top: py(y), width: s, height: s, animationDelay: `${(i % 6) * 0.08}s` }} />
      ))}
    </>
  );
}

function DragHero({ count, mimes, wide }: { count: number; mimes: string[]; wide: boolean }) {
  const vsize = Math.min(500, Math.round(window.innerHeight * 0.52));
  const sub = count === 1 ? tr("ملف واحد") : count === 2 ? tr("ملفين") : tr("{0} ملفات", count);
  return (
    <div className="hd-stage" role="dialog" aria-label={tr("افلتوا الملفات")}>
      {wide && <Rings />}
      {wide && (
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {EASE_PLACES.map((p) => (
            <path key={p.d} d={`M${p.x} ${p.y} Q ${(p.x + 720) / 2} ${0.5 * p.y + 155} 720 430`} fill="none" stroke="rgba(255,199,119,0.14)" strokeWidth="1.2" strokeDasharray="3 7" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      )}
      {wide &&
        EASE_PLACES.map((p, i) => {
          const Icon = DEST_ICON[p.d] ?? p.icon;
          return (
            <div key={p.d} aria-hidden className="hd-place hd-cin" style={{ left: px(p.x), top: py(p.y), animationDelay: `${0.1 + i * 0.15}s` }}>
              <Icon size={17} strokeWidth={1.8} />
              {p.label}
            </div>
          );
        })}
      <div className="absolute" style={{ left: "50%", top: wide ? py(330) : "34%", transform: "translate(-50%,-50%)" }}>
        <div className="hd-vin">
          <div className="hd-warm">
            <Vessel size={wide ? vsize : 280} state="hover" />
          </div>
        </div>
      </div>
      <Embers />
      {wide && (
        <>
          {mimes.slice(0, 2).map((m, i) => (
            <div key={i} aria-hidden className="hd-file" style={{ left: px(812 + i * 38), top: py(64 + i * 44), transform: `rotate(${i ? 7 : -9}deg) scale(${i ? 0.94 : 1})`, animation: `hdIn .5s ease-out ${i * 0.08}s both` }}>
              <span dir="ltr">{/^image\//.test(m) ? "IMG" : /pdf/.test(m) ? "PDF" : "FILE"}</span>
              <span>{/^image\//.test(m) ? tr("صورة") : tr("ملف")}</span>
            </div>
          ))}
          {count > 1 && (
            <span className="hd-count" style={{ left: px(1032), top: py(52) }} dir="ltr">
              {count}
            </span>
          )}
        </>
      )}
      <div className="hd-tin absolute inset-x-0 px-4 text-center" style={{ top: wide ? py(618) : "62%" }}>
        <div className="hd-h1" style={{ fontSize: wide ? 84 : 44, textShadow: "0 10px 60px rgba(255,120,20,.25)", lineHeight: 1 }}>
          {tr("افلتوها هنا")}
        </div>
        <p className="hd-sub m-0 mt-3.5" style={{ fontSize: wide ? 19 : 15 }}>
          {tr("{0} · نقراها، نطلّع اللي فيها، ونوريكم وين تنحط قبل لا نحطها", sub)}
        </p>
      </div>
      {wide && (
        <div className="hd-foot">
          <span>{tr("PDF · صور · سكرين شوت · روابط · فويس")}</span>
          <span>·</span>
          <span>
            <kbd dir="ltr">Esc</kbd> {tr("للإلغاء")}
          </span>
        </div>
      )}
    </div>
  );
}

function Steps({ step, readLabel, vertical }: { step: number; readLabel: string; vertical?: boolean }) {
  const labels = [step > 1 ? readLabel : tr("نستلم اللي رميتوه"), tr("نطلّع الدراسات والمهام والمواعيد"), tr("نحدد مكان كل شي")];
  return (
    <div role="status" aria-live="polite" className={vertical ? "flex flex-col items-start gap-3.5" : "hd-steps"}>
      {labels.map((l, i) => {
        const n = i + 1;
        const st = n < step ? "done" : n === step ? "on" : "";
        return (
          <div key={n} className="contents">
            {i > 0 && !vertical && <span aria-hidden className={`hd-link${n <= step ? " on" : ""}`} />}
            <div className={`hd-step ${st}`}>
              <span className="hd-dot" aria-hidden>
                {st === "done" ? <Check size={14} strokeWidth={3} /> : st === "on" ? <i /> : null}
              </span>
              {l}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** الخطوط الذهبية من الوعاء لكل كرت */
function Threads({ cols }: { cols: number }) {
  const xs = Array.from({ length: cols }, (_, i) => ((i + 0.5) / cols) * 1000);
  return (
    <svg aria-hidden className="w-full flex-none" height="66" viewBox="0 0 1000 66" preserveAspectRatio="none">
      {xs.map((x, i) => (
        <g key={i}>
          <path d={`M500 0 Q ${(x + 500) / 2} 40 ${x} 58`} fill="none" stroke="rgba(255,199,119,0.55)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" style={{ ["--len" as string]: 700, strokeDasharray: 700, animation: `hdDraw .7s cubic-bezier(.2,.8,.2,1) ${0.15 + i * 0.12}s both` } as CSSProperties} />
          <circle cx={x} cy="61" r="3" fill="#FFC777" />
        </g>
      ))}
    </svg>
  );
}

const AV_BG = ["#FFE3C2", "#FF9A5A", "#FFC85A", "#FFB2A6", "#E9C9A0"];

function HeroCard({ r, i, roster, isLeader, onToggle, onMove }: { r: DropResult; i: number; roster: TeamMember[]; isLeader: boolean; onToggle: (v: boolean) => void; onMove: () => void }) {
  const Icon = DEST_ICON[r.destination] ?? FileText;
  const p = r.payload ?? {};
  const n = countOf(r);
  let body: ReactNode;
  switch (r.destination) {
    case "library": {
      const cells = (
        [
          [tr("الدولة"), p.country],
          [tr("التصميم"), p.design],
          [tr("العينة"), p.sample],
          [tr("النتيجة"), p.finding],
          [tr("الهدف"), p.aim],
        ] as [string, unknown][]
      )
        .filter(([, v]) => typeof v === "string" && v.trim() && !/غير مذكور/.test(v))
        .slice(0, 4);
      body = cells.length ? (
        <div className="grid grid-cols-2 gap-1.5">
          {cells.map(([k, v]) => (
            <div key={k} className="hd-cell">
              <div>{k}</div>
              <div dir="auto" title={String(v)}>
                {String(v)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-[#ABA095]" dir="auto">
          {[p.authors, p.year].filter(Boolean).join(" · ")}
        </div>
      );
      break;
    }
    case "supervisor_note":
      body = (
        <div className="hd-quote" dir="auto">
          «{p.comments?.[0]?.text ?? r.title}»{(p.comments?.length ?? 0) > 1 ? ` + ${tr("{0} غيرها", p.comments.length - 1)}` : ""}
        </div>
      );
      break;
    case "tasks":
      body = (
        <div>
          {(p.tasks ?? []).slice(0, 4).map((t: { title: string; owner_id: string | null; due: string }, k: number) => {
            const oi = roster.findIndex((m) => m.id === t.owner_id);
            return (
              <div key={k} className="hd-task">
                <i aria-hidden />
                <b dir="auto">{t.title}</b>
                {t.due && <small>{weekday(t.due)}</small>}
                {oi >= 0 && (
                  <span className="hd-av" style={{ background: AV_BG[oi % AV_BG.length] }} title={roster[oi].name}>
                    {roster[oi].name.trim().charAt(0)}
                  </span>
                )}
              </div>
            );
          })}
          {(p.tasks?.length ?? 0) > 4 && <div className="text-[12px] text-[#ABA095]">{tr("و{0} غيرها", p.tasks.length - 4)}</div>}
          {!isLeader && <div className="mt-1 text-[12px] text-[#FFC777]">{tr("تنتظر القائد — هو اللي يضيف المهام")}</div>}
        </div>
      );
      break;
    case "calendar": {
      const ev = (p.events ?? [])[0] as { title: string; date: string; time?: string } | undefined;
      body = ev ? (
        <div className="flex items-center gap-3.5">
          <div className="hd-day">
            <div>{weekday(ev.date)}</div>
            <b dir="ltr">{ev.date ? parseDate(ev.date).getDate() : "—"}</b>
          </div>
          <div className="min-w-0 leading-[1.5]">
            <b className="block truncate text-[16px]" dir="auto">
              {ev.title}
            </b>
            <div className="text-[13px] text-[#ABA095]">{[ev.time, ev.date ? monthName(ev.date) : ""].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
      ) : null;
      break;
    }
    case "minutes":
      body = (
        <div className="hd-quote" dir="auto">
          {p.discussion || p.agenda || r.title}
        </div>
      );
      break;
    default: {
      const t: string = p.text || p.question || p.tool_name || p.why || p.name || "";
      body = t ? (
        <div className="hd-quote" dir="auto">
          {t}
        </div>
      ) : null;
    }
  }
  return (
    <article className={`hd-card hd-rv${r.included ? "" : " off"}`} style={{ animationDelay: `${0.12 * i + 0.1}s` }}>
      <div className="flex items-center gap-2.5">
        <span className="hd-card-ic" aria-hidden>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1 leading-[1.35]">
          <div className="hd-card-k">
            {DEST_LABEL[r.destination]}
            {n > 1 && (
              <b className="text-[12px] text-[#FFC777]" dir="ltr">
                ×{n}
              </b>
            )}
          </div>
          <div className="hd-card-t" dir="auto" title={r.title}>
            {r.title}
          </div>
        </div>
        <button type="button" role="switch" aria-checked={r.included} aria-label={tr("مضمّنة")} className="dr-switch" onClick={() => onToggle(!r.included)}>
          <span>
            <i />
          </span>
        </button>
      </div>
      <div className="mt-2.5 min-h-0 flex-1">{body}</div>
      <div className="mt-2 flex items-center gap-2">
        {r.confidence >= CONFIDENT_AT ? (
          <span className="hd-pill">
            <Check size={12} strokeWidth={2.6} aria-hidden /> {tr("متأكدين")}
          </span>
        ) : (
          <span className="hd-pill warn">
            <Eye size={12} aria-hidden /> {tr("تأكدوا منها")}
          </span>
        )}
        <span className="flex-1" />
        <button type="button" className="hd-move" onClick={onMove}>
          <ArrowLeftRight size={14} aria-hidden />
          {tr("غيّروا المكان")}
        </button>
      </div>
    </article>
  );
}

function weekday(iso: string): string {
  try {
    return parseDate(iso).toLocaleDateString(document.documentElement.lang === "en" ? "en-GB" : "ar-SA-u-ca-gregory-nu-latn", { weekday: "long" });
  } catch {
    return "";
  }
}
function monthName(iso: string): string {
  try {
    return parseDate(iso).toLocaleDateString(document.documentElement.lang === "en" ? "en-GB" : "ar-SA-u-ca-gregory-nu-latn", { month: "long" });
  } catch {
    return "";
  }
}

/** خطوط تطير من الشريط تحت لأماكنها بالقائمة الجانبية */
function Flights({ ids }: { ids: string[] }) {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = vw / 2;
    const sy = vh - 66;
    setPaths(
      ids
        .map((id) => document.querySelector(`[data-nav-id="${id}"]`)?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r && r.width > 0)
        .map((r) => {
          const ex = document.documentElement.dir === "ltr" ? r.right - 20 : r.left + 20;
          const ey = r.top + r.height / 2;
          return `M${sx} ${sy} C ${sx} ${sy - 260}, ${ex + (ex > sx ? -200 : 200)} ${ey + 40}, ${ex} ${ey}`;
        }),
    );
  }, [ids]);
  return (
    <svg aria-hidden className="hd-flight" width="100%" height="100%">
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#FFC777" strokeOpacity=".75" strokeWidth="1.4" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </svg>
  );
}

function ErrorHero({ code, message, onClose, onRetry, onPricing }: { code: DropError; message?: string; onClose: () => void; onRetry: () => void; onPricing: () => void }) {
  const E: Record<DropError, { title: string; body: string; action?: string; run?: () => void }> = {
    unreadable: { title: tr("الصورة مو واضحة"), body: tr("صوّروها أقرب ومع إضاءة أحسن، ونقراها على طول.") },
    unsupported: { title: tr("هذا النوع ما نقراه للحين"), body: tr("صدّروه PDF أو Word وارموه.") },
    nothing_found: { title: tr("ما لقينا شي نرتبه"), body: tr("شكله ملف عادي. نحطه بالملفات؟") },
    offline: { title: tr("النت مفصول"), body: tr("حفظناه عندكم، وأول ما يرجع النت نقراه لحاله.") },
    ai_limit: { title: tr("خلصت قراءات هالشهر"), body: tr("كبّروا الباقة أو استنوا الشهر الجاي."), action: tr("شوفوا الباقات"), run: onPricing },
    too_large: { title: tr("الرمية كبيرة"), body: tr("الحد 10 ملفات و25 ميغا للملف. قسّموها وارموها مرة ثانية.") },
    failed: { title: tr("ما زبطت هالمرة"), body: tr("صار شي من عندنا. جرّبوا مرة ثانية."), action: tr("جرّبوا مرة ثانية"), run: onRetry },
  };
  const e = E[code] ?? E.failed;
  return (
    <div className="hd-stage flex flex-col items-center justify-center px-6 text-center" role="alertdialog" aria-modal="true" aria-label={e.title}>
      <div className="hd-vin">
        <Vessel size={220} state="dim" />
      </div>
      <h1 className="hd-h1 mt-2 text-[34px]">{e.title}</h1>
      <p className="hd-sub m-0 mt-2 max-w-md text-[15px] leading-[1.7]">{code === "offline" && message ? message : e.body}</p>
      <div className="mt-5 flex gap-2">
        {e.action && (
          <button type="button" className="dr-cream !min-h-[48px] !px-6" onClick={e.run}>
            {e.action}
          </button>
        )}
        <button type="button" className="hd-glass !min-h-[48px]" onClick={onClose}>
          {tr("إغلاق")}
        </button>
      </div>
    </div>
  );
}
