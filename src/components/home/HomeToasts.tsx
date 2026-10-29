import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import clsx from "clsx";
import { GmailLogo, GoogleDriveLogo } from "../ui/BrandLogos";
import { useAuth } from "../../context/AuthContext";
import { useSupervisorMessages } from "../../hooks/useSupervisorMessages";
import { useResearchProject } from "../../hooks/useResearchProject";
import { useEmailReminders } from "../../hooks/useEmailReminders";
import { driveErrorMessage, getDriveStatus, peekDriveStatus, startDriveConnect, type DriveStatus } from "../../lib/driveTeam";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { num } from "../v3/WriteHeader";
import { tr } from "../../lib/i18n";

/* إشعارات الرئيسية: تنزل وحدة ورا الثانية بوسط الشاشة، كل وحدة ٥ ثواني.
   ١) رسالة المشرفة الجديدة  ٢) ربط Google Drive (لو مو مربوط)  ٣) تذكيرات الإيميل (لو مطفية)
   - مرة وحدة بكل جلسة. اللي يقفله المستخدم ما يرجع إلا بتحديث جديد (رسالة جديدة).
   - الماوس فوق الإشعار يوقف العدّاد، والضغط عليه يثبّته لين يقفله.
   - إشعار التفعيل يختفي نهائيًا بعد ما يتفعّل (لأن شرطه ما يعود يتحقق). */

const LIFE_MS = 5000;
const SESSION_KEY = "wesync.homeToasts.shown";
const dismissedKey = (uid: string) => `wesync.homeToasts.dismissed.${uid}`;

type Kind = "supervisor" | "drive" | "email";
interface ToastItem {
  key: string;
  kind: Kind;
}

function readDismissed(uid: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(dismissedKey(uid)) ?? "[]");
  } catch {
    return [];
  }
}
function addDismissed(uid: string, key: string) {
  try {
    const list = readDismissed(uid);
    if (!list.includes(key)) localStorage.setItem(dismissedKey(uid), JSON.stringify([...list, key].slice(-40)));
  } catch {
    // بدون تخزين: يرجع بالجلسة الجاية
  }
}

/** أول حرف من الاسم بدون «د.» */
const initial = (name: string) => name.replace(/^\s*(د\.|Dr\.?)\s*/i, "").trim().replace(/^ال(?=\S{2})/, "").charAt(0) || "؟";

const Dots = () => (
  <span className="v3-typing" aria-hidden>
    <i />
    <i />
    <i />
  </span>
);

export default function HomeToasts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.id ?? "guest";
  const demo = !isSupabaseConfigured;
  const { messages, unread } = useSupervisorMessages();
  const { project } = useResearchProject();
  const email = useEmailReminders(currentUser?.id, isSupabaseConfigured);
  const [drive, setDrive] = useState<DriveStatus | null>(() => peekDriveStatus(currentUser?.id));
  const [driveChecked, setDriveChecked] = useState(demo);

  useEffect(() => {
    if (demo) return;
    let alive = true;
    getDriveStatus().then((s) => {
      if (!alive) return;
      if (!s.unreachable) setDrive(s);
      setDriveChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [demo]);

  const latest = useMemo(() => [...messages].reverse().find((m) => m.sender === "supervisor") ?? null, [messages]);

  // ── نبني الطابور مرة وحدة بعد ما توصل البيانات (أو بعد ٣ ثواني كحد أقصى) ──
  const [queue, setQueue] = useState<ToastItem[] | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(t);
  }, []);
  const dataReady = ready || (driveChecked && !email.loading);

  useEffect(() => {
    if (queue !== null || !dataReady || !currentUser) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // ما يهم
    }
    if (shown) {
      setQueue([]);
      return;
    }
    const dismissed = readDismissed(uid);
    const items: ToastItem[] = [];
    if (latest && (unread > 0 || demo) && !dismissed.includes(`sup:${latest.id}`)) items.push({ key: `sup:${latest.id}`, kind: "supervisor" });
    const driveNeeded = demo || (drive?.configured && !drive.connected && !drive.unreachable && drive.isLeader);
    if (driveNeeded && !dismissed.includes("drive")) items.push({ key: "drive", kind: "drive" });
    const emailOff = demo || (!email.loading && email.value === false);
    if (emailOff && !dismissed.includes("email")) items.push({ key: "email", kind: "email" });
    setQueue(items);
    if (items.length) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // ما يهم
      }
    }
  }, [queue, dataReady, currentUser, uid, latest, unread, demo, drive, email.loading, email.value]);

  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const remaining = useRef(LIFE_MS);
  const startedAt = useRef(0);

  const current = queue?.[index];
  const total = queue?.length ?? 0;

  const next = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setPinned(false);
      setPaused(false);
      remaining.current = LIFE_MS;
      setIndex((i) => i + 1);
    }, 400);
  }, []);

  // عمر الإشعار: ٥ ثواني، يوقف مع الماوس أو بعد الضغط
  useEffect(() => {
    if (!current || leaving || paused || pinned) return;
    startedAt.current = Date.now();
    const t = setTimeout(next, remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [current, leaving, paused, pinned, next]);

  const dismiss = () => {
    if (current) addDismissed(uid, current.key);
    next();
  };

  // ── درايف: جاري الربط ← انربط ✓ ──
  const [driveState, setDriveState] = useState<"idle" | "connecting" | "done" | "error">("idle");
  const [driveMsg, setDriveMsg] = useState<string | null>(null);
  const popup = useRef<Window | null>(null);
  const connectDrive = async () => {
    setPinned(true);
    setDriveState("connecting");
    setDriveMsg(null);
    if (demo) {
      setTimeout(() => setDriveState("done"), 1800);
      return;
    }
    popup.current = window.open("", "_blank");
    const r = await startDriveConnect();
    if (r.data?.url) {
      if (popup.current && !popup.current.closed) popup.current.location.href = r.data.url;
      else window.location.href = r.data.url;
      return;
    }
    popup.current?.close();
    setDriveState("error");
    setDriveMsg(driveErrorMessage(r.error));
  };
  // نتابع حالة الربط كل ٣ ثواني لين ينربط أو تنقفل نافذة قوقل
  useEffect(() => {
    if (driveState !== "connecting" || demo) return;
    const started = Date.now();
    const t = setInterval(async () => {
      const s = await getDriveStatus({ fresh: true });
      if (s.connected) {
        setDrive(s);
        setDriveState("done");
        return;
      }
      const closed = !popup.current || popup.current.closed;
      if (Date.now() - started > 5 * 60_000 || (closed && Date.now() - started > 10_000)) {
        setDriveState("error");
        setDriveMsg(tr("انقفلت نافذة قوقل قبل ما يكتمل الربط. جرّبوا مرة ثانية."));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [driveState, demo]);
  useEffect(() => {
    if (driveState !== "done") return;
    const t = setTimeout(next, 2500);
    return () => clearTimeout(t);
  }, [driveState, next]);

  // ── الإيميل: المفتاح ينزلق ويتوهج ← شغّالة ✓ ──
  const [emailState, setEmailState] = useState<"off" | "saving" | "on" | "error">("off");
  const turnOnEmail = async () => {
    if (emailState === "saving" || emailState === "on") return;
    setPinned(true);
    setEmailState("saving");
    const ok = demo ? true : await email.update(true);
    // نخلي المفتاح ينزلق أول قبل ما تطلع «شغّالة»
    setTimeout(() => setEmailState(ok ? "on" : "error"), 450);
  };
  useEffect(() => {
    if (emailState !== "on") return;
    const t = setTimeout(next, 2200);
    return () => clearTimeout(t);
  }, [emailState, next]);

  if (!current) return null;

  const supName = latest?.senderName?.trim() || project?.supervisorName?.trim() || tr("المشرف/ة");

  let body: ReactNode = null;
  if (current.kind === "supervisor" && latest) {
    body = (
      <>
        <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-[#FFC85A] text-[19px] font-extrabold text-[#1A0A02]" aria-hidden>
          {initial(supName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b className="truncate text-base">{tr("رسالة من {0}", supName)}</b>
            <span className="shrink-0 text-xs text-[var(--ws-c-muted)]">· {tr("جديدة")}</span>
          </div>
          <p className="m-0 line-clamp-2 text-sm leading-[1.6] text-[#E6DDD3]" dir="auto">
            «{latest.body}»
          </p>
        </div>
        <button
          type="button"
          className="v3-bw shrink-0 !min-h-[40px] !px-[18px] !text-[13px]"
          onClick={() => {
            addDismissed(uid, current.key);
            navigate("/feedback");
          }}
        >
          {tr("ردّوا")}
        </button>
      </>
    );
  } else if (current.kind === "drive") {
    body = (
      <>
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-white shadow-[0_8px_18px_rgba(0,0,0,.35)]" aria-hidden>
          <GoogleDriveLogo size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <b className="text-base">{driveState === "done" ? tr("انربط Google Drive") : tr("نربط Google Drive")}</b>
          <p className="m-0 text-sm text-[#E6DDD3]">{driveMsg ?? tr("مجلد واحد للفريق، وينشارك مع المشرف/ة")}</p>
        </div>
        <div className="flex min-w-[120px] shrink-0 items-center justify-end gap-2" aria-live="polite">
          {driveState === "idle" || driveState === "error" ? (
            <button type="button" className="v3-bd !min-h-[40px] !px-4 !text-[13px]" onClick={connectDrive}>
              {driveState === "error" ? tr("جرّبوا مرة ثانية") : tr("اربطوه")}
            </button>
          ) : driveState === "connecting" ? (
            <>
              <span className="text-[13px] text-[var(--ws-c-warn)]">{tr("جاري الربط")}</span>
              <Dots />
              <span className="ws-spin" aria-hidden />
            </>
          ) : (
            <>
              <span className="text-[13px] font-bold text-[var(--ws-c-done)]">{tr("انربط")}</span>
              <span className="ws-ok" aria-hidden>
                ✓
              </span>
            </>
          )}
        </div>
      </>
    );
  } else if (current.kind === "email") {
    const on = emailState === "saving" || emailState === "on";
    body = (
      <>
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-white shadow-[0_8px_18px_rgba(0,0,0,.35)]" aria-hidden>
          <GmailLogo size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <b className="text-base">{tr("تذكيرات الإيميل")}</b>
          <p className="m-0 text-sm text-[#E6DDD3]">
            {emailState === "error" ? tr("ما انحفظ. جرّبوا مرة ثانية.") : tr("المتأخر + تقرير الفريق كل أسبوع")}
          </p>
        </div>
        <div className="flex min-w-[110px] shrink-0 items-center justify-end gap-2" aria-live="polite">
          {emailState === "on" ? (
            <>
              <span className="text-[13px] font-bold text-[var(--ws-c-done)]">{tr("شغّالة")}</span>
              <span className="ws-ok" aria-hidden>
                ✓
              </span>
            </>
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={tr("شغّلوا تذكيرات الإيميل")}
              onClick={turnOnEmail}
              className="grid min-h-[44px] min-w-[56px] place-items-center"
            >
              <span className={clsx("ws-toggle", on && "on")}>
                <b />
              </span>
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[84px] z-[45] flex justify-center px-4" role="region" aria-label={tr("إشعارات")}>
      <div
        key={current.key}
        className={clsx("ws-toast pointer-events-auto relative w-full max-w-[600px] overflow-hidden rounded-[24px] px-4 pb-4 pt-3.5", leaving && "out")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={() => setPinned(true)}
        onFocus={() => setPaused(true)}
        role="status"
      >
        <div className="mb-1 flex items-center justify-end gap-2">
          <span className="text-xs text-[var(--ws-c-muted)]">{tr("{0} من {1}", num(index + 1), num(total))}</span>
          <button type="button" onClick={dismiss} aria-label={tr("إغلاق")} className="grid h-8 w-8 place-items-center rounded-full text-[var(--ws-c-muted)] hover:bg-white/10 hover:text-[var(--ws-c-text)]">
            <X size={15} />
          </button>
        </div>
        <div className="flex items-center gap-3.5">{body}</div>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.08]" aria-hidden>
          <i className="ws-life" style={{ animationPlayState: paused || pinned || leaving ? "paused" : "running" }} />
        </div>
      </div>
    </div>
  );
}
