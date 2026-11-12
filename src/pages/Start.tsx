import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, FileText, Flag, HardDrive, LibraryBig, MessageCircle } from "lucide-react";
import clsx from "clsx";
import Vessel from "../components/drop/Vessel";
import { useAuth } from "../context/AuthContext";
import { useResearchStages } from "../hooks/useResearchStages";
import { useProposal } from "../hooks/useProposal";
import { useTasksData } from "../hooks/useTasksData";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useResearchProject } from "../hooks/useResearchProject";
import { queueDrop } from "../lib/dropQueue";
import { ACCEPT } from "../lib/drops";
import { FILED_EVENT, type FiledInfo } from "../lib/landed";
import { activeStageFor, firstRouteFor, saveTeamStage, STAGE_CHOICES, stagesDoneFor, useTeamStage, type TeamStage } from "../lib/teamStage";
import { getDriveStatus, startDriveConnect } from "../lib/driveTeam";
import { computeNextSteps } from "../lib/nextSteps";
import { track } from "../lib/analytics";
import { tr } from "../lib/i18n";

/* «بدأتوا قبل؟» (StartChoice / StartBring / StartResult / StartM)
   فرق كثيرة تنضم بنص البحث: نسألهم وين وصلوا، يجيبون شغلهم (كله يمر على «ارموا» ويراجعونه قبل الحفظ)،
   ونوريهم وش لقينا. كل خطوة جابوها تنحسب خالصة بدليل — الملف هو الدليل. */

type Source = "proposal" | "studies" | "chat";
interface Got {
  proposal?: { name: string; n: number };
  studies?: { filed: number; total: number };
  chat?: { n: number };
}
const gotKey = (teamId: string) => `wesync.start.got.${teamId}`;
const SEEN_KEY = (teamId: string) => `wesync.start.seen.${teamId}`;

/** شوفوا هالفريق «بدأتوا قبل؟» قبل؟ (عشان ما نفتحها لهم كل مرة) */
export function startSeen(teamId: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY(teamId)) === "1";
  } catch {
    return true;
  }
}
function markSeen(teamId: string) {
  try {
    localStorage.setItem(SEEN_KEY(teamId), "1");
  } catch {
    // ما يهم
  }
}

export default function Start() {
  const { team } = useAuth();
  const teamId = team?.id ?? "";
  const [params, setParams] = useSearchParams();
  const step = Math.min(3, Math.max(1, Number(params.get("step")) || 1));
  const go = (n: number) => setParams(n === 1 ? {} : { step: String(n) });
  const { stage, setStage } = useTeamStage(teamId);

  useEffect(() => {
    if (teamId) markSeen(teamId);
  }, [teamId]);

  return (
    <div className="st-page">
      {step === 1 && <Choice stage={stage} onPick={setStage} onNext={() => go(2)} />}
      {step === 2 && <Bring teamId={teamId} onNext={() => go(3)} />}
      {step === 3 && <Result teamId={teamId} stage={stage} />}
    </div>
  );
}

/* ── خطوة 1 · وين وصلتوا ببحثكم؟ ── */
function Choice({ stage, onPick, onNext }: { stage: TeamStage | null; onPick: (s: TeamStage) => void; onNext: () => void }) {
  const { team } = useAuth();
  const { stages, updateStage } = useResearchStages();
  const navigate = useNavigate();
  const [sel, setSel] = useState<TeamStage | null>(stage && stage !== "fresh" ? stage : null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (stage && stage !== "fresh") setSel(stage);
  }, [stage]);

  const save = async (s: TeamStage) => {
    if (!team) return;
    setBusy(true);
    await saveTeamStage(team.id, s);
    onPick(s);
    // المراحل اللي قبلهم تنحسب خالصة، واللي هم فيه الحين «شغالين عليها» — ما نرجّع شي خالص
    const done = stagesDoneFor(s);
    const active = activeStageFor(s);
    const today = new Date().toISOString().slice(0, 10);
    for (const st of stages) {
      if (done.includes(st.stageKey) && st.status !== "done") await updateStage(st.id, { status: "done", progress: 100, completedDate: today });
      else if (st.stageKey === active && st.status === "upcoming") await updateStage(st.id, { status: "active", startDate: st.startDate ?? today });
    }
    track("start_stage", { stage: s });
    setBusy(false);
  };

  return (
    <>
      {/* الديسكتوب */}
      <div className="hidden md:block">
        <span aria-hidden className="st-glow" />
        <div className="relative mx-auto max-w-[760px] pt-[140px] text-center">
          <div className="text-[13px] font-extrabold text-[#FFB444]">{tr("خطوة 1 من 3 · ما نضيّع شغلكم")}</div>
          <h1 className="lx-h1 !text-[60px]">{tr("وين وصلتوا ببحثكم؟")}</h1>
          <p className="m-0 mt-2 text-[17px] text-[#E9D3B8]">{tr("ما يحتاج تبدون من الصفر. قولوا لنا وين أنتم، ونجيب شغلكم القديم معكم.")}</p>
        </div>
        <div className="relative mt-8 grid grid-cols-4 gap-[18px]" role="radiogroup" aria-label={tr("وين وصلتوا ببحثكم؟")}>
          {STAGE_CHOICES.map((c, i) => (
            <ChoiceCard key={c.id} c={c} on={sel === c.id} onClick={() => setSel(c.id)} i={i} />
          ))}
        </div>
        <div className="relative mt-6 flex items-center gap-3">
          <button type="button" className="lx-fix !font-bold !text-[#ABA095]" onClick={() => team && (void saveTeamStage(team.id, "fresh"), navigate("/"))}>
            {tr("لسه ما بدأنا · ودّونا للبداية")}
          </button>
          <span className="flex-1" />
          <button type="button" className="st-go" disabled={!sel || busy} onClick={() => sel && void save(sel).then(onNext)}>
            {tr("كملوا")}
            <ChevronLeft size={18} className="ltr:rotate-180" aria-hidden />
          </button>
        </div>
      </div>
      {/* الجوال (StartM) */}
      <div className="flex min-h-[calc(100dvh-210px)] flex-col md:hidden">
        <span aria-hidden className="st-glow !top-[-60px]" />
        <div className="relative pt-16 text-center">
          <div className="text-[13px] font-extrabold text-[#FFB444]">{tr("خطوة 1 من 3")}</div>
          <h1 className="lx-h1 !text-[34px]">{tr("وين وصلتوا ببحثكم؟")}</h1>
          <p className="m-0 mt-1 text-[15px] text-[#E9D3B8]">{tr("ما يحتاج تبدون من الصفر")}</p>
        </div>
        <div className="relative mt-5 flex flex-col gap-3" role="radiogroup" aria-label={tr("وين وصلتوا ببحثكم؟")}>
          {STAGE_CHOICES.map((c, i) => (
            <ChoiceCard key={c.id} c={c} on={sel === c.id} onClick={() => setSel(c.id)} i={i} compact />
          ))}
        </div>
        <span className="min-h-6 flex-1" />
        <button type="button" className="st-go mt-6 w-full" disabled={!sel || busy} onClick={() => sel && void save(sel).then(onNext)}>
          {tr("كملوا")}
        </button>
        <button type="button" className="mx-auto mt-1 min-h-[44px] text-[14px] text-[#ABA095]" onClick={() => team && (void saveTeamStage(team.id, "fresh"), navigate("/"))}>
          {tr("لسه ما بدأنا")}
        </button>
      </div>
    </>
  );
}

function ChoiceCard({ c, on, onClick, i, compact }: { c: (typeof STAGE_CHOICES)[number]; on: boolean; onClick: () => void; i: number; compact?: boolean }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={clsx("st-choice lx-in", on && "on", compact && "compact")} style={{ animationDelay: `${0.09 * (i + 1)}s` }}>
      <span className={clsx("flex items-center gap-1", compact && "hidden")} aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={clsx("st-seg", n <= c.level && "on")} />
        ))}
        <span className="flex-1" />
        {on && (
          <span className="st-tick">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <b className={clsx("block leading-[1.35]", compact ? "text-[18px]" : "text-[20px]")}>{c.title}</b>
          <span className="mt-1 block text-[14px] text-[#E9D3B8]">{c.sub}</span>
        </span>
        {compact && on && (
          <span className="st-tick" aria-hidden>
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </span>
    </button>
  );
}

/* ── خطوة 2 · جيبوا اللي سويتوه ── */
function Bring({ teamId, onNext }: { teamId: string; onNext: () => void }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [got, setGot] = useState<Got>(() => {
    try {
      return JSON.parse(localStorage.getItem(gotKey(teamId)) ?? "{}") as Got;
    } catch {
      return {};
    }
  });
  const [drive, setDrive] = useState<"on" | "off" | "na" | "wait">("wait");
  const pending = useRef<{ src: Source | null; total: number } | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  const [accept, setAccept] = useState(ACCEPT);

  useEffect(() => {
    void getDriveStatus().then((s) => setDrive(s.connected ? "on" : s.configured ? "off" : "na"), () => setDrive("na"));
  }, []);

  // كل رمية انحطت: نعرف وش جابت (المقترح بأقسامه، الدراسات، المهام وكلام الدكتورة)
  useEffect(() => {
    const on = (e: Event) => {
      const f = (e as CustomEvent<FiledInfo>).detail;
      const p = pending.current;
      pending.current = null;
      setGot((g) => {
        const n: Got = { ...g };
        const d = f.dests;
        if (d.proposal || p?.src === "proposal") n.proposal = { name: f.names[0] ?? "", n: d.proposal ?? 0 };
        if (d.library || p?.src === "studies") n.studies = { filed: (g.studies?.filed ?? 0) + (d.library ?? 0), total: (g.studies?.total ?? 0) + (p?.src === "studies" ? p.total : f.files) };
        if (d.tasks || d.supervisor_note || p?.src === "chat") n.chat = { n: (g.chat?.n ?? 0) + (d.tasks ?? 0) + (d.supervisor_note ?? 0) + (d.calendar ?? 0) };
        try {
          localStorage.setItem(gotKey(teamId), JSON.stringify(n));
        } catch {
          // ما يهم
        }
        return n;
      });
    };
    window.addEventListener(FILED_EVENT, on);
    return () => window.removeEventListener(FILED_EVENT, on);
  }, [teamId]);

  const choose = (src: Source | null, acc: string) => {
    pending.current = { src, total: 0 };
    setAccept(acc);
    window.setTimeout(() => pick.current?.click(), 0);
  };
  const onFiles = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (!files.length || !currentUser) return;
    if (pending.current) pending.current.total = files.length;
    // نفس طريق «ارموا»: الهيرو يقراها ويوريكم وين تنحط قبل لا يحفظ
    queueDrop(files, "page");
  };
  const connectDrive = async () => {
    const r = await startDriveConnect();
    if (r.data?.url) window.location.href = r.data.url;
  };

  const rows: { id: string; icon: typeof FileText; title: string; sub: string; done: boolean; right: React.ReactNode; hot?: boolean }[] = [
    {
      id: "proposal",
      icon: FileText,
      title: tr("ملف المقترح (Word أو PDF)"),
      sub: tr("نقسمه لأقسام: المقدمة، الأدبيات، المنهجية…"),
      done: !!got.proposal,
      right: got.proposal ? (
        <span className="st-chip">
          <Check size={13} strokeWidth={3} aria-hidden />
          <span dir="auto" className="max-w-[180px] truncate">
            {got.proposal.name}
          </span>
          {got.proposal.n > 0 && <> · {tr("{0} أقسام", got.proposal.n)}</>}
        </span>
      ) : (
        <button type="button" className="st-btn" onClick={() => choose("proposal", ".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document")}>
          {tr("ارموه")}
        </button>
      ),
    },
    {
      id: "studies",
      icon: LibraryBig,
      title: tr("الدراسات اللي جمعتوها"),
      sub: tr("PDF أو روابط · نعبّي جدول الأدبيات لحاله"),
      done: !!got.studies,
      hot: !!got.studies && got.studies.filed < got.studies.total,
      right: got.studies ? (
        <div className="w-[180px]">
          <div className="stp-bar" aria-hidden>
            <i style={{ width: `${got.studies.total ? Math.round((got.studies.filed / got.studies.total) * 100) : 0}%` }} />
          </div>
          <div className="mt-1 text-[12px] font-bold text-[#FFC777]">{tr("{0} من {1} ملف", got.studies.filed, got.studies.total)}</div>
          {got.studies.filed < got.studies.total && (
            <button type="button" className="lx-fix !min-h-[32px] !text-[12px]" onClick={() => choose("studies", ".pdf,application/pdf")}>
              {tr("زيدوا")}
            </button>
          )}
        </div>
      ) : (
        <button type="button" className="st-btn" onClick={() => choose("studies", ".pdf,application/pdf,image/*")}>
          {tr("ارموها")}
        </button>
      ),
    },
    {
      id: "chat",
      icon: MessageCircle,
      title: tr("محادثة الواتساب حق الفريق"),
      sub: tr("نطلّع منها المهام وكلام الدكتورة"),
      done: !!got.chat,
      right: got.chat ? (
        <span className="st-chip">
          <Check size={13} strokeWidth={3} aria-hidden />
          {tr("{0} مهام وطلبات", got.chat.n)}
        </span>
      ) : (
        <button type="button" className="st-btn" onClick={() => choose("chat", ".txt,text/plain,image/*")}>
          {tr("ارموها")}
        </button>
      ),
    },
    {
      id: "drive",
      icon: HardDrive,
      title: tr("مجلد الدرايف حقكم"),
      sub: tr("نربطه بدل ما ترفعون كل شي من جديد"),
      done: drive === "on",
      right:
        drive === "on" ? (
          <span className="st-chip">
            <Check size={13} strokeWidth={3} aria-hidden />
            {tr("مربوط")}
          </span>
        ) : drive === "na" ? (
          <span className="text-[12px] text-[#ABA095]">{tr("مو مفعّل بعد")}</span>
        ) : (
          <button type="button" className="st-btn" disabled={drive === "wait"} onClick={() => void connectDrive()}>
            {tr("اربطوه")}
          </button>
        ),
    },
  ];

  const list = (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div key={r.id} className={clsx("st-row lx-in", r.hot && "hot")} style={{ animationDelay: `${0.09 * (i + 1)}s` }}>
          <span className="st-ic" aria-hidden>
            <r.icon size={20} />
          </span>
          <div className="min-w-0 flex-1 leading-[1.45]">
            <b className="text-[17px]">{r.title}</b>
            <div className="text-[14px] text-[#ABA095]">{r.sub}</div>
          </div>
          {r.right}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <input ref={pick} type="file" multiple hidden accept={accept} onChange={(e) => (onFiles(e.target.files), (e.target.value = ""))} />
      <span aria-hidden className="st-glow !top-[-140px] !start-[30%]" />
      <div className="relative">
        <div className="text-[13px] font-extrabold text-[#FFB444]">{tr("خطوة 2 من 3 · جيبوا شغلكم")}</div>
        <h1 className="lx-h1 !text-[38px] md:!text-[60px]">{tr("جيبوا اللي سويتوه")}</h1>
        <p className="m-0 mt-1.5 text-[15px] text-[#E9D3B8] md:text-[17px]">{tr("اللي عندكم يكفي. ما تحتاجون ترتبونه، احنا نرتبه.")}</p>
      </div>
      <div className="relative mt-6 grid grid-cols-1 items-stretch gap-[18px] lg:grid-cols-[1fr_380px]">
        {list}
        <button type="button" className="st-zone" onClick={() => choose(null, ACCEPT)}>
          <span className="relative">
            <Vessel size={220} state="hover" />
          </span>
          <b className="-mt-4 text-[22px]">{tr("ارموها كلها مرة وحدة")}</b>
          <span className="mt-1 text-[14px] leading-[1.7] text-[#E9D3B8]">
            {tr("نعرف وش كل ملف ونحطه بمكانه.")}
            <br />
            {tr("وتقدرون تراجعون قبل لا نحفظ.")}
          </span>
        </button>
      </div>
      <div className="relative mt-6 flex flex-col-reverse items-stretch gap-2 md:flex-row md:items-center md:gap-3">
        <button type="button" className="min-h-[44px] text-[14px] text-[#ABA095]" onClick={() => navigate("/")}>
          {tr("نسويها بعدين")}
        </button>
        <span className="hidden flex-1 md:block" />
        <button type="button" className="st-go" onClick={onNext}>
          {tr("شوفوا وش لقينا")}
          <ChevronLeft size={18} className="ltr:rotate-180" aria-hidden />
        </button>
      </div>
    </>
  );
}

/* ── خطوة 3 · هذا بحثكم ── */
function Result({ teamId, stage }: { teamId: string; stage: TeamStage | null }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { sections } = useProposal();
  const { tasks } = useTasksData();
  const { roster } = useTeamRoster();
  const { stages } = useResearchStages();
  const { papers } = useEvidencePapers();
  const { project } = useResearchProject();
  const got = useMemo<Got>(() => {
    try {
      return JSON.parse(localStorage.getItem(gotKey(teamId)) ?? "{}") as Got;
    } catch {
      return {};
    }
  }, [teamId]);

  // نسبة كل قسم: خلص = 100، شغالين = حسب الكلمات (حد 90)، ما بدأ = 0
  const rows = sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const words = s.content.trim() ? s.content.trim().split(/\s+/).length : 0;
      const pct = s.status === "done" ? 100 : s.status === "in-progress" || words > 0 ? Math.max(12, Math.min(90, Math.round((words / 400) * 100))) : 0;
      const owner = roster.find((m) => m.id === s.ownerId) ?? null;
      const note = s.status === "done" ? tr("خلصت") : pct === 0 ? tr("ما بدأت") : tr("{0} كلمة", words);
      return { key: s.key, label: s.labelAr, owner, pct, note, done: s.status === "done" };
    });
  const overall = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;
  const next = computeNextSteps({
    todayIso: new Date().toISOString().slice(0, 10),
    currentUserId: currentUser?.id ?? "",
    tasks,
    stages,
    sections,
    hasDeadline: !!project?.targetSubmissionDate,
    evidenceCount: papers.length,
    hasTitle: !!project?.title,
  }).slice(0, 3);

  const finish = () => {
    track("start_done", { stage: stage ?? "none", overall });
    navigate(firstRouteFor(stage));
  };

  return (
    <>
      <span aria-hidden className="st-glow !top-[-140px] !start-[40%]" />
      <div className="relative flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[1_1_420px]">
          <div className="text-[13px] font-extrabold text-[#FFB444]">{tr("خطوة 3 من 3 · هذا بحثكم")}</div>
          <h1 className="lx-h1 !text-[34px] md:!text-[56px]">{overall >= 70 ? tr("أنتم قريبين من النهاية") : overall >= 20 ? tr("أنتم بنص الطريق، مو بالبداية") : tr("بداية مرتبة، وكل شي بمكانه")}</h1>
        </div>
        <div className="st-pct lx-in" role="img" aria-label={tr("{0}% من المقترح", overall)}>
          <b dir="ltr">{overall}%</b>
          <span>{tr("من المقترح")}</span>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="lx-card lx-in p-[18px]" aria-labelledby="st-found">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="lx-ic" aria-hidden>
              <FileText size={17} />
            </span>
            <h2 id="st-found" className="lx-h2 flex-1">
              {tr("لقينا هذا بالمقترح حقكم")}
            </h2>
            {got.proposal?.name && (
              <span className="st-from" dir="auto">
                {tr("من {0}", got.proposal.name)}
              </span>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="m-0 py-4 text-[14px] text-[#ABA095]">{tr("ما لقينا أقسام للحين. ارموا ملف المقترح ونقسمه لكم.")}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {rows.map((r) => (
                <li key={r.key} className="st-sec">
                  <b className="min-w-0 flex-[1.2] truncate text-[16px]">{r.label}</b>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {r.owner ? (
                      <>
                        <span className="st-av" aria-hidden>
                          {r.owner.name.trim().charAt(0)}
                        </span>
                        <span className="truncate text-[14px]">{r.owner.name.split(" ")[0]}</span>
                      </>
                    ) : (
                      <Link to="/proposal" className="text-[14px] font-extrabold text-[#FFC777]">
                        {tr("حددوا مين")}
                      </Link>
                    )}
                  </span>
                  <span className="stp-bar hidden w-[134px] flex-none sm:block" aria-hidden>
                    <i style={{ width: `${r.pct}%` }} />
                  </span>
                  <span className={clsx("w-[120px] flex-none text-start text-[13px] font-bold", r.done ? "text-[#FFC777]" : "text-[#E9D3B8]")}>{r.note}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="lx-card lx-in p-[18px]" aria-labelledby="st-next">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="lx-ic" aria-hidden>
              <Flag size={16} />
            </span>
            <h2 id="st-next" className="lx-h2">
              {tr("اللي بعده")}
            </h2>
          </div>
          <ol className="m-0 list-none p-0">
            {next.map((n, i) => (
              <li key={n.id} className="st-next">
                <span className={clsx("st-n", i === 0 && "first")} aria-hidden>
                  {i + 1}
                </span>
                <Link to={n.to} className="min-w-0 flex-1 leading-[1.45]">
                  <b className="block text-[15px]">{n.title}</b>
                  <span className="block truncate text-[13px] text-[#ABA095]">{n.why}</span>
                </Link>
              </li>
            ))}
          </ol>
          <button type="button" className="st-go mt-4 w-full" onClick={finish}>
            {tr("ودّونا لبحثنا")}
          </button>
        </section>
      </div>
    </>
  );
}
