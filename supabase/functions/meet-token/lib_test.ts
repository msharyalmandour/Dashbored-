import { assertEquals, assert } from "jsr:@std/assert@1";
import { accessToken, cleanName, httpUrl, roomName, signJwt } from "./lib.ts";

const dec = (part: string) => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));

Deno.test("signJwt matches a known HS256 vector", async () => {
  // jwt.io المثال المعروف: {"sub":"1234567890","name":"John Doe","iat":1516239022} بسر your-256-bit-secret
  const t = await signJwt({ sub: "1234567890", name: "John Doe", iat: 1516239022 }, "your-256-bit-secret");
  assertEquals(t.split(".")[2], "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
});

Deno.test("accessToken carries LiveKit claims", async () => {
  const t = await accessToken({ apiKey: "APIkey", secret: "s", identity: "u1", name: "ريان", metadata: { role: "student" }, grant: { room: "wesync-t", roomJoin: true, canPublish: true }, now: 1_000_000_000 });
  const [h, p] = t.split(".");
  assertEquals(dec(h), { alg: "HS256", typ: "JWT" });
  const c = dec(p);
  assertEquals(c.iss, "APIkey");
  assertEquals(c.sub, "u1");
  assertEquals(c.exp - c.nbf, 4 * 3600 + 10);
  assertEquals(c.video, { room: "wesync-t", roomJoin: true, canPublish: true });
  assertEquals(JSON.parse(c.metadata), { role: "student" });
});

Deno.test("helpers", () => {
  assertEquals(roomName("abc"), "wesync-abc");
  assertEquals(httpUrl("wss://x.livekit.cloud/"), "https://x.livekit.cloud");
  assertEquals(cleanName("  <b>د. إسراء</b> ", "x"), "bد. إسراء/b");
  assertEquals(cleanName("", "ضيف"), "ضيف");
  assert(cleanName("a".repeat(200), "x").length === 60);
});
