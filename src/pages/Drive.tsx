import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Clock, ExternalLink, Eye, Folder, Loader2, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import Dialog from "../components/ui/Dialog";
import { GoogleDriveLogo, WhatsAppLogo } from "../components/ui/BrandLogos";
import { LuxHead } from "../components/lux/Lux";
import { driveReturnMessage, getDriveStatus, setDriveEmail, setSupervisorRole, startDriveConnect, type DriveStatus } from "../lib/driveTeam";
import { DEFAULT_FOLDERS, isLinked, missingSentence, useDriveMembers, type DriveMemberRow, type DriveMemberStatus } from "../lib/driveMembers";
import { whatsappUrl } from "../lib/meetings";
import { relativeDayLabel } from "../lib/date";
import { tr } from "../lib/i18n";

/* الدرايف ومين مربوط (DriveD) — مجلد واحد للفريق والمشرف/ة، فيه 6 مجلدات فرعية.
   كل شخص بسطر: الحالة وإجراء واحد (ذكّروه بالواتساب / أضيفوا إيميله / غيّروا الصلاحية). */

const AV = ["#FFC85A", "#FF9A5A", "#FFE3C2", "#FFB444", "#F2EBE3"];
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
export const inviteLink = () => `${window.location.origin}/#/drive/join`;

interface Person {
  key: string;
  name: string;
  role: string;
  status: DriveMemberStatus;
  sub: string;
  row: DriveMemberRow | null;
  profileId: string | null;
  supervisor: boolean;
  color: string;
}

export default function Drive() {
  const { isLeader } = useAuth();
  const { roster } = useTeamRoster();
  const { project } = useResearchProject();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const { rows, folders, lastSyncAt, notReady, syncing, sync, reload } = useDriveMembers({ sync: true });
  const [emailFor, setEmailFor] = useState<Person | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getDriveStatus({ fresh: true }).then(setStatus);
  }, []);

  // رجعة من Google (?drive=connected | joined | error)
  useEffect(() => {
    const r = params.get("drive");
    if (!r) return;
    showToast(
      r === "error"
        ? { title: tr("ما انربط الدرايف"), desc: driveReturnMessage(params.get("reason")), icon: Folder, tone: "rose" }
        : { title: r === "joined" ? tr("انربط درايفك بالفريق") : tr("انربط درايف الفريق"), desc: tr("سوّينا المجلد ورتبناه، ونتأكد من الصلاحيات كل ساعة."), icon: Check, tone: "brand" },
    );
    setParams({}, { replace: true });
    void getDriveStatus({ fresh: true }).then(setStatus);
    void sync(true);
  }, [params, setParams, showToast, sync]);

  const supName = (project?.supervisorName ?? "").trim() || tr("المشرف/ة");
  const people = useMemo<Person[]>(() => {
    const out: Person[] = roster.map((m, i) => {
      const row = rows?.find((r) => r.kind === "member" && r.profile_id === m.id) ?? null;
      const st: DriveMemberStatus = row?.status ?? (status?.connected && m.id === roster.find((x) => x.role === "leader")?.id ? "connected" : "missing_email");
      const role = m.role === "leader" ? tr("قائد الفريق") : tr("عضو");
      const sub =
        st === "connected"
          ? row?.last_sync_at
            ? tr("متصل · آخر مزامنة {0}", relativeDayLabel(row.last_sync_at.slice(0, 10)))
            : tr("متصل")
          : st === "invited"
            ? row?.invited_at
              ? tr("أرسلنا له الدعوة {0} · ما فتحها", relativeDayLabel(row.invited_at.slice(0, 10)))
              : tr("أرسلنا له الدعوة · ما فتحها")
            : tr("ما وصلته دعوة · إيميله ناقص");
      return { key: m.id, name: m.name.split(" ")[0], role, status: st, sub, row, profileId: m.id, supervisor: false, color: AV[i % AV.length] };
    });
    const srow = rows?.find((r) => r.kind === "supervisor") ?? null;
    out.push({
      key: "supervisor",
      name: supName,
      role: tr("المشرف/ة"),
      status: srow?.status ?? "missing_email",
      sub: !srow || srow.status === "missing_email" ? tr("ما وصلتها دعوة · إيميلها ناقص") : srow.role === "writer" ? tr("تعدّل على الملفات") : srow.role === "reader" ? tr("تقرا بس · ما تعلّق") : tr("تشوف بس · ما تعدّل"),
      row: srow,
      profileId: null,
      supervisor: true,
      color: "#F2EBE3",
    });
    return out;
  }, [roster, rows, status?.connected, supName]);

  const linked = people.filter((p) => isLinked(p.status)).length;
  const total = people.length;
  const connected = !!status?.connected;
  const sentence = !connected ? tr("الدرايف مو مربوط للحين. القائد يربطه مرة وحدة، ونسوي مجلد للفريق فيه 6 مجلدات.") : notReady ? tr("نجهّز قائمة مين مربوط…") : missingSentence(people);
  const shareText = tr("اربطوا درايفكم بمجلد بحثنا على Wesync عشان ملفاتكم تنحفظ فيه، والدكتورة تشوفها: {0}", inviteLink());
  const pct = total ? linked / total : 0;

  const saveEmail = async () => {
    if (!emailFor || !EMAIL.test(emailDraft.trim())) return;
    setBusy(true);
    const r = await setDriveEmail({ kind: emailFor.supervisor ? "supervisor" : "member", profileId: emailFor.profileId ?? undefined, email: emailDraft.trim() });
    setBusy(false);
    if (r.error) return showToast({ title: tr("ما انحفظ الإيميل"), desc: tr("جرّبوا مرة ثانية."), icon: Folder, tone: "rose" });
    setEmailFor(null);
    setEmailDraft("");
    void reload();
  };
  const changeRole = async (role: "writer" | "commenter" | "reader") => {
    setRoleOpen(false);
    setBusy(true);
    const r = await setSupervisorRole(role);
    setBusy(false);
    if (r.error) showToast({ title: tr("ما تغيّرت الصلاحية"), desc: tr("جرّبوا مرة ثانية."), icon: Folder, tone: "rose" });
    void reload();
  };
  const connect = async () => {
    const r = await startDriveConnect();
    if (r.data?.url) window.location.href = r.data.url;
    else showToast({ title: tr("ما قدرنا نبدأ الربط"), desc: tr("جرّبوا مرة ثانية."), icon: Folder, tone: "rose" });
  };

  const pill = (p: Person) =>
    p.status === "connected" ? (
      <span className="dv-pill gold">
        <Check size={13} strokeWidth={3} aria-hidden /> {tr("مربوط")}
      </span>
    ) : p.status === "view_only" ? (
      <span className="dv-pill gold">
        <Eye size={13} aria-hidden /> {tr("تشوف بس")}
      </span>
    ) : p.status === "invited" ? (
      <span className="dv-pill wait">
        <Clock size={13} aria-hidden /> {tr("ينتظر")}
      </span>
    ) : (
      <span className="dv-pill">{p.supervisor ? tr("مو مربوطة") : tr("مو مربوط")}</span>
    );
  const action = (p: Person) => {
    if (p.supervisor && p.status !== "missing_email")
      return isLeader ? (
        <button type="button" className="dv-link" onClick={() => setRoleOpen(true)}>
          {tr("غيّروا الصلاحية")}
        </button>
      ) : null;
    if (p.status === "invited")
      return (
        <a className="dv-glass" href={whatsappUrl(tr("{0}، باقي تربط درايفك بمجلد البحث على Wesync: {1}", p.name, inviteLink()))} target="_blank" rel="noreferrer">
          {tr("ذكّروه بالواتساب")}
        </a>
      );
    if (p.status === "missing_email" && isLeader && connected)
      return (
        <button type="button" className="dv-cream" onClick={() => (setEmailFor(p), setEmailDraft(p.row?.email ?? ""))}>
          {p.supervisor ? tr("أضيفوا إيميلها") : tr("أضيفوا إيميله")}
        </button>
      );
    return null;
  };

  const list = folders ?? DEFAULT_FOLDERS;
  return (
    <div className="relative text-[#EAE3DC]">
      <LuxHead kicker={tr("التقويم والملفات")} title={tr("الدرايف ومين مربوط")} sub={tr("مجلد واحد للفريق والمشرف/ة، وكل شي ينحفظ فيه لحاله")}>
        {status?.folderLink && (
          <a className="lx-ghost" href={status.folderLink} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden />
            {tr("افتحوا المجلد")}
          </a>
        )}
      </LuxHead>

      {/* البطل: الحلقة + مين ناقص وليش + «أرسلوا رابط الربط للباقين» */}
      <section className="lx-card gold lx-in mb-[18px] flex flex-col items-center gap-5 p-6 text-center md:flex-row md:text-start">
        <div className="relative h-[140px] w-[140px] flex-none" role="img" aria-label={tr("{0} من {1} مربوطين", linked, total)}>
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
            <circle cx="70" cy="70" r="62" fill="none" stroke="url(#dv-ring)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct * 389.6} 389.6`} className="dv-ring" />
            <defs>
              <linearGradient id="dv-ring" x1="0" x2="1">
                <stop offset="0" stopColor="#FFC777" />
                <stop offset="1" stopColor="#FF7A1A" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center leading-[1.1]">
            <b className="text-[34px] font-extrabold" dir="ltr">
              {linked}/{total}
            </b>
            <span className="mt-1 text-[12px] text-[#ABA095]">{tr("مربوطين")}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-center gap-1.5 text-[12px] font-extrabold text-[#FFB444] md:justify-start">
            <GoogleDriveLogo size={16} />
            <span dir="auto">
              Wesync · Google Drive{project?.title ? ` — ${project.title}` : ""}
            </span>
          </div>
          <h2 className="m-0 mt-1 text-[26px] font-extrabold text-[#F2EBE3]">{connected ? tr("{0} من {1} مربوطين", linked, total) : tr("الدرايف مو مربوط")}</h2>
          <p className="m-0 mt-1 text-[15px] leading-[1.8] text-[#E9D3B8]">{sentence}</p>
        </div>
        {connected ? (
          linked < total && (
            <a className="lx-go !h-[56px] !px-7" href={whatsappUrl(shareText)} target="_blank" rel="noreferrer">
              <WhatsAppLogo size={18} />
              {tr("أرسلوا رابط الربط للباقين")}
            </a>
          )
        ) : isLeader ? (
          <button type="button" className="lx-go !h-[56px] !px-7" onClick={() => void connect()}>
            <GoogleDriveLogo size={20} />
            {tr("اربطوا الدرايف")}
          </button>
        ) : (
          <span className="text-[14px] text-[#ABA095]">{tr("القائد يربطه من هنا")}</span>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <section className="lx-card lx-in p-[18px]" aria-labelledby="dv-who">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="lx-ic" aria-hidden>
              <Users size={17} />
            </span>
            <h2 id="dv-who" className="lx-h2 flex-1">
              {tr("مين مربوط")}
            </h2>
            <span className="flex items-center gap-1.5 text-[12px] text-[#ABA095]">
              {syncing && <Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {tr("نتأكد كل ساعة")}
            </span>
          </div>
          <ul className="m-0 list-none p-0">
            {people.map((p) => (
              <li key={p.key} className="dv-row">
                <span className={clsx("dv-av", p.supervisor && "sup")} style={{ background: p.color }} aria-hidden>
                  {p.supervisor && p.status !== "missing_email" ? "!" : p.name.trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1 leading-[1.45]">
                  <span className="block truncate">
                    <b className="text-[16px] text-[#F2EBE3]">{p.name}</b> <span className="text-[13px] text-[#ABA095]">· {p.role}</span>
                  </span>
                  <span className="block truncate text-[13px] text-[#E9D3B8]">{p.sub}</span>
                </span>
                <span className="flex flex-none flex-wrap items-center justify-end gap-2 sm:w-[300px] sm:flex-nowrap">
                  {pill(p)}
                  <span className="flex-1" />
                  {action(p)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-[18px]">
          <section className="lx-card lx-in p-[18px]" aria-labelledby="dv-tree">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="lx-ic" aria-hidden>
                <GoogleDriveLogo size={18} />
              </span>
              <h2 id="dv-tree" className="lx-h2 flex-1">
                {tr("ترتيب المجلد")}
              </h2>
              <span className="text-[12px] text-[#ABA095]">{lastSyncAt ? tr("نسويها لحاله") : tr("نسويه أول ما تربطون")}</span>
            </div>
            <ul className="m-0 list-none p-0">
              {list.map((f) => (
                <li key={f.key} className="dv-folder">
                  <Folder size={17} className="text-[#FFC777]" aria-hidden />
                  <b className="flex-1 text-[15px]">{f.name}</b>
                  <span className="text-[13px] font-bold text-[#E9D3B8]" dir="ltr">
                    {folders ? f.count : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="lx-card lx-in p-[18px]">
            <b className="block text-[16px] text-[#F2EBE3]">{tr("ليش الدكتورة «تشوف بس»؟")}</b>
            <p className="m-0 mt-1.5 text-[14px] leading-[1.8] text-[#E9D3B8]">{tr("تشوف كل الملفات وتعلّق، بس ما تعدّل على شغلكم. تقدرون تغيّرونها.")}</p>
          </section>
          {!connected && !isLeader && (
            <button type="button" className="lx-ghost" onClick={() => navigate("/team")}>
              {tr("مين القائد؟")}
            </button>
          )}
        </div>
      </div>

      <Dialog open={!!emailFor} onClose={() => setEmailFor(null)} title={emailFor?.supervisor ? tr("إيميل المشرف/ة") : tr("إيميل {0}", emailFor?.name ?? "")}>
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[14px] text-[#E9D3B8]">{tr("نشارك مجلد الفريق مع هالإيميل، ويوصله تنبيه من Google.")}</p>
          <input className="v3-select w-full" type="email" dir="ltr" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="name@example.com" aria-label={tr("الإيميل")} />
          <button type="button" className="lx-go" disabled={busy || !EMAIL.test(emailDraft.trim())} onClick={() => void saveEmail()}>
            {busy ? tr("نحفظ…") : tr("أضيفوه وشاركوا المجلد")}
          </button>
        </div>
      </Dialog>
      <Dialog open={roleOpen} onClose={() => setRoleOpen(false)} title={tr("صلاحية {0}", supName)}>
        <div className="flex flex-col gap-2">
          {(
            [
              ["commenter", tr("تشوف وتعلّق (الافتراضي)"), tr("تشوف كل الملفات وتعلّق، بس ما تعدّل")],
              ["reader", tr("تقرا بس"), tr("تشوف الملفات بدون تعليقات")],
              ["writer", tr("تعدّل"), tr("تعدّل على ملفات الفريق مثلكم")],
            ] as const
          ).map(([id, title, sub]) => {
            const on = (people.find((p) => p.supervisor)?.row?.role ?? "commenter") === id;
            return (
              <button key={id} type="button" className={clsx("dv-opt", on && "on")} onClick={() => void changeRole(id)} disabled={busy}>
                <b className="block text-[15px]">{title}</b>
                <span className="block text-[13px] text-[#ABA095]">{sub}</span>
              </button>
            );
          })}
        </div>
      </Dialog>
    </div>
  );
}
