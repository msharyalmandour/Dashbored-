import { useCallback, useEffect, useRef, useState } from "react";
import type { Participant, RemoteParticipant, Room, Track as TrackT, VideoTrack } from "livekit-client";
import { decodeData, encodeData, type MeetData } from "../lib/meet";

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

export function useMeetRoom() {
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

  const snapshot = useCallback(() => {
    const room = roomRef.current;
    const Track = trackMod.current;
    if (!room || !Track) return;
    const all: Participant[] = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
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
      room.on(E.ParticipantDisconnected, (p: RemoteParticipant) => {
        delete handsRef.current[p.identity];
        setHands({ ...handsRef.current });
        snapshot();
      });
      room.on(E.DataReceived, (payload: Uint8Array, p?: RemoteParticipant) => {
        const d: MeetData | null = decodeData(payload);
        if (!d || !p) return;
        if (d.t === "chat") setChat((c) => [...c, { id: d.id, from: p.identity, name: p.name || p.identity, text: d.text, at: d.at, mine: false }].slice(-200));
        if (d.t === "hand") {
          handsRef.current = { ...handsRef.current, [p.identity]: d.up };
          setHands(handsRef.current);
          snapshot();
        }
      });
      room.on(E.Reconnecting, () => setState("reconnecting"));
      room.on(E.Reconnected, () => setState("live"));
      room.on(E.Disconnected, () => setState((s) => (s === "error" ? s : "ended")));
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
    [snapshot],
  );

  const toggleMic = useCallback(async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled).catch(() => {});
    snapshot();
  }, [snapshot]);
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
  const send = useCallback(async (d: MeetData) => {
    await roomRef.current?.localParticipant.publishData(encodeData(d), { reliable: true }).catch(() => {});
  }, []);
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
    await roomRef.current?.disconnect();
    document.querySelectorAll("[data-meet-audio]").forEach((el) => el.remove());
    setState("ended");
  }, []);
  /** المتصفح منع الصوت التلقائي: ضغطة من المستخدم تشغّله */
  const unblockAudio = useCallback(async () => {
    await roomRef.current?.startAudio().catch(() => {});
    setAudioBlocked(!roomRef.current?.canPlaybackAudio);
  }, []);

  useEffect(
    () => () => {
      void roomRef.current?.disconnect();
      document.querySelectorAll("[data-meet-audio]").forEach((el) => el.remove());
    },
    [],
  );

  const me = roomRef.current?.localParticipant.identity ?? "";
  return { state, tiles, chat, hands, myHand: !!hands[me], startedAt, error, audioBlocked, unblockAudio, connect, toggleMic, toggleCam, toggleScreen, sendChat, toggleHand, leave };
}

/** يربط مسار الفيديو بعنصر <video> ويفكّه لما يتغيّر */
export function attachVideo(el: HTMLVideoElement | null, track: TrackT | null) {
  if (!el || !track) return () => {};
  track.attach(el);
  return () => {
    track.detach(el);
  };
}
