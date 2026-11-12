import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Hand, LogOut, MessageSquare, Mic, MicOff, MonitorUp, Send, Video, VideoOff, Volume2 } from "lucide-react";
import { tr } from "../../lib/i18n";
import { track } from "../../lib/analytics";
import { fmtClock, gridCols, type MeetJoin, type MeetStatus } from "../../lib/meet";
import { attachVideo, useMeetRoom, type Tile } from "../../hooks/useMeetRoom";
import type { VideoTrack } from "livekit-client";

/** Wesync Meet: قبل الدخول → الغرفة → انتهى. نفس الواجهة للطلاب والمشرف/ة (ضيف برابطه) */

function VideoEl({ track: t, mirror }: { track: VideoTrack; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => attachVideo(ref.current, t), [t]);
  return <video ref={ref} className={mirror ? "mirror" : ""} autoPlay playsInline muted />;
}

function TileView({ t, screen }: { t: Tile; screen?: boolean }) {
  const v = screen ? t.screen : t.video;
  const sup = t.role === "supervisor";
  return (
    <div className={`mt-tile${t.speaking && !screen ? " speaking" : ""}${screen ? " screen" : ""}`}>
      {v ? (
        <VideoEl track={v} mirror={t.isLocal && !screen} />
      ) : (
        <div className="mt-av" aria-hidden>
          <span className={sup ? "sup" : ""}>{(t.name || "؟").trim().charAt(0)}</span>
        </div>
      )}
      {sup && <span className="mt-badge">{tr("المشرف/ة")}</span>}
      {t.hand && !screen && (
        <span className="mt-hand" role="status">
          ✋ {tr("يد مرفوعة")}
        </span>
      )}
      <span className="mt-name">
        {!t.mic && !screen && (
          <span className="muted" aria-label={tr("المايك مقفل")}>
            <MicOff size={13} aria-hidden />
          </span>
        )}
        {screen ? tr("شاشة {0}", t.name) : t.isLocal ? tr("{0} (أنتم)", t.name) : t.name}
      </span>
    </div>
  );
}

/** معاينة الكاميرا قبل الدخول */
function usePreview(cam: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!cam || !navigator.mediaDevices?.getUserMedia) return;
    let s: MediaStream | null = null;
    let off = false;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((m) => {
        if (off) return m.getTracks().forEach((x) => x.stop());
        s = m;
        setStream(m);
        setDenied(false);
      })
      .catch(() => setDenied(true));
    return () => {
      off = true;
      s?.getTracks().forEach((x) => x.stop());
      setStream(null);
    };
  }, [cam]);
  return { stream, denied };
}

function PreviewVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} className="mirror" autoPlay playsInline muted />;
}

/** فوق كل شي بالتطبيق (شريط التبويب وزر الوكيل) */
export default function MeetRoom(props: Parameters<typeof MeetRoomInner>[0]) {
  return createPortal(<MeetRoomInner {...props} />, document.body);
}

function MeetRoomInner({
  title,
  me,
  guest,
  getJoin,
  status,
  onExit,
  afterEnd,
  demo,
}: {
  title: string;
  me: string;
  guest?: boolean;
  getJoin: (name: string) => Promise<MeetJoin | null>;
  status?: MeetStatus | null;
  onExit: () => void;
  /** أزرار بعد ما يخلص (مثل «اكتبوا المحضر») */
  afterEnd?: ReactNode;
  /** عرض تجريبي للصور (بدون اتصال) */
  demo?: Tile[];
}) {
  const room = useMeetRoom();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [name, setName] = useState(me);
  const [busy, setBusy] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [wide, setWide] = useState(() => window.innerWidth >= 900);
  const inRoom = demo ? true : room.state === "live" || room.state === "reconnecting";
  const preview = usePreview(cam && !inRoom && room.state !== "connecting");
  const canShare = typeof navigator !== "undefined" && !!navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices;

  useEffect(() => {
    const r = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  useEffect(() => {
    if (!inRoom) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inRoom]);
  useEffect(() => {
    if (chatOpen) setSeen(room.chat.length);
  }, [chatOpen, room.chat.length]);

  const join = async () => {
    setBusy(true);
    const j = await getJoin(name.trim() || me);
    if (!j?.configured || !j.url || !j.token) {
      setBusy(false);
      return setNotReady(true);
    }
    await room.connect(j.url, j.token, { mic, cam });
    track("meet_join", { guest: !!guest });
    setBusy(false);
  };

  const tiles = demo ?? room.tiles;
  const sharer = tiles.find((t) => t.screen);
  const cols = gridCols(tiles.length, wide);
  const unread = room.chat.length - seen;
  const meTile = tiles.find((t) => t.isLocal);

  // ───────── انتهى ─────────
  if (!demo && room.state === "ended") {
    return (
      <div className="mt-page">
        <div className="mt-pre">
          <div className="sd-glass" style={{ maxWidth: 440, width: "100%", textAlign: "center", padding: 24 }}>
            <div className="sd-ttl" style={{ fontSize: 26 }}>
              {tr("انتهى الاجتماع")}
            </div>
            <p className="mt-hint">{room.startedAt ? tr("مدة الاجتماع {0}", fmtClock(Date.now() - room.startedAt)) : ""}</p>
            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
              {afterEnd}
              <button type="button" className="sup-btn-ghost" style={{ width: "100%" }} onClick={onExit}>
                {tr("رجوع")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────── قبل الدخول ─────────
  if (!inRoom) {
    const others = status?.live ? status.names.filter((n) => n && n !== me) : [];
    return (
      <div className="mt-page">
        <header className="mt-top">
          <span className="sd-sun" aria-hidden style={{ width: 28, height: 28 }} />
          <span className="mt-title">{title}</span>
          <button type="button" className="sup-btn-ghost" style={{ minHeight: 44 }} onClick={onExit}>
            {tr("رجوع")}
          </button>
        </header>
        <div className="mt-pre">
          <div className="mt-pre-in">
            <div>
              <div className="mt-tile">
                {cam && preview.stream ? (
                  <PreviewVideo stream={preview.stream} />
                ) : (
                  <div className="mt-av" aria-hidden>
                    <span>{(name || me || "؟").trim().charAt(0)}</span>
                  </div>
                )}
                <span className="mt-name">{name || me}</span>
              </div>
              <div className="mt-pre-row">
                <button type="button" className={`mt-btn${mic ? "" : " off"}`} aria-pressed={false} aria-label={mic ? tr("اقفلوا المايك") : tr("افتحوا المايك")} onClick={() => setMic(!mic)}>
                  {mic ? <Mic size={20} aria-hidden /> : <MicOff size={20} aria-hidden />}
                </button>
                <button type="button" className={`mt-btn${cam ? "" : " off"}`} aria-pressed={false} aria-label={cam ? tr("اقفلوا الكاميرا") : tr("افتحوا الكاميرا")} onClick={() => setCam(!cam)}>
                  {cam ? <Video size={20} aria-hidden /> : <VideoOff size={20} aria-hidden />}
                </button>
              </div>
              {preview.denied && cam && <p className="mt-hint" style={{ textAlign: "center", color: "#FFB2A6" }}>{tr("المتصفح ما سمح بالكاميرا. اسمحوا لها من إعدادات الموقع، أو ادخلوا بدون كاميرا.")}</p>}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFB444" }}>{tr("اجتماع الفريق")}</div>
              <h1 className="sd-ttl" style={{ fontSize: 30, margin: "2px 0 0", lineHeight: 1.25 }}>
                {tr("جاهزين تدخلون؟")}
              </h1>
              <p className="mt-hint" style={{ fontSize: 14 }}>
                {others.length ? tr("{0} بالاجتماع الحين", others.slice(0, 3).join(tr("، "))) : tr("ما أحد دخل بعد — أول ما تدخلون يقدر الباقين ينضمون.")}
              </p>
              {guest && (
                <label className="sd-field" style={{ marginTop: 14 }}>
                  <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={tr("اسمكم")} aria-label={tr("اسمكم")} />
                </label>
              )}
              {notReady ? (
                <p className="sd-glass" style={{ marginTop: 14, fontSize: 14, color: "#E9D3B8" }}>
                  {tr("الاجتماعات لسا ما تفعّلت على Wesync. أول ما تتفعّل بتشتغل من نفس الزر.")}
                </p>
              ) : (
                <button type="button" className="mt-cta" style={{ marginTop: 16 }} disabled={busy || (guest && !name.trim())} onClick={join}>
                  {busy ? tr("ندخلكم…") : tr("ادخلوا الاجتماع")}
                </button>
              )}
              {room.state === "error" && <p className="mt-hint" style={{ color: "#FFB2A6" }}>{tr("ما قدرنا نوصل للاجتماع — تأكدوا من النت وجرّبوا مرة ثانية.")}</p>}
              <p className="mt-hint">{tr("ما ينسجل فيديو. الكلام يبقى بينكم.")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────── الغرفة ─────────
  const grid = (list: Tile[]) => (
    <div className="mt-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {list.map((t) => (
        <TileView key={t.identity} t={t} />
      ))}
    </div>
  );
  return (
    <div className="mt-page">
      <header className="mt-top">
        <span className="mt-live">
          <i aria-hidden />
          {room.state === "reconnecting" ? tr("نرجع نتصل…") : tr("مباشر")}
        </span>
        <span className="mt-title">{title}</span>
        <span className="mt-meta" dir="ltr">
          {fmtClock(now - (room.startedAt ?? now))}
        </span>
        <span className="mt-meta">{tr("{0} بالاجتماع", tiles.length)}</span>
      </header>
      {room.audioBlocked && (
        <button type="button" className="mt-banner" onClick={room.unblockAudio} style={{ border: 0, color: "inherit", fontFamily: "inherit", cursor: "pointer" }}>
          <Volume2 size={18} aria-hidden />
          {tr("المتصفح وقّف الصوت — اضغطوا هنا عشان تسمعون الباقين")}
        </button>
      )}
      <div className="mt-body">
        <div className="mt-stage">
          {sharer ? (
            <>
              <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
                <div style={{ flex: 1 }}>
                  <TileView t={sharer} screen />
                </div>
              </div>
              <div className="mt-strip">
                {tiles.map((t) => (
                  <TileView key={t.identity} t={t} />
                ))}
              </div>
            </>
          ) : (
            grid(tiles)
          )}
        </div>
        {chatOpen && (
          <aside className="mt-chat" aria-label={tr("محادثة الاجتماع")}>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <b style={{ flex: 1, fontSize: 16 }}>{tr("محادثة الاجتماع")}</b>
              <button type="button" className="sup-btn-ghost" style={{ minHeight: 44 }} onClick={() => setChatOpen(false)}>
                {tr("إغلاق")}
              </button>
            </div>
            <div className="mt-chat-list" aria-live="polite">
              {room.chat.length === 0 && <p className="mt-hint">{tr("الرسائل هنا تختفي بعد الاجتماع. الشي المهم حطوه بالمحضر.")}</p>}
              {room.chat.map((m) => (
                <div key={m.id} className={`mt-msg${m.mine ? " mine" : ""}`}>
                  {!m.mine && <b>{m.name}</b>}
                  <span dir="auto">{m.text}</span>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void room.sendChat(draft);
                setDraft("");
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tr("اكتبوا رسالة…")} aria-label={tr("اكتبوا رسالة…")} />
              <button type="submit" className="mt-btn" aria-label={tr("أرسلوا")} disabled={!draft.trim()}>
                <Send size={18} aria-hidden />
              </button>
            </form>
          </aside>
        )}
      </div>
      <nav className="mt-bar" aria-label={tr("أزرار الاجتماع")}>
        <button type="button" className={`mt-btn${meTile?.mic === false ? " off" : ""}`} aria-label={meTile?.mic === false ? tr("افتحوا المايك") : tr("اقفلوا المايك")} onClick={room.toggleMic}>
          {meTile?.mic === false ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
        </button>
        <button type="button" className={`mt-btn${meTile?.cam === false ? " off" : ""}`} aria-label={meTile?.cam === false ? tr("افتحوا الكاميرا") : tr("اقفلوا الكاميرا")} onClick={room.toggleCam}>
          {meTile?.cam === false ? <VideoOff size={20} aria-hidden /> : <Video size={20} aria-hidden />}
        </button>
        {canShare && (
          <button type="button" className="mt-btn" aria-pressed={!!meTile?.screen} aria-label={meTile?.screen ? tr("وقّفوا مشاركة الشاشة") : tr("شاركوا الشاشة")} onClick={room.toggleScreen}>
            <MonitorUp size={20} aria-hidden />
          </button>
        )}
        <button type="button" className="mt-btn" aria-pressed={room.myHand} aria-label={room.myHand ? tr("نزّلوا اليد") : tr("ارفعوا اليد")} onClick={room.toggleHand}>
          <Hand size={20} aria-hidden />
        </button>
        <button type="button" className="mt-btn" aria-pressed={chatOpen} aria-label={tr("محادثة الاجتماع")} onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare size={20} aria-hidden />
          {unread > 0 && !chatOpen && <span className="dot">{unread}</span>}
        </button>
        <button type="button" className="mt-btn leave" onClick={room.leave} aria-label={tr("اطلعوا")}>
          <LogOut size={18} aria-hidden />
          <span className="lbl">{tr("اطلعوا")}</span>
        </button>
      </nav>
    </div>
  );
}
