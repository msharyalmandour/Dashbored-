import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Camera, Check, ChevronLeft, Download, ExternalLink, FileSearch, Folder, Lock, Paperclip, Sparkles, Undo2, WifiOff } from "lucide-react";
import Vessel from "../components/drop/Vessel";
import { DEST_ICON, DestinationSheet, EditSheet, FileIcon, ResultCard } from "../components/drop/DropParts";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import { useDrop } from "../hooks/useDrop";
import { supabase } from "../lib/supabaseClient";
import { ACCEPT, countOf, DEST_LABEL, DEST_NOUN, DEST_PLACE, deepLink, detectPaste, fileDrop, listRecent, readDrop, retarget, startDrop, undoDrop, undoMessage, updateResult, type Destination, type DropError, type DropResult, type DropSource, type RecentDrop } from "../lib/drops";
import { tr } from "../lib/i18n";
import { track } from "../lib/analytics";
import { formatDateShort } from "../lib/date";
import { hasPending, PENDING_EVENT, takePending } from "../lib/dropQueue";
import { announceFiled } from "../lib/landed";

/* ═══ «ارموا أي شي» (/drop) ═══
   ارموا → نقرا (الوعاء يبلع الملف) → «تأكدوا قبل لا نحطها» (كروت لكل مكان) → «حطوها بمكانها» (عملية وحدة) → «انحطّت».
   كل شي يتسجل برمية (drops)، والتراجع يشيل اللي انخلق بس لو ما أحد عدّله. */

/** نفس حد lg بالتصميم: الجوال والديسكتوب لهم وعاء مختلف، والمشهد الـ 3D يروح للظاهر بس */
function useIsDesktop() {
  const q = "(min-width: 1024px)";
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

const kindWord = (n: number, mime?: string | null, name = "") => {
  if (n > 1) return tr("{0} عناصر", n);
  if (/^image\//.test(mime ?? "")) return tr("صورة");
  if (/pdf/.test(mime ?? "") || /\.pdf$/i.test(name)) return "PDF";
  if (/^https?:/i.test(name)) return tr("رابط");
  if (!mime) return tr("نص");
  return tr("ملف");
};

export default function Drop() {
  const { team, currentUser, isLeader, canWrite } = useAuth();
  const { roster } = useTeamRoster();
  const { project } = useResearchProject();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const dropId = params.get("d");
  const { drop, items, results, reload, patchLocal } = useDrop(dropId);

  const [view, setView] = useState<"idle" | "paste">(params.get("paste") ? "paste" : "idle");
  const [text, setText] = useState("");
  const [starting, setStarting] = useState<{ names: string[]; mime?: string } | null>(null);
  const [localErr, setLocalErr] = useState<{ code: DropError; message: string; ext?: string } | null>(null);
  const [limitInfo, setLimitInfo] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<DropResult | null>(null);
  const [editFor, setEditFor] = useState<DropResult | null>(null);
  const [recent, setRecent] = useState<RecentDrop[]>([]);
  // المسرح مرسوم على 1096×560 (زي المرجع) ويتصغّر بنفس النسبة لو الشاشة أضيق
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageK, setStageK] = useState(1);
  // حركة الدخول (DropEnter): مرة لكل دخول، وما تعيد لو رجعتوا خلال 10 دقايق
  const [enter] = useState(() => {
    try {
      const last = Number(localStorage.getItem("wesync.dropEnterAt") || 0);
      if (Date.now() - last < 10 * 60e3) return false;
      localStorage.setItem("wesync.dropEnterAt", String(Date.now()));
    } catch {
      /* بدون تخزين: نلعبها */
    }
    return true;
  });
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setStageK(Math.min(1, e.contentRect.width / 1096)));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const [zoneOver, setZoneOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const live = !!team && !!currentUser && !!supabase;
  const isDesk = useIsDesktop();

  const refreshRecent = useCallback(() => {
    if (live) void listRecent().then(setRecent);
  }, [live]);
  useEffect(refreshRecent, [refreshRecent, dropId]);

  const say = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 6000);
  };

  // ── الرمي ──
  const begin = useCallback(
    async (files: File[], txt: string, source: DropSource) => {
      if (!team || !currentUser) return;
      setLocalErr(null);
      setStarting({ names: files.length ? files.map((f) => f.name) : [txt.split("\n")[0].slice(0, 60)], mime: files[0]?.type });
      const r = await startDrop(team.id, currentUser.id, { files, text: txt, source });
      setStarting(null);
      if (!("id" in r)) {
        if (r.error === "empty" || r.error === "no_team" || r.error === "not_allowed") return say(r.message);
        setLocalErr({ code: r.error, message: r.message });
        return;
      }
      setText("");
      setView("idle");
      setParams({ d: r.id });
      const res = await readDrop(r.id);
      if (res.error_code === "ai_limit") setLimitInfo((res as { limit?: number }).limit ?? null);
      void reload();
    },
    [team, currentUser, setParams, reload],
  );
  const takeFiles = (list: FileList | File[] | null | undefined, source: DropSource = "page") => {
    const files = list ? Array.from(list) : [];
    if (files.length && canWrite) void begin(files, "", source);
  };

  useEffect(() => {
    const take = () => {
      if (!hasPending() || !live) return;
      const p = takePending()!;
      void begin(p.files, p.text ?? "", p.source);
    };
    take();
    window.addEventListener(PENDING_EVENT, take);
    return () => window.removeEventListener(PENDING_EVENT, take);
  }, [begin, live]);

  // ── النتايج ──
  const shown = useMemo(() => results.filter((r) => !r.undone_at), [results]);
  const included = shown.filter((r) => r.included);
  const nIncluded = included.reduce((s, r) => s + countOf(r), 0);
  const nAll = shown.reduce((s, r) => s + countOf(r), 0);
  const selected = shown.find((r) => r.id === sel) ?? shown[0] ?? null;

  const toggle = (r: DropResult, v: boolean) => {
    patchLocal(r.id, { included: v });
    void updateResult(r.id, { included: v }).then((x) => x.error && (patchLocal(r.id, { included: !v }), say(x.error)));
  };
  const move = (to: Destination) => {
    const r = moveFor;
    setMoveFor(null);
    if (!r || to === r.destination) return;
    const payload = retarget(r, to);
    if (!payload) return;
    patchLocal(r.id, { destination: to, payload, confidence: 1 });
    void updateResult(r.id, { destination: to, payload, confidence: 1 }).then((x) => x.error && say(x.error));
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveEdit = (title: string, payload: Record<string, any>) => {
    const r = editFor;
    setEditFor(null);
    if (!r) return;
    patchLocal(r.id, { title, payload, confidence: 1 });
    void updateResult(r.id, { title, payload, confidence: 1 }).then((x) => x.error && say(x.error));
  };
  const file = async () => {
    if (!dropId || busy) return;
    setBusy(true);
    const r = await fileDrop(dropId);
    setBusy(false);
    if (r.error) return say(r.error);
    const dest: Record<string, number> = {};
    for (const x of results.filter((x) => x.included)) dest[x.destination] = (dest[x.destination] ?? 0) + countOf(x);
    track("drop_filed", { created: r.created ?? 0, ...dest });
    announceFiled({ dropId, names: items.map((i) => i.name), files: items.filter((i) => i.kind === "file").length, created: r.created ?? 0, dests: dest });
    // إشعار لباقي الفريق (للي مفعّلين الإشعارات)
    if ((r.created ?? 0) > 0) void supabase!.functions.invoke("push-notify", { body: { action: "drop", dropId } }).catch(() => {});
    await reload();
    refreshRecent();
  };
  const ignore = async () => {
    if (dropId) await supabase!.from("drops").update({ status: "undone" }).eq("id", dropId).eq("status", "ready");
    setParams({});
    refreshRecent();
  };
  const undo = async (id: string) => {
    const r = await undoDrop(id);
    if (r.error) return say(r.error);
    track("drop_undo", { removed: r.removed ?? 0, kept: r.kept?.length ?? 0 });
    say(undoMessage(r));
    if (id === dropId) setParams({});
    refreshRecent();
  };
  const again = () => {
    setLocalErr(null);
    setParams({});
    setView("idle");
  };
  // ما لقينا شي: الملفات نفسها تنحط بالملفات
  const toFiles = async () => {
    if (!dropId || !project || !currentUser) return;
    const { data } = await supabase!.from("drop_items").select("name, mime, size, storage_path").eq("drop_id", dropId).eq("kind", "file");
    const rows = (data ?? []).map((i) => ({ research_project_id: project.id, name: i.name, mime_type: i.mime ?? "application/octet-stream", size_bytes: i.size ?? 0, category: "general", uploaded_by: currentUser.id, storage_path: i.storage_path }));
    if (rows.length) {
      const { error } = await supabase!.from("files").insert(rows);
      if (error) return say(tr("ما انحفظت — جرّبوا مرة ثانية."));
    }
    navigate("/files");
  };

  // ── أي شاشة؟ ──
  const status = drop?.status;
  const reading = !!starting || (!!dropId && (!drop || status === "uploading" || status === "reading"));
  const errCode: DropError | null = localErr?.code ?? (status === "failed" ? drop?.error_code ?? "failed" : null);
  // مرة وحدة لكل رمية: النتايج انعرضت / الخطأ
  const seen = useRef("");
  const seenKey = errCode ? `e:${dropId ?? ""}:${errCode}` : dropId && status === "ready" ? `r:${dropId}` : "";
  useEffect(() => {
    if (!seenKey || seen.current === seenKey) return;
    seen.current = seenKey;
    if (errCode) track("drop_error", { code: errCode });
    else track("drop_results_shown", { results: results.length });
  }, [seenKey, errCode, results.length]);

  const inputs = (
    <>
      <input ref={fileRef} type="file" multiple hidden accept={ACCEPT} onChange={(e) => (takeFiles(e.target.files), (e.target.value = ""))} />
      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => (takeFiles(e.target.files), (e.target.value = ""))} />
    </>
  );
  const toastEl = toast && (
    <div role="status" className="dr-card dr-in fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-2xl px-4 py-3 text-[14px] text-ws-text md:bottom-8">
      {toast}
    </div>
  );
  const sheets = (
    <>
      <DestinationSheet r={moveFor} onClose={() => setMoveFor(null)} onPick={move} />
      <EditSheet r={editFor} roster={roster} onClose={() => setEditFor(null)} onSave={saveEdit} />
    </>
  );

  if (!live)
    return (
      <div className="dr-page mx-auto max-w-md py-10 text-center">
        <Vessel size={220} className="mx-auto" />
        <h1 className="dr-title text-[30px]">{tr("ارموا أي شي")}</h1>
        <p className="mt-2 text-[15px] text-ws-text-accent">{tr("هذي الميزة تشتغل بحساب فريقكم الحقيقي.")}</p>
      </div>
    );

  // ── خطأ ──
  if (errCode) {
    const ext = items.find((i) => i.kind === "file")?.name.match(/\.[a-z0-9]+$/i)?.[0];
    const E: Record<DropError, { icon: ReactNode; title: string; body: string; action: string; run: () => void }> = {
      unreadable: { icon: <Sparkles size={18} />, title: tr("الصورة مو واضحة"), body: tr("صوّروها أقرب ومع إضاءة أحسن، ونقراها على طول."), action: tr("صوّروها مرة ثانية"), run: () => (again(), camRef.current?.click()) },
      unsupported: { icon: <FileSearch size={18} />, title: tr("هذا النوع ما نقراه للحين"), body: ext ? tr("ملف {0} · صدّروه PDF أو Word وارموه.", ext) : tr("صدّروه PDF أو Word وارموه."), action: tr("اختاروا ملف ثاني"), run: () => (again(), fileRef.current?.click()) },
      nothing_found: { icon: <Folder size={18} />, title: tr("ما لقينا شي نرتبه"), body: tr("شكله ملف عادي. نحطه بالملفات؟"), action: tr("حطوه بالملفات"), run: () => void toFiles() },
      offline: { icon: <WifiOff size={18} />, title: tr("النت مفصول"), body: tr("حفظناه عندكم، وأول ما يرجع النت نقراه لحاله."), action: tr("تمام"), run: again },
      ai_limit: { icon: <Lock size={18} />, title: tr("خلصت قراءات هالشهر"), body: tr("باقتكم فيها {0} رمية بالشهر. ترجع {1}، أو كبّروا الباقة.", limitInfo ?? (team?.plan === "ai" ? 150 : 20), formatDateShort(nextMonthIso())), action: tr("شوفوا الباقات"), run: () => navigate("/pricing") },
      too_large: { icon: <FileSearch size={18} />, title: tr("الرمية كبيرة"), body: tr("الحد 10 ملفات و25 ميغا للملف. قسّموها وارموها مرة ثانية."), action: tr("اختاروا ملف ثاني"), run: () => (again(), fileRef.current?.click()) },
      failed: {
        icon: <Sparkles size={18} />,
        title: tr("ما زبطت هالمرة"),
        body: tr("صار شي من عندنا. جرّبوا مرة ثانية."),
        action: tr("جرّبوا مرة ثانية"),
        run: () => {
          if (!dropId || localErr) return again();
          void readDrop(dropId).then(() => reload());
        },
      },
    };
    const e = E[errCode] ?? E.failed;
    return (
      <div className="dr-page mx-auto max-w-sm pt-4" role="alert">
        {inputs}
        <section className="dr-card dr-in flex flex-col items-center rounded-[26px] p-[18px] text-center">
          <div className="relative">
            <Vessel size={190} state="dim" scene />
            <span className="absolute bottom-[18px] left-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#1C130E] text-ws-accent3 shadow-[inset_0_0_0_1px_rgba(255,199,119,0.35)]" aria-hidden>
              {e.icon}
            </span>
          </div>
          <b className="mt-2 text-[18px] text-ws-text">{e.title}</b>
          <p className="m-0 mb-3.5 mt-1.5 text-[14px] leading-[1.7] text-ws-text-accent">{localErr?.code === "offline" ? localErr.message : e.body}</p>
          <button type="button" className="dr-cream w-full !flex-none" onClick={e.run}>
            {e.action}
          </button>
        </section>
        {toastEl}
      </div>
    );
  }

  // ── نقرا ──
  if (reading) {
    const names = starting?.names ?? items.map((i) => i.name);
    const first = names[0] ?? "";
    const mime = starting?.mime ?? items[0]?.mime;
    const step = starting ? 1 : status === "reading" ? (shown.length ? 3 : 2) : 1;
    return (
      <div className="dr-page mx-auto max-w-md">
        <div role="status" aria-live="polite" className="relative flex flex-col items-center gap-1.5 px-4 pt-2.5 text-center">
          {first && (
            // الكرت يبدأ فوق يمين ويطير بقوس لفتحة الوعاء (فوق مركزه بشوي)
            <div className="dr-fly" style={{ left: "calc(50% - 75px)", top: 196, ["--sx" as string]: "96px", ["--sy" as string]: "-190px" }} aria-hidden>
              <div className="dr-flycard">
                <span className="dr-ft" dir="ltr">
                  {/^image/.test(mime ?? "") ? "IMG" : /pdf/.test(mime ?? "") || /\.pdf$/i.test(first) ? "PDF" : /^https?:/.test(first) ? "URL" : "TXT"}
                </span>
                <span className="text-[12px] font-bold leading-[1.3]" dir="auto">
                  {first.length > 40 ? `${first.slice(0, 40)}…` : first}
                </span>
              </div>
            </div>
          )}
          <div className="mt-[70px]">
            <Vessel size={300} state="reading" scene />
          </div>
          <div className="text-[13px] font-bold tracking-[.04em] text-ws-accent3">{names.length > 1 ? tr("{0} عناصر", names.length) : tr("1 من 1 · {0}", kindWord(1, mime, first))}</div>
          <h1 className="dr-title text-[28px]">{starting ? tr("نرفعها…") : tr("نقرا الملف…")}</h1>
          <p className="m-0 text-[15px] text-ws-text-accent">{tr("نطلّع النقاط، المهام، ومين مسؤول عن وش.")}</p>
          <div className="mt-2.5 flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={`dr-dot${i <= step ? " on" : ""}`} />
            ))}
          </div>
          <section className="dr-card dr-in dr-d3 mt-[18px] flex w-full items-center gap-2.5 rounded-[22px] px-3.5 py-3 text-start">
            <span className="dr-stamp h-8 w-8" aria-hidden>
              <Sparkles size={15} />
            </span>
            <span className="flex-1 text-[14px] text-ws-text">{drop?.summary || (starting ? tr("نرفع الملفات بأمان…") : tr("ويسي يقرا ويفرز…"))}</span>
          </section>
          <button type="button" className="dr-text dim mt-1" onClick={again}>
            {tr("إلغاء")}
          </button>
        </div>
      </div>
    );
  }

  // ── انحطّت ──
  if (dropId && status === "filed") {
    const placed = shown.filter((r) => r.included && r.created_entities.length > 0);
    const waiting = shown.filter((r) => r.included && r.filed_note);
    const n = placed.reduce((s, r) => s + r.created_entities.length, 0);
    const rows = (
      <div className="flex flex-col gap-2.5">
        {placed.map((r, i) => (
          <Link key={r.id} to={deepLink(r)} className={`dr-row dr-fan`} style={{ animationDelay: `${0.08 * (i + 1)}s` }}>
            <span className="dr-stamp h-[30px] w-[30px]" aria-hidden>
              <Check size={15} strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1 leading-[1.35]">
              <b className="block truncate text-[15px]" dir="auto">
                {r.title}
              </b>
              <span className="text-[12px] text-ws-muted lg:text-[13px]">{tr("انحطّت في {0}", DEST_PLACE[r.destination])}</span>
            </span>
            <span className="hidden text-[13px] lg:inline">{tr("افتحوها")}</span>
            <ChevronLeft size={18} className="text-ws-muted ltr:rotate-180" aria-hidden />
          </Link>
        ))}
        {waiting.map((r) => (
          <div key={r.id} className="dr-row">
            <span className="dr-ic" aria-hidden>
              <Sparkles size={15} className="text-ws-accent3" />
            </span>
            <span className="min-w-0 flex-1 leading-[1.35]">
              <b className="block truncate text-[15px]" dir="auto">
                {r.title}
              </b>
              <span className="text-[12px] text-ws-accent3">{r.filed_note === "needs_leader" ? tr("تنتظر القائد — هو اللي يضيف المهام") : tr("ما لقينا نموذج الموافقة — افتحوا صفحة الأخلاقيات أول")}</span>
            </span>
          </div>
        ))}
      </div>
    );
    const buttons = (
      <div className="flex gap-2">
        <button type="button" className="dr-cream !min-h-[48px] !text-[15px]" onClick={again}>
          {tr("ارموا شي ثاني")}
        </button>
        <button type="button" className="dr-ghost !min-h-[48px] !flex-none" onClick={() => undo(dropId)}>
          <Undo2 size={16} aria-hidden />
          <span className="lg:hidden">{tr("تراجع")}</span>
          <span className="hidden lg:inline">{tr("تراجع عن الكل")}</span>
        </button>
      </div>
    );
    return (
      <div className="dr-page" role="status">
        <div className="mb-4 hidden lg:block">
          <div className="text-[18px] text-[#E9C9A0]">{tr("ارموا أي شي")}</div>
          <h1 className="dr-title text-[52px] leading-[1.1]">{tr("انحطّت {0} أشياء", n)}</h1>
        </div>
        <div className="mx-auto flex max-w-md flex-col gap-3 lg:grid lg:max-w-none lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-[18px]">
          <section className="dr-card dr-in rounded-[28px] px-4 pb-[18px] pt-1.5 text-center lg:order-1">
            <div className="-mb-4 flex justify-center">
              <Vessel size={190} state="done" className="lg:!h-[300px] lg:!w-[300px]" scene />
            </div>
            <div className="dr-stamp dr-pop mx-auto mb-2 h-[52px] w-[52px] shadow-[0_0_0_8px_rgba(255,199,119,0.1)]" aria-hidden>
              <Check size={24} strokeWidth={3} />
            </div>
            <h1 className="dr-title text-[30px] lg:hidden">{tr("انحطّت {0} أشياء", n)}</h1>
            <p className="m-0 mt-1 text-[15px] text-ws-text-accent lg:text-[16px]">{tr("كل شي بمكانه، والفريق يشوفه الحين.")}</p>
          </section>
          <section className="flex flex-col gap-3 lg:order-2 lg:rounded-[28px] lg:p-[18px] dr-card-lg">
            {rows}
            {buttons}
          </section>
        </div>
        {toastEl}
      </div>
    );
  }

  // ── تأكدوا قبل لا نحطها ──
  if (dropId && status === "ready") {
    const fileCount = items.filter((x) => x.kind === "file").length;
    const perItem = (id: string) => {
      const rs = shown.filter((r) => r.item_id === id);
      if (rs.length === 1) return `${countOf(rs[0])} ${DEST_NOUN[rs[0].destination]}`;
      return rs.map((r) => (countOf(r) > 1 ? `${countOf(r)} ${DEST_NOUN[r.destination]}` : DEST_NOUN[r.destination])).join(" + ");
    };
    const footer = (
      <div className="flex flex-col gap-1.5">
        <button type="button" className="dr-primary" onClick={file} disabled={!nIncluded || busy || !canWrite}>
          {busy ? tr("نحطها…") : tr("حطوها بمكانها")} <span dir="ltr">({nIncluded})</span>
        </button>
        <div className="flex gap-2">
          <button type="button" className="dr-cream" onClick={() => selected && setEditFor(selected)} disabled={!selected}>
            {tr("عدّلوا")}
          </button>
          <button type="button" className="dr-ghost" onClick={ignore}>
            {tr("تجاهل")}
          </button>
        </div>
      </div>
    );
    // عمودين متوازنين (البطاقة تروح للعمود الأقصر) — زي التصميم
    const est = (r: DropResult) => (r.destination === "library" ? 330 : r.destination === "minutes" ? 230 : r.destination === "tasks" ? 120 + 38 * countOf(r) : 170);
    const masonry: number[][] = [[], []];
    const colH = [0, 0];
    shown.forEach((r, i) => {
      const c = colH[0] <= colH[1] ? 0 : 1;
      masonry[c].push(i);
      colH[c] += est(r);
    });
    const cards = shown.map((r, i) => <ResultCard key={r.id} r={r} index={i} roster={roster} selected={selected?.id === r.id} onSelect={() => setSel(r.id)} onToggle={(v) => toggle(r, v)} onMove={() => setMoveFor(r)} isLeader={isLeader} />);
    return (
      <div className="dr-page">
        {inputs}
        {/* الجوال */}
        <div className="mx-auto flex max-w-md flex-col gap-2.5 lg:hidden">
          <div className="flex items-center gap-3">
            <Vessel size={84} state="hover" scene={!isDesk} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-ws-accent3" dir="auto">
                {items.length > 1 ? tr("{0} عناصر رميتوها", items.length) : items[0]?.name}
              </div>
              <h1 className="dr-title text-[24px] leading-[1.3]">{tr("لقينا {0} أشياء", nAll)}</h1>
              {drop?.summary && <div className="text-[13px] text-ws-muted">{drop.summary}</div>}
            </div>
          </div>
          {cards}
          {footer}
        </div>
        {/* الديسكتوب */}
        <div className="hidden lg:block">
          <div className="mb-4">
            <div className="text-[18px] text-[#E9C9A0]">{tr("ارموا أي شي")}</div>
            <h1 className="dr-title text-[52px] leading-[1.1]">{tr("تأكدوا قبل لا نحطها")}</h1>
          </div>
          <div className="grid grid-cols-[380px_1fr] items-start gap-[18px]">
            <section className="dr-card dr-in sticky top-4 flex flex-col items-center rounded-[28px] p-[18px] text-center">
              <Vessel size={260} state="hover" scene={isDesk} />
              <h2 className="dr-title -mt-3.5 mb-0.5 text-[28px]">{tr("لقينا {0} أشياء", nAll)}</h2>
              <p className="m-0 mb-3 text-[14px] text-ws-text-accent">{fileCount === 2 ? tr("من ملفين رميتوهم") : fileCount > 2 ? tr("من {0} ملفات رميتوها", fileCount) : drop?.summary || tr("من اللي رميتوه")}</p>
              <div className="flex w-full flex-col gap-1.5">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2.5 rounded-[14px] bg-white/[.035] px-2.5 py-2 text-start">
                    <FileIcon name={it.name} mime={it.mime} small />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold" dir="auto">
                      {it.name}
                    </span>
                    <span className="max-w-[45%] truncate text-[12px] text-ws-accent3">{perItem(it.id)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto w-full pt-3.5">{footer}</div>
            </section>
            <div className="grid grid-cols-2 items-start gap-3.5">
              {masonry.map((col, c) => (
                <div key={c} className="flex flex-col gap-3.5">
                  {col.map((i) => cards[i])}
                </div>
              ))}
            </div>
          </div>
        </div>
        {sheets}
        {toastEl}
      </div>
    );
  }

  // ── الصقوا هنا ──
  if (view === "paste") {
    const d = detectPaste(text);
    return (
      <div className="dr-page mx-auto flex max-w-md flex-col gap-3">
        <div className="flex items-center gap-3.5">
          <Vessel size={110} state="hover" scene />
          <div>
            <h1 className="dr-title text-[26px]">{tr("الصقوا هنا")}</h1>
            <p className="m-0 mt-0.5 text-[14px] text-ws-text-accent">{tr("نص، ملاحظات، أو رابط DOI أو PubMed")}</p>
          </div>
        </div>
        <section className="dr-card dr-in rounded-[26px] p-3.5">
          <textarea className="dr-paste" value={text} onChange={(e) => setText(e.target.value)} autoFocus aria-label={tr("الصقوا نص أو رابط")} placeholder={tr("مثال: ملاحظات اجتماع، كلام الدكتورة، قائمة مهام، أو رابط دراسة…")} dir="auto" />
          <div className="mt-2.5 flex flex-wrap gap-1.5" aria-live="polite">
            {d.hint && (
              <span className="dr-chip gold">
                <Sparkles size={12} aria-hidden />
                {d.hint}
              </span>
            )}
            {d.lines > 0 && <span className="dr-chip">{tr("{0} أسطر", d.lines)}</span>}
          </div>
        </section>
        <button type="button" className="dr-primary" disabled={text.trim().length < 2 || !canWrite} onClick={() => begin([], text, "paste")}>
          {tr("ارموها")}
        </button>
        <button type="button" className="dr-text" onClick={() => setView("idle")}>
          {tr("إلغاء")}
        </button>
        {toastEl}
      </div>
    );
  }

  // ── البداية: مسرح واحد (DropPage / DropPageM) ──
  const last = recent[0];
  const lastPlaced = last ? last.results.filter((r) => r.created > 0 && !r.undone) : [];
  const lastPill = last ? (
    <div className="dp-last" role="status">
      <span className="dp-last-ok" aria-hidden>
        <Check size={14} strokeWidth={3} />
      </span>
      <b className="truncate" dir="auto">
        {last.items.length > 1 ? tr("{0} عناصر", last.items.length) : last.items[0]?.name ?? last.summary}
      </b>
      <span className="truncate text-ws-muted">
        ← {last.status === "ready" ? tr("تنتظر مراجعتكم") : lastPlaced.length ? DEST_LABEL[lastPlaced[0].destination] : tr("ما انحط شي")} · {ago(last.created_at)}
      </span>
      {last.status === "ready" ? (
        <button type="button" className="dp-last-btn" onClick={() => setParams({ d: last.id })}>
          {tr("راجعوها")}
        </button>
      ) : lastPlaced.length ? (
        <button type="button" className="dp-last-btn" onClick={() => undo(last.id)}>
          <Undo2 size={14} aria-hidden />
          {tr("تراجع")}
        </button>
      ) : null}
    </div>
  ) : null;
  const onZone = {
    onDragOver: (e: React.DragEvent) => {
      if (Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        setZoneOver(true);
      }
    },
    onDragLeave: () => setZoneOver(false),
    // الإفلات نفسه يستلمه GlobalDrop (نفس الطريق لكل الصفحات)
    onDrop: () => setZoneOver(false),
  };
  return (
    <div className="dr-page">
      {inputs}
      {/* الجوال: الوعاء 280 + 4 أماكن على القوس الفوقاني، والأزرار تحت */}
      <div className={`dp-m flex lg:hidden${enter ? " dp-enter" : ""}`}>
        <div className="dp-m-stage" aria-hidden>
          <div className="dp-m-glow" />
          <svg className="dp-rings" viewBox="0 0 390 420">
            <defs>
              <linearGradient id="dpm-g" x1="0" x2="1">
                <stop offset="0" stopColor="#FFB547" stopOpacity="0" />
                <stop offset=".5" stopColor="#FFB547" stopOpacity=".7" />
                <stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <ellipse cx="195" cy="176.4" rx="152" ry="200" fill="none" stroke="rgba(255,199,119,0.07)" />
            <ellipse className="dp-ring" pathLength={100} cx="195" cy="176.4" rx="112" ry="148" fill="none" stroke="url(#dpm-g)" strokeWidth="1.4" />
            <ellipse cx="195" cy="176.4" rx="176" ry="231" fill="none" stroke="rgba(255,199,119,0.05)" strokeDasharray="2 10" />
            {M_CHIPS.map((c) => (
              <path key={c.d} className="dp-li" d={c.curve} fill="none" stroke="rgba(255,199,119,.16)" strokeWidth="1.2" strokeDasharray="3 7" />
            ))}
          </svg>
          {M_CHIPS.map((c, i) => {
            const Icon = DEST_ICON[c.d];
            return (
              <span key={c.d} className="dp-chip dp-chip-m dp-co" style={{ left: c.x, top: c.y, ["--dx" as string]: `${c.dx}px`, ["--dy" as string]: `${c.dy}px`, animationDelay: `${0.25 + i * 0.06}s` }}>
                <Icon size={14} className="text-ws-accent3" aria-hidden />
                {tr(c.label)}
              </span>
            );
          })}
          <div className="dp-m-vessel dp-vin">
            <Vessel size={280} state="hover" />
          </div>
        </div>
        <div className="dp-m-head dp-tin">
          <h1 className="dp-h1 text-[54px]">{tr("ارموا أي شي")}</h1>
          <p className="dp-sub">{tr("ونحن نرتبها")}</p>
        </div>
        <div className="dp-m-btns dp-tin dp-t2">
          <button type="button" className="dp-go w-full" onClick={() => fileRef.current?.click()} disabled={!canWrite}>
            <Download size={18} aria-hidden />
            {tr("اختاروا ملف")}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="dp-glass" onClick={() => camRef.current?.click()} disabled={!canWrite}>
              <Camera size={16} aria-hidden />
              {tr("صوّروا")}
            </button>
            <button type="button" className="dp-glass" onClick={() => setView("paste")} disabled={!canWrite}>
              <ExternalLink size={16} aria-hidden />
              {tr("رابط")}
            </button>
            <button type="button" className="dp-glass" onClick={() => setView("paste")} disabled={!canWrite}>
              <Paperclip size={16} aria-hidden />
              {tr("الصقوا")}
            </button>
          </div>
        </div>
      </div>

      {/* الديسكتوب: الوعاء 430 بالنص، 3 حلقات، 6 أماكن تدور حوله بخطوط منقطة */}
      <div className={`dp-d hidden lg:flex${zoneOver ? " over" : ""}${enter ? " dp-enter" : ""}`} {...onZone}>
        <div className="dp-stage-wrap" ref={stageRef} style={{ height: Math.round(560 * stageK) }}>
          <div className="dp-stage" style={{ transform: `scale(${stageK})` }}>
            <div className="dp-glow" aria-hidden />
            <svg className="dp-rings" viewBox="0 0 1096 560" aria-hidden>
              <defs>
                <linearGradient id="dp-g" x1="0" x2="1">
                  <stop offset="0" stopColor="#FFB547" stopOpacity="0" />
                  <stop offset=".5" stopColor="#FFB547" stopOpacity=".7" />
                  <stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <ellipse cx="548" cy="235.2" rx="473" ry="218" fill="none" stroke="rgba(255,199,119,0.07)" />
              <ellipse className="dp-ring" pathLength={100} cx="548" cy="235.2" rx="351" ry="161" fill="none" stroke="url(#dp-g)" strokeWidth="1.4" />
              <ellipse cx="548" cy="235.2" rx="548" ry="252" fill="none" stroke="rgba(255,199,119,0.05)" strokeDasharray="2 10" />
              {D_CHIPS.map((c) => (
                <path key={c.d} className="dp-li" d={c.curve} fill="none" stroke="rgba(255,199,119,.16)" strokeWidth="1.2" strokeDasharray="3 7" />
              ))}
            </svg>
            {D_CHIPS.map((c, i) => {
              const Icon = DEST_ICON[c.d];
              return (
                <span key={c.d} className="dp-chip dp-co" style={{ left: c.x, top: c.y, ["--dx" as string]: `${c.dx}px`, ["--dy" as string]: `${c.dy}px`, animationDelay: `${0.25 + i * 0.06}s` }}>
                  <Icon size={15} className="text-ws-accent3" aria-hidden />
                  {tr(c.label)}
                </span>
              );
            })}
            <div className="dp-vessel dp-vin">
              <Vessel size={430} state="hover" />
            </div>
            {EMBERS.map(([x, y, w, h], i) => (
              <i key={i} aria-hidden className={`dp-emb e${(i % 4) + 1}`} style={{ left: x, top: y, width: w, height: h }} />
            ))}
          </div>
        </div>
        <div className="dp-d-text">
          <div className="dp-tin text-center">
            <h1 className="dp-h1 text-[88px]">{tr("ارموا أي شي")}</h1>
            <p className="dp-sub">{tr("ونحن نرتبها")}</p>
          </div>
          <div className="dp-tin dp-t2 mt-[22px] flex items-center justify-center gap-2.5">
            <button type="button" className="dp-glass !flex-none !px-5" onClick={() => setView("paste")} disabled={!canWrite}>
              <ExternalLink size={16} aria-hidden />
              {tr("رابط")}
            </button>
            <button type="button" className="dp-glass !flex-none !px-5" onClick={() => camRef.current?.click()} disabled={!canWrite}>
              <Camera size={16} aria-hidden />
              {tr("صوّروا")}
            </button>
            <button type="button" className="dp-go" onClick={() => fileRef.current?.click()} disabled={!canWrite}>
              <Download size={18} aria-hidden />
              {tr("اختاروا ملف")}
            </button>
          </div>
          <p className="dp-tin dp-t2 dp-hint">
            {tr("أو اسحبوها لأي مكان")} · <kbd dir="ltr">Ctrl V</kbd>
          </p>
          {lastPill && <div className="dp-tin dp-t3 mt-7 flex justify-center">{lastPill}</div>}
        </div>
      </div>
      {toastEl}
    </div>
  );
}

/* أماكن المسرح (DropPage): نفس الإحداثيات بالمرجع داخل مسرح 1096×560 */
const D_CHIPS: { d: Destination; label: string; x: number; y: number; dx: number; dy: number; curve: string }[] = [
  { d: "library", label: "المكتبة", x: 114, y: 104, dx: 223, dy: 64, curve: "M176 128 Q 362 142 548 235" },
  { d: "tasks", label: "مهام", x: 48, y: 211, dx: 263, dy: 0, curve: "M110 235 Q 329 195 548 235" },
  { d: "minutes", label: "محضر", x: 114, y: 318, dx: 223, dy: -64, curve: "M176 342 Q 362 249 548 235" },
  { d: "supervisor_note", label: "المشرفة", x: 858, y: 104, dx: -223, dy: 64, curve: "M920 128 Q 734 142 548 235" },
  { d: "calendar", label: "التقويم", x: 924, y: 211, dx: -263, dy: 0, curve: "M986 235 Q 767 195 548 235" },
  { d: "proposal", label: "المقترح", x: 858, y: 318, dx: -223, dy: -64, curve: "M920 342 Q 734 249 548 235" },
];
/* الجوال (DropPageM): 4 أماكن على القوس الفوقاني، مسرح 390×420 */
const M_CHIPS: { d: Destination; label: string; x: number; y: number; dx: number; dy: number; curve: string }[] = [
  { d: "library", label: "المكتبة", x: 9, y: 66, dx: 74, dy: 52, curve: "M71 90 Q 133 93 195 176" },
  { d: "tasks", label: "مهام", x: 67, y: -11, dx: 40, dy: 98, curve: "M129 13 Q 162 55 195 176" },
  { d: "supervisor_note", label: "المشرفة", x: 199, y: -11, dx: -40, dy: 98, curve: "M261 13 Q 228 55 195 176" },
  { d: "calendar", label: "التقويم", x: 257, y: 66, dx: -74, dy: 52, curve: "M319 90 Q 257 93 195 176" },
];
/* 10 جمرات تطلع مرة وحدة من فم الوعاء [x, y, عرض، طول] */
const EMBERS: [number, number, number, number][] = [
  [563, 184, 4, 5], [422, 174, 5, 3], [585, 172, 5, 3], [417, 176, 4, 4], [433, 195, 3, 5],
  [615, 172, 5, 3], [512, 172, 5, 5], [601, 171, 3, 3], [683, 182, 4, 4], [471, 234, 3, 5],
];

/** «قبل ساعتين» — للشريط الصغير تحت */
function ago(ts: string): string {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(ts)) / 60000));
  if (m < 1) return tr("الحين");
  if (m < 60) return tr("قبل {0} دقيقة", m);
  const h = Math.round(m / 60);
  if (h === 1) return tr("قبل ساعة");
  if (h === 2) return tr("قبل ساعتين");
  if (h < 24) return tr("قبل {0} ساعات", h);
  return formatDateShort(localDay(ts));
}


/** أول الشهر الجاي (YYYY-MM-DD) — متى ترجع القراءات */
function nextMonthIso(): string {
  const d = new Date();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

/** وقت من القاعدة → تاريخ اليوم بتوقيت الجهاز (YYYY-MM-DD) */
function localDay(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
