import { useState } from "react";
import { Check, ClipboardCheck, Copy, Loader2, Mail, Plus, Sparkles, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import AiLockedCard from "../components/AiLockedCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { basicSplit, sectionLabels, useSupervisorFeedback } from "../hooks/useSupervisorFeedback";
import { callStudy } from "../hooks/useStudyTools";
import { hasAiAccess } from "../lib/plans";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { formatDateLong } from "../lib/date";

interface Draft {
  comment: string;
  sectionKey: string;
  keep: boolean;
}

export default function SupervisorFeedback() {
  const { currentUser, team } = useAuth();
  const { showToast } = useToast();
  const { project } = useResearchProject();
  const { roster } = useTeamRoster();
  const { items, loading, addItems, patch, remove } = useSupervisorFeedback();
  const aiOk = hasAiAccess(team) && isSupabaseConfigured;

  const [raw, setRaw] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [splitMsg, setSplitMsg] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [manualSection, setManualSection] = useState("other");
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");

  const [mailBusy, setMailBusy] = useState(false);
  const [mailText, setMailText] = useState("");
  const [mailMsg, setMailMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const open = items.filter((i) => i.status === "open");
  const done = items.filter((i) => i.status === "done");
  const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);
  const memberName = (id: string | null) => roster.find((m) => m.id === id)?.name;

  const splitBasic = () => {
    const parts = basicSplit(raw);
    if (parts.length === 0) return;
    setSplitMsg(null);
    setDrafts(parts.map((comment) => ({ comment, sectionKey: "other", keep: true })));
  };

  const splitAi = async () => {
    if (!raw.trim() || splitting) return;
    setSplitting(true);
    setSplitMsg(null);
    const r = await callStudy<{ items?: { comment: string; sectionKey: string }[] }>({ action: "feedback", text: raw });
    setSplitting(false);
    if (r.message || !r.data?.items) {
      setSplitMsg(r.message ?? "تعذّر التقسيم — جرّبوا التقسيم البسيط.");
      return;
    }
    setDrafts(r.data.items.map((i) => ({ ...i, keep: true })));
  };

  const saveDrafts = async () => {
    if (!drafts || !currentUser) return;
    const chosen = drafts.filter((d) => d.keep && d.comment.trim());
    const { error } = await addItems(chosen, currentUser.id, project?.id ?? null);
    if (error) {
      showToast({ title: "ما انحفظت", desc: error, icon: Trash2, tone: "rose" });
      return;
    }
    showToast({ title: `انضافت ${chosen.length} ملاحظة ✅`, icon: Check, tone: "brand" });
    setDrafts(null);
    setRaw("");
  };

  const addManual = async () => {
    if (!manual.trim() || !currentUser) return;
    const { error } = await addItems([{ comment: manual, sectionKey: manualSection }], currentUser.id, project?.id ?? null);
    if (!error) setManual("");
  };

  const writeMail = async (kind: "remind" | "progress") => {
    setMailBusy(true);
    setMailMsg(null);
    setMailText("");
    const r = await callStudy<{ text?: string }>({
      action: "email",
      kind,
      supervisorName: project?.supervisorName ?? "",
      projectTitle: project?.title ?? "",
      openCount: open.length,
      doneCount: done.length,
    });
    setMailBusy(false);
    if (r.message || !r.data?.text) {
      setMailMsg(r.message ?? "تعذّرت كتابة المسودة.");
      return;
    }
    setMailText(r.data.text);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">ملاحظات المشرف</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-950/55">
          ملاحظات المشرفة غالبًا تجي بشكل كلام طويل وتضيع. هنا تحوّلونها لقائمة مهام صغيرة، كل وحدة تنحل وتنعلّم، وتشوفون وين وقفتوا.
        </p>
      </div>

      {items.length > 0 && (
        <Card tone="teal" className="flex flex-wrap items-center gap-4">
          <div className="min-w-[10rem] flex-1">
            <p className="text-xs font-bold text-brand-950/50">تقدّمكم بملاحظات المشرفة</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="text-sm font-extrabold text-brand-950">
            {done.length} / {items.length} <span className="text-xs font-bold text-brand-950/45">({pct}%)</span>
          </p>
        </Card>
      )}

      <Card tone="cream" className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
          <ClipboardCheck size={18} className="text-brand-500" />
          الصقوا ملاحظات المشرفة
        </h3>
        <p className="text-xs text-brand-950/55">
          انسخوا الملاحظات من الإيميل أو الواتساب أو الورقة (ولو مكتوبة عربي وإنجليزي مخلوط عادي). نقسّمها لمهام واضحة تراجعونها قبل الحفظ.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          dir="auto"
          placeholder="مثال: The sample size needs justification. أضيفوا دراسات سعودية. وضّحوا معايير الاستبعاد..."
          className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
        <div className="flex flex-wrap items-center gap-2">
          {aiOk && (
            <button
              onClick={splitAi}
              disabled={!raw.trim() || splitting}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {splitting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {splitting ? "جاري التقسيم..." : "قسّمها بالذكاء الاصطناعي"}
            </button>
          )}
          <button
            onClick={splitBasic}
            disabled={!raw.trim()}
            className="rounded-xl border border-brand-200 bg-paper px-4 py-2 text-sm font-bold text-brand-950/70 hover:bg-surface-muted disabled:opacity-50"
          >
            تقسيم بسيط (سطر = ملاحظة)
          </button>
        </div>
        {splitMsg && <p className="rounded-xl bg-amber-accent-50 px-3 py-2 text-sm font-medium text-amber-accent-700">{splitMsg}</p>}
        {!aiOk && isSupabaseConfigured && (
          <p className="text-[11px] text-brand-950/45">التقسيم الذكي متاح بباقة AI. التقسيم البسيط مجاني.</p>
        )}
      </Card>

      {drafts && (
        <Card className="space-y-3">
          <p className="text-sm font-extrabold text-brand-950">راجعوا المهام قبل الحفظ ({drafts.filter((d) => d.keep).length})</p>
          <ul className="space-y-2">
            {drafts.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted p-2.5">
                <input
                  type="checkbox"
                  checked={d.keep}
                  onChange={(e) => setDrafts((p) => p!.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))}
                  className="h-4 w-4 accent-[var(--color-brand-500)]"
                />
                <input
                  value={d.comment}
                  onChange={(e) => setDrafts((p) => p!.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)))}
                  className="min-w-[12rem] flex-1 rounded-lg border border-brand-100 bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-brand-300"
                />
                <select
                  value={d.sectionKey}
                  onChange={(e) => setDrafts((p) => p!.map((x, j) => (j === i ? { ...x, sectionKey: e.target.value } : x)))}
                  className="rounded-lg border border-brand-100 bg-paper px-2 py-1.5 text-xs outline-none"
                >
                  {Object.entries(sectionLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button onClick={saveDrafts} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
              احفظوا المهام
            </button>
            <button onClick={() => setDrafts(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-brand-950/50 hover:bg-surface-muted">
              إلغاء
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {(
              [
                ["open", `مفتوحة (${open.length})`],
                ["done", `منجزة (${done.length})`],
                ["all", "الكل"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === id ? "bg-brand-500 text-white" : "bg-paper text-brand-950/60 hover:bg-surface-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManual()}
            placeholder="أضيفوا ملاحظة يدويًا..."
            className="min-w-[12rem] flex-1 rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
          />
          <select
            value={manualSection}
            onChange={(e) => setManualSection(e.target.value)}
            className="rounded-lg border border-brand-100 bg-paper px-2 py-2 text-xs outline-none"
          >
            {Object.entries(sectionLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button onClick={addManual} disabled={!manual.trim()} className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
            <Plus size={15} /> إضافة
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-brand-950/45">جاري التحميل...</p>
        ) : shown.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardCheck}
              title={items.length === 0 ? "ما فيه ملاحظات بعد" : "ما فيه ملاحظات بهذا التصنيف"}
              desc="الصقوا ملاحظات المشرفة بالأعلى، أو أضيفوا ملاحظة يدويًا."
            />
          </Card>
        ) : (
          shown.map((i) => (
            <Card key={i.id} className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => patch(i.id, { status: i.status === "done" ? "open" : "done" })}
                title={i.status === "done" ? "أعيدوها مفتوحة" : "علّموها منجزة"}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                  i.status === "done" ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200 text-transparent hover:border-brand-400"
                }`}
              >
                <Check size={14} />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${i.status === "done" ? "text-brand-950/40 line-through" : "text-brand-950"}`}>{i.comment}</p>
                <p className="mt-0.5 text-[11px] text-brand-950/45">
                  {sectionLabels[i.sectionKey] ?? "أخرى"} · {formatDateLong(i.feedbackDate)}
                  {i.status === "done" && i.resolvedAt ? ` · انحلّت ${formatDateLong(i.resolvedAt.slice(0, 10))}` : ""}
                </p>
              </div>
              <select
                value={i.assigneeId ?? ""}
                onChange={(e) => patch(i.id, { assigneeId: e.target.value || null })}
                className="rounded-lg border border-brand-100 bg-paper px-2 py-1.5 text-xs outline-none"
                title="مين مسؤول عنها؟"
              >
                <option value="">بدون مسؤول</option>
                {roster.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {i.assigneeId && memberName(i.assigneeId) && <span className="sr-only">{memberName(i.assigneeId)}</span>}
              <button onClick={() => remove(i.id)} title="حذف" className="rounded-lg p-1.5 text-brand-950/30 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 size={15} />
              </button>
            </Card>
          ))
        )}
      </div>

      {!hasAiAccess(team) && isSupabaseConfigured && <AiLockedCard feature="تقسيم الملاحظات وكتابة رسائل المشرفة" />}

      {aiOk && (
        <Card className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
            <Mail size={18} className="text-brand-500" />
            رسالة للمشرفة
          </h3>
          <p className="text-xs text-brand-950/55">
            المشرفة مشغولة وتتأخر أحيانًا، والأفضل تتابعونها بلطف. نكتب لكم مسودة تعدّلونها وترسلونها بأنفسكم (ما نرسل شي عنكم).
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => writeMail("remind")} disabled={mailBusy} className="rounded-xl border border-brand-200 bg-paper px-3.5 py-2 text-sm font-bold text-brand-950/75 hover:bg-surface-muted disabled:opacity-50">
              تذكير بانتظار ملاحظاتها
            </button>
            <button onClick={() => writeMail("progress")} disabled={mailBusy} className="rounded-xl border border-brand-200 bg-paper px-3.5 py-2 text-sm font-bold text-brand-950/75 hover:bg-surface-muted disabled:opacity-50">
              تحديث بتقدّمنا
            </button>
            {mailBusy && <Loader2 size={18} className="animate-spin self-center text-brand-500" />}
          </div>
          {mailMsg && <p className="rounded-xl bg-amber-accent-50 px-3 py-2 text-sm text-amber-accent-700">{mailMsg}</p>}
          {mailText && (
            <div className="space-y-2">
              <textarea
                value={mailText}
                onChange={(e) => setMailText(e.target.value)}
                rows={7}
                className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-300"
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(mailText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  } catch {
                    // نسخ يدوي
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "تم النسخ" : "نسخ الرسالة"}
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
