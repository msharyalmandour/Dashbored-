import { useCallback, useEffect, useRef, useState } from "react";
import type { Participant, RemoteParticipant, Room, Track as TrackT, VideoTrack } from "livekit-client";
import { decodeData, encodeData, type MeetData } from "../lib/meet";
import { addLine, type TxLine } from "../lib/meetTranscript";
import { listen } from "../lib/voice";
import { LiveStt, liveSttPossible } from "../lib/liveStt";
import { track as trackEvent } from "../lib/analytics";

/** غرفة Wesync Meet فوق livekit-client (تنحمّل المكتبة وقت الدخول بس) */

export interface Tile {
  identity: string;
  name: string;
  role: string;
  isLocal: boolean;
  speaking: boolean;
  mic: boolean;
  cam: boolean;
  video: VideoTrack | null;
  screen: VideoTrack | null;
  hand: boolean;
}
export interface ChatMsg {
  id: string;
  from: string;
  name: string;
  text: string;
  at: number;
  mine: boolean;
}
export type MeetState = "idle" | "connecting" | "live" | "reconnecting" | "ended" | "error";

const roleOf = (p: Participant) => {
  try {
    return (JSON.parse(p.metadata || "{}") as { role?: string }).role ?? "student";
  } catch {
    return "student";
  }
};

/** محرك كتابة كلامي: ElevenLabs الحي من مسار المايك نفسه (للأعضاء)، وإلا كتابة المتصفح */
type Stt = { kind: "pending" | "live" | "browser"; stop: () => Promise<void> };
const lineId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useMeetRoom(opts: { liveStt?: boolean } = {}) {
  const useLive = opts.liveStt !== false;
  const roomRef = useRef<Room | null>(null);
  const trackMod = useRef<typeof import("livekit-client").Track | null>(null);
  const [state, setState] = useState<MeetState>("idle");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [hands, setHands] = useState<Record<string, boolean>>({});
  const handsRef = useRef<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  // ── نص الاجتماع (بدون تسجيل صوت) ──
  const [lines, setLines] = useState<TxLine[]>([]);
  const [txOn, setTxOn] = useState(false);
  const txOnRef = useRef(false);
  const [txBy, setTxBy] = useState<string>("");
  const [optOut, setOptOutState] = useState(false);
  const optOutRef = useRef(false);
  const [myInterim, setMyInterim] = useState("");
  const [txUnsupported, setTxUnsupported] = useState(false);
  const stt = useRef<Stt | null>(null);
  const sttAttempt = useRef(0);
  /** كل اللي دخلوا الاجتماع (للحضور بالمحضر) */
  const seen = useRef(new Map<string, { identity: string; name: string; role: string }>());

  const snapshot = useCallback(() => {
    const room = roomRef.current;
    const Track = trackMod.current;
    if (!room || !Track) return;
    const all: Participant[] = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    for (const p of all) seen.current.set(p.identity, { identity: p.identity, name: p.name || p.identity, role: roleOf(p) });
    setTiles(
      all.map((p) => {
        const cam = p.getTrackPublication(Track.Source.Camera);
        const scr = p.getTrackPublication(Track.Source.ScreenShare);
        return {
          identity: p.identity,
          name: p.name || p.identity,
          role: roleOf(p),
          isLocal: p === room.localParticipant,
          speaking: p.isSpeaking,
          mic: p.isMicrophoneEnabled,
          cam: !!cam?.track && !cam.isMuted,
          video: cam?.track && !cam.isMuted ? (cam.track as VideoTrack) : null,
          screen: scr?.track ? (scr.track as VideoTrack) : null,
          hand: !!handsRef.current[p.identity],
        };
      }),
    );
  }, []);

  const sendRaw = useCallback(async (d: MeetData, to?: string[]) => {
    await roomRef.current?.localParticipant.publishData(encodeData(d), { reliable: true, ...(to ? { destinationIdentities: to } : {}) }).catch(() => {});
  }, []);

  const stopStt = useCallback(async () => {
    sttAttempt.current++;
    const cur = stt.current;
    stt.current = null;
    setMyInterim("");
    if (cur) await cur.stop().catch(() => {});
  }, []);

  /** يبدأ يكتب كلامي ويرسله للغرفة سطر سطر */
  const startStt = useCallback(async () => {
    const room = roomRef.current;
    const Track = trackMod.current;
    if (!room || !Track || stt.current) return;
    const attempt = ++sttAttempt.current;
    const lp = room.localParticipant;
    const emit = (raw: string) => {
      const text = raw.replace(/\s+/g, " ").trim().slice(0, 600);
      if (!text) return;
      const l: TxLine = { id: lineId(), who: lp.identity, name: lp.name || "", role: roleOf(lp), text, at: Date.now(), mine: true };
      setLines((x) => addLine(x, l));
      void sendRaw({ t: "line", id: l.id, text, at: l.at });
    };
    const browser = () => {
      const stop = listen(emit, setMyInterim);
      if (!stop) {
        stt.current = null;
        setTxUnsupported(true);
        return;
      }
      stt.current = { kind: "browser", stop: async () => stop() };
    };
    stt.current = { kind: "pending", stop: async () => {} };
    const mst = lp.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
    if (useLive && mst && liveSttPossible()) {
      let emitted = 0;
      const live = new LiveStt(
        (text, partial) => {
          const delta = text.slice(emitted).trim();
          if (delta) {
            emitted = text.length;
            emit(delta);
          }
          setMyInterim(partial);
        },
        () => {
          // انقطع وسط الاجتماع: نكمّل بكتابة المتصفح
          live.close();
          if (sttAttempt.current === attempt && stt.current?.kind === "live") browser();
        },
      );
      const ok = await live.start(new MediaStream([mst]));
      if (sttAttempt.current !== attempt) {
        live.close();
        return;
      }
      if (ok) {
        stt.current = {
          kind: "live",
          stop: async () => {
            const text = await live.finish();
            const delta = text.slice(emitted).trim();
            if (delta) emit(delta);
          },
        };
        return;
      }
    }
    if (sttAttempt.current === attempt) browser();
  }, [sendRaw, useLive]);

  /** الكتابة تشتغل بس لو: النص شغّال للغرفة، وما طلبت «لا تكتبون كلامي»، ومايكي مفتوح */
  const syncStt = useCallback(() => {
    const lp = roomRef.current?.localParticipant;
    const want = !!lp && txOnRef.current && !optOutRef.current && lp.isMicrophoneEnabled;
    if (want && !stt.current) void startStt();
    if (!want && stt.current) void stopStt();
  }, [startStt, stopStt]);

  const connect = useCallback(
    async (url: string, token: string, opts: { mic: boolean; cam: boolean }) => {
      setState("connecting");
      setError(null);
      const lk = await import("livekit-client");
      trackMod.current = lk.Track;
      const room = new lk.Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true } });
      roomRef.current = room;
      const E = lk.RoomEvent;
      const refresh = () => snapshot();
      [E.ParticipantConnected, E.TrackSubscribed, E.TrackUnsubscribed, E.LocalTrackPublished, E.LocalTrackUnpublished, E.TrackMuted, E.TrackUnmuted, E.ActiveSpeakersChanged, E.ParticipantNameChanged].forEach((ev) =>
        room.on(ev, refresh),
      );
      // الصوت: LiveKit ما يشغّل صوت الباقين لحاله — نربط كل مسار صوت بعنصر <audio> مخفي
      room.on(E.TrackSubscribed, (track) => {
        if (track.kind !== lk.Track.Kind.Audio) return;
        const el = track.attach();
        el.setAttribute("data-meet-audio", "");
        el.style.display = "none";
        document.body.appendChild(el);
      });
      room.on(E.TrackUnsubscribed, (track) => {
        if (track.kind === lk.Track.Kind.Audio) track.detach().forEach((el) => el.remove());
      });
      room.on(E.AudioPlaybackStatusChanged, () => setAudioBlocked(!room.canPlaybackAudio));
      room.on(E.ParticipantConnected, (p: RemoteParticipant) => {
        if (txOnRef.current) void sendRaw({ t: "tx", on: true }, [p.identity]);
      });
      room.on(E.ParticipantDisconnected, (p: RemoteParticipant) => {
        delete handsRef.current[p.identity];
        setHands({ ...handsRef.current });
        snapshot();
      });
      room.on(E.DataReceived, (payload: Uint8Array, p?: RemoteParticipant) => {
        const d: MeetData | null = decodeData(payload);
        if (!d || !p) return;
        if (d.t === "chat") setChat((c) => [...c, { id: d.id, from: p.identity, name: p.name || p.identity, text: d.text, at: d.at, mine: false }].slice(-200));
        if (d.t === "line") setLines((x) => addLine(x, { id: `${p.identity}:${d.id}`, who: p.identity, name: p.name || p.identity, role: roleOf(p), text: d.text, at: d.at, mine: false }));
        if (d.t === "tx" && d.on !== txOnRef.current) {
          txOnRef.current = d.on;
          setTxOn(d.on);
          setTxBy(d.on ? p.name || "" : "");
          syncStt();
        }
        if (d.t === "hand") {
          handsRef.current = { ...handsRef.current, [p.identity]: d.up };
          setHands(handsRef.current);
          snapshot();
        }
      });
      room.on(E.Reconnecting, () => setState("reconnecting"));
      room.on(E.Reconnected, () => setState("live"));
      room.on(E.Disconnected, () => {
        void stopStt();
        setState((s) => (s === "error" ? s : "ended"));
      });
      try {
        await room.connect(url, token);
        await room.startAudio().catch(() => {});
        setAudioBlocked(!room.canPlaybackAudio);
        setStartedAt(Date.now());
        setState("live");
        await room.localParticipant.setMicrophoneEnabled(opts.mic).catch(() => {});
        await room.localParticipant.setCameraEnabled(opts.cam).catch(() => {});
        snapshot();
      } catch (e) {
        setError(String((e as Error)?.message ?? e));
        setState("error");
      }
    },
    [snapshot, sendRaw, syncStt, stopStt],
  );

  const toggleMic = useCallback(async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled).catch(() => {});
    snapshot();
    syncStt();
  }, [snapshot, syncStt]);
  const toggleCam = useCallback(async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setCameraEnabled(!lp.isCameraEnabled).catch(() => {});
    snapshot();
  }, [snapshot]);
  const toggleScreen = useCallback(async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: false }).catch(() => {});
    snapshot();
  }, [snapshot]);
  const send = useCallback((d: MeetData) => sendRaw(d), [sendRaw]);

  /** النص للغرفة كلها: أي أحد يشغّله أو يوقفه، والكل يشوف إنه شغّال */
  const toggleTx = useCallback(async () => {
    const on = !txOnRef.current;
    txOnRef.current = on;
    setTxOn(on);
    setTxBy(on ? roomRef.current?.localParticipant.name || "" : "");
    syncStt();
    await sendRaw({ t: "tx", on });
    if (on) trackEvent("meet_transcript_on", {});
  }, [sendRaw, syncStt]);
  /** «لا تكتبون كلامي» — لي أنا بس */
  const setOptOut = useCallback(
    (v: boolean) => {
      optOutRef.current = v;
      setOptOutState(v);
      syncStt();
    },
    [syncStt],
  );
  const sendChat = useCallback(
    async (text: string) => {
      const room = roomRef.current;
      const t = text.trim();
      if (!room || !t) return;
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      setChat((c) => [...c, { id, from: room.localParticipant.identity, name: room.localParticipant.name ?? "", text: t, at: Date.now(), mine: true }]);
      await send({ t: "chat", id, text: t.slice(0, 2000), at: Date.now() });
    },
    [send],
  );
  const toggleHand = useCallback(async () => {
    const me = roomRef.current?.localParticipant.identity;
    if (!me) return;
    const up = !handsRef.current[me];
    handsRef.current = { ...handsRef.current, [me]: up };
    setHands(handsRef.current);
    snapshot();
    await send({ t: "hand", up });
  }, [send, snapshot]);
  const leave = useCallback(async () => {
    // آخر جملة قبل ما نطلع (لين ثانية ونص)
    await stopStt();
    await roomRef.current?.disconnect();
    document.querySelectorAll("[data-meet-audio]").forEach((el) => el.remove());
    setState("ended");
  }, [stopStt]);
  /** المتصفح منع الصوت التلقائي: ضغطة من المستخدم تشغّله */
  const unblockAudio = useCallback(async () => {
    await roomRef.current?.startAudio().catch(() => {});
    setAudioBlocked(!roomRef.current?.canPlaybackAudio);
  }, []);

  useEffect(
    () => () => {
      void stt.current?.stop();
      stt.current = null;
      void roomRef.current?.disconnect();
      document.querySelectorAll("[data-meet-audio]").forEach((el) => el.remove());
    },
    [],
  );

  const me = roomRef.current?.localParticipant.identity ?? "";
  const people = useCallback(() => Array.from(seen.current.values()), []);
  return {
    state, tiles, chat, hands, myHand: !!hands[me], startedAt, error, audioBlocked, unblockAudio, connect, toggleMic, toggleCam, toggleScreen, sendChat, toggleHand, leave,
    lines, txOn, txBy, toggleTx, optOut, setOptOut, myInterim, txUnsupported, people,
  };
}

/** يربط مسار الفيديو بعنصر <video> ويفكّه لما يتغيّر */
export function attachVideo(el: HTMLVideoElement | null, track: TrackT | null) {
  if (!el || !track) return () => {};
  track.attach(el);
  return () => {
    track.detach(el);
  };
}
