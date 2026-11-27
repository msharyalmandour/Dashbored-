// Wesync Meet — توقيع توكن LiveKit (JWT HS256) بدون مكتبات، وأدوات صغيرة قابلة للاختبار.
const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const b64json = (o: unknown) => b64url(enc.encode(JSON.stringify(o)));

export async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const head = b64json({ alg: "HS256", typ: "JWT" });
  const body = b64json(payload);
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

export interface Grant {
  room: string;
  roomJoin?: boolean;
  roomAdmin?: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  canUpdateOwnMetadata?: boolean;
}

/** توكن دخول غرفة: صالح ٤ ساعات */
export function accessToken(opts: { apiKey: string; secret: string; identity: string; name?: string; metadata?: Record<string, unknown>; grant: Grant; ttlSec?: number; now?: number }) {
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  return signJwt(
    {
      iss: opts.apiKey,
      sub: opts.identity,
      nbf: now - 10,
      exp: now + (opts.ttlSec ?? 4 * 3600),
      ...(opts.name ? { name: opts.name } : {}),
      ...(opts.metadata ? { metadata: JSON.stringify(opts.metadata) } : {}),
      video: opts.grant,
    },
    opts.secret,
  );
}

/** غرفة الفريق ثابتة: كل اجتماعات الفريق بنفس الغرفة */
export const roomName = (teamId: string) => `wesync-${teamId}`;

/** wss://x.livekit.cloud → https://x.livekit.cloud (لنداءات الخادم) */
export const httpUrl = (wsUrl: string) => wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/+$/, "");

/** اسم الضيف: نص قصير نظيف */
export const cleanName = (s: unknown, fallback: string) => {
  const t = String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
  return t || fallback;
};
