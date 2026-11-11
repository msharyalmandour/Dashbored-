import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Camera, Check, ChevronLeft, ClipboardPaste, Download, FileSearch, Folder, Lock, Sparkles, Undo2, WifiOff } from "lucide-react";
import Vessel from "../components/drop/Vessel";
import { DEST_ICON, DestinationSheet, EditSheet, FileIcon, ResultCard } from "../components/drop/DropParts";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import { useDrop } from "../hooks/useDrop";
import { supabase } from "../lib/supabaseClient";
import { ACCEPT, countOf, DEST_LABEL, DEST_PLACE, DESTS, deepLink, detectPaste, fileDrop, listRecent, readDrop, retarget, startDrop, undoDrop, undoMessage, updateResult, type Destination, type DropError, type DropResult, type DropSource, type RecentDrop } from "../lib/drops";
import { tr } from "../lib/i18n";
import { hasPending, PENDING_EVENT, takePending } from "../lib/dropQueue";

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

  const inputs = (
    <>
      <input ref={fileRef} type="file" multiple hidden accept={ACCEPT} onChange={(e) => (takeFiles(e.target.files), (e.target.value = ""))} />
      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => (takeFiles(e.target.files), (e.target.value = ""))} />
    </>
  );
  const toastEl = toast && (
    <div role="status" className="dr-card dr-in fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-2xl px-4 py-3 text-[14px] text-[#EAE3DC] md:bottom-8">
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
      <div className="mx-auto max-w-md py-10 text-center">
        <Vessel size={220} className="mx-auto" />
        <h1 className="dr-title text-[30px]">{tr("ارموا أي شي")}</h1>
        <p className="mt-2 text-[15px] text-[#E9D3B8]">{tr("هذي الميزة تشتغل بحساب فريقكم الحقيقي.")}</p>
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
      ai_limit: { icon: <Lock size={18} />, title: tr("خلصت قراءات هالشهر"), body: limitInfo ? tr("باقتكم فيها {0} رمية بالشهر. ترجع أول الشهر الجاي، أو كبّروا الباقة.", limitInfo) : tr("ترجع أول الشهر الجاي، أو كبّروا الباقة."), action: tr("شوفوا الباقات"), run: () => navigate("/pricing") },
      too_large: { icon: <FileSearch size={18} />, title: tr("الرمية كبيرة"), body: tr("الحد ١٠ ملفات و٢٥ ميغا للملف. قسّموها وارموها مرة ثانية."), action: tr("اختاروا ملف ثاني"), run: () => (again(), fileRef.current?.click()) },
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
      <div className="mx-auto max-w-sm pt-4" role="alert">
        {inputs}
        <section className="dr-card dr-in flex flex-col items-center rounded-[26px] p-[18px] text-center">
          <div className="relative">
            <Vessel size={190} state="dim" scene />
            <span className="absolute bottom-[18px] left-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#1C130E] text-[#FFC777] shadow-[inset_0_0_0_1px_rgba(255,199,119,0.35)]" aria-hidden>
              {e.icon}
            </span>
          </div>
          <b className="mt-2 text-[18px] text-[#EAE3DC]">{e.title}</b>
          <p className="m-0 mb-3.5 mt-1.5 text-[14px] leading-[1.7] text-[#E9D3B8]">{localErr?.code === "offline" ? localErr.message : e.body}</p>
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
      <div className="mx-auto max-w-md">
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
          <div className="text-[13px] font-bold tracking-[.04em] text-[#FFB444]">{names.length > 1 ? tr("{0} عناصر", names.length) : tr("١ من ١ · {0}", kindWord(1, mime, first))}</div>
          <h1 className="dr-title text-[28px]">{starting ? tr("نرفعها…") : tr("نقرا الملف…")}</h1>
          <p className="m-0 text-[15px] text-[#E9D3B8]">{tr("نطلّع النقاط، المهام، ومين مسؤول عن وش.")}</p>
          <div className="mt-2.5 flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={`dr-dot${i <= step ? " on" : ""}`} />
            ))}
          </div>
          <section className="dr-card dr-in dr-d3 mt-[18px] flex w-full items-center gap-2.5 rounded-[22px] px-3.5 py-3 text-start">
            <span className="dr-stamp h-8 w-8" aria-hidden>
              <Sparkles size={15} />
            </span>
            <span className="flex-1 text-[14px] text-[#EAE3DC]">{drop?.summary || (starting ? tr("نرفع الملفات بأمان…") : tr("الوكيل يقرا ويفرز…"))}</span>
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
              <span className="text-[12px] text-[#ABA095]">{tr("انحطّت في {0}", DEST_PLACE[r.destination])}</span>
            </span>
            <span className="hidden text-[13px] font-bold lg:inline">{tr("افتحوها")}</span>
            <ChevronLeft size={18} className="text-[#ABA095] ltr:rotate-180" aria-hidden />
          </Link>
        ))}
        {waiting.map((r) => (
          <div key={r.id} className="dr-row">
            <span className="dr-ic" aria-hidden>
              <Sparkles size={15} className="text-[#FFC777]" />
            </span>
            <span className="min-w-0 flex-1 leading-[1.35]">
              <b className="block truncate text-[15px]" dir="auto">
                {r.title}
              </b>
              <span className="text-[12px] text-[#FFC777]">{r.filed_note === "needs_leader" ? tr("تنتظر القائد — هو اللي يضيف المهام") : tr("ما لقينا نموذج الموافقة — افتحوا صفحة الأخلاقيات أول")}</span>
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
      <div role="status">
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
            <p className="m-0 mt-1 text-[15px] text-[#E9D3B8]">{tr("كل شي بمكانه، والفريق يشوفه الحين.")}</p>
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
    const perItem = (id: string) => {
      const rs = shown.filter((r) => r.item_id === id);
      return rs.map((r) => (countOf(r) > 1 ? `${countOf(r)} ${DEST_LABEL[r.destination]}` : DEST_LABEL[r.destination])).join(" + ");
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
    const cards = shown.map((r, i) => <ResultCard key={r.id} r={r} index={i} roster={roster} selected={selected?.id === r.id} onSelect={() => setSel(r.id)} onToggle={(v) => toggle(r, v)} onMove={() => setMoveFor(r)} isLeader={isLeader} />);
    return (
      <div>
        {inputs}
        {/* الجوال */}
        <div className="mx-auto flex max-w-md flex-col gap-2.5 lg:hidden">
          <div className="flex items-center gap-3">
            <Vessel size={84} state="hover" scene={!isDesk} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-[#FFB444]" dir="auto">
                {items.length > 1 ? tr("{0} عناصر رميتوها", items.length) : items[0]?.name}
              </div>
              <h1 className="dr-title text-[24px] leading-[1.3]">{tr("لقينا {0} أشياء", nAll)}</h1>
              {drop?.summary && <div className="text-[13px] text-[#ABA095]">{drop.summary}</div>}
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
              <p className="m-0 mb-3 text-[14px] text-[#E9D3B8]">{drop?.summary || (items.length > 1 ? tr("من {0} عناصر رميتوها", items.length) : tr("من اللي رميتوه"))}</p>
              <div className="flex w-full flex-col gap-1.5">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2.5 rounded-[14px] bg-white/[.035] px-2.5 py-2 text-start">
                    <FileIcon name={it.name} mime={it.mime} small />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold" dir="auto">
                      {it.name}
                    </span>
                    <span className="max-w-[45%] truncate text-[12px] text-[#FFC777]">{perItem(it.id)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto w-full pt-3.5">{footer}</div>
            </section>
            <div className="grid grid-cols-2 items-start gap-3.5">{cards}</div>
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
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <div className="flex items-center gap-3.5">
          <Vessel size={110} state="hover" scene />
          <div>
            <h1 className="dr-title text-[26px]">{tr("الصقوا هنا")}</h1>
            <p className="m-0 mt-0.5 text-[14px] text-[#E9D3B8]">{tr("نص، ملاحظات، أو رابط DOI أو PubMed")}</p>
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

  // ── البداية ──
  const recentCard = (
    <section className="dr-card dr-in dr-d3 rounded-[26px] px-3.5 pb-1.5 pt-3.5">
      <div className="flex items-center gap-2.5 px-1 pb-1 text-[16px] font-bold">
        <span className="dr-ic" aria-hidden>
          <Folder size={16} />
        </span>
        {tr("آخر اللي رميتوه")}
      </div>
      {recent.length === 0 ? (
        <p className="m-0 px-1 pb-3 pt-1 text-[13px] text-[#ABA095]">{tr("لسا ما رميتوا شي. أول رمية بتطلع هنا مع المكان اللي راحت له.")}</p>
      ) : (
        recent.map((d) => {
          const it = d.items[0];
          const name = d.items.length > 1 ? tr("{0} عناصر", d.items.length) : it?.name ?? d.summary;
          const placed = d.results.filter((r) => r.created > 0 && !r.undone);
          const where = d.status === "ready" ? tr("تنتظر مراجعتكم") : [...new Set(placed.map((r) => (r.destination === "tasks" ? tr("مهامي · {0} مهام", r.tasks) : DEST_PLACE[r.destination])))].join(" + ") || tr("ما انحط شي");
          return (
            <div key={d.id} className="dr-recent-row">
              <FileIcon name={it?.name ?? ""} mime={it?.mime} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold" dir="auto">
                  {name}
                </div>
                <div className="truncate text-[12px] text-[#ABA095]">
                  <span className="text-[#FFC777]">‹</span> {where} · {new Date(d.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </div>
              </div>
              {d.status === "ready" ? (
                <button type="button" className="dr-text !text-[13px]" onClick={() => setParams({ d: d.id })}>
                  {tr("راجعوها")}
                </button>
              ) : placed.length ? (
                <button type="button" className="dr-text !text-[13px]" onClick={() => undo(d.id)}>
                  <Undo2 size={15} aria-hidden />
                  {tr("تراجع")}
                </button>
              ) : null}
            </div>
          );
        })
      )}
    </section>
  );
  const pickBtns = (desk: boolean) => (
    <>
      <button type="button" className={desk ? "dr-primary !w-auto !px-[26px]" : "dr-primary"} onClick={() => fileRef.current?.click()} disabled={!canWrite}>
        <Download size={18} aria-hidden />
        {tr("اختاروا ملف")}
      </button>
      <div className={desk ? "flex flex-wrap justify-center gap-2" : "mt-2 flex gap-2"}>
        <button type="button" className={desk ? "dr-ghost !flex-none !px-[18px]" : "dr-ghost"} onClick={() => camRef.current?.click()} disabled={!canWrite}>
          <Camera size={16} aria-hidden />
          {tr("صوّروا")}
        </button>
        <button type="button" className={desk ? "dr-ghost !flex-none !px-[18px]" : "dr-ghost"} onClick={() => setView("paste")} disabled={!canWrite}>
          <ClipboardPaste size={16} aria-hidden />
          {tr("الصقوا نص أو رابط")}
        </button>
      </div>
    </>
  );
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
    <div>
      {inputs}
      {/* الجوال */}
      <div className="mx-auto flex max-w-md flex-col gap-3.5 lg:hidden">
        <section className="dr-card dr-in overflow-hidden rounded-[28px] px-4 pb-5 pt-2 text-center">
          <div className="-mb-[18px] -mt-1.5 flex justify-center">
            <Vessel size={250} scene={!isDesk} />
          </div>
          <h1 className="dr-title text-[34px] leading-[1.2]">{tr("ارموا أي شي")}</h1>
          <p className="mx-3 mb-4 mt-1.5 text-[15px] leading-[1.7] text-[#E9D3B8]">{tr("PDF، صور، سكرين شوت، ملاحظات، روابط… ونحن نرتبها بمكانها")}</p>
          {pickBtns(false)}
        </section>
        {recentCard}
      </div>
      {/* الديسكتوب */}
      <div className="hidden lg:flex lg:flex-col lg:gap-[18px]">
        <div>
          <div className="text-[18px] text-[#E9C9A0]">{tr("ملف، صورة، رسالة، رابط")}</div>
          <h1 className="dr-title text-[52px] leading-[1.1]">{tr("ارموا أي شي")}</h1>
        </div>
        <div className="grid grid-cols-[1.35fr_1fr] items-start gap-[18px]">
          <section className="dr-card dr-glow dr-in flex min-h-[600px] flex-col items-center rounded-[28px] p-6 text-center" {...onZone}>
            <div className={`dr-zone${zoneOver ? " over" : ""}`}>
              <Vessel size={360} state={zoneOver ? "hover" : "idle"} scene={isDesk} />
              <div className="-mt-6 text-[22px] font-extrabold">{tr("اسحبوا الملفات هنا")}</div>
              <p className="m-0 mb-[18px] mt-1 text-[15px] text-[#E9D3B8]">{tr("PDF، صور، سكرين شوت، ملاحظات، روابط… ونحن نرتبها بمكانها")}</p>
              <div className="flex items-center gap-2.5">{pickBtns(true)}</div>
            </div>
          </section>
          <div className="flex flex-col gap-[18px]">
            {recentCard}
            <section className="dr-card dr-in dr-d4 rounded-[26px] px-[18px] py-4">
              <div className="mb-2 text-[16px] font-bold">{tr("وش نقدر نرتب؟")}</div>
              <div className="flex flex-wrap gap-1.5">
                {DESTS.map((d) => {
                  const Icon = DEST_ICON[d];
                  return (
                    <span key={d} className="dr-chip">
                      <Icon size={12} aria-hidden />
                      {DEST_LABEL[d]}
                    </span>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
      {toastEl}
    </div>
  );
}
