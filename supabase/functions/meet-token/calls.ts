// «ويسي يتصل» — منطق صافي (بدون شبكة) عشان ينختبر: مين نتصل عليه، ومتى، ووش يقول.

/** الساعة بتوقيت الرياض «HH:MM» وتاريخ اليوم */
export function riyadhNow(nowMs = Date.now()) {
  const d = new Date(nowMs + 3 * 3600_000).toISOString();
  return { date: d.slice(0, 10), minutes: Number(d.slice(11, 13)) * 60 + Number(d.slice(14, 16)) };
}
const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** اجتماعات التقويم اللي وقتها الحين (من دقيقتين قبل لين 3 دقايق بعد) — الجدولة كل 5 دقايق فما يفوت شي */
export function dueMeetings<T extends { event_date: string; event_time: string; event_type: string }>(events: T[], nowMs = Date.now()): T[] {
  const now = riyadhNow(nowMs);
  return events.filter((e) => {
    if (e.event_type !== "meeting" || e.event_date !== now.date) return false;
    const m = toMin(e.event_time);
    return m !== null && m >= now.minutes - 2 && m < now.minutes + 3;
  });
}

/** رقم سعودي بصيغة دولية (+9665xxxxxxxx) أو null */
export function saPhone(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/[^\d]/g, "");
  const n = d.startsWith("00966") ? d.slice(5) : d.startsWith("966") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d;
  return /^5\d{8}$/.test(n) ? `+966${n}` : null;
}

/** مين نتصل عليه بالجوال: فعّل الاتصال، رقمه مؤكد، مو بالاجتماع، ما قال «ما أقدر» أو «داخل»، وما اتصلنا عليه لهالمكالمة */
export function phoneTargets(
  members: { id: string; name: string; female?: boolean }[],
  links: { profile_id: string; phone: string | null; call_me: boolean; linked_at: string | null; paused?: boolean }[],
  inRoom: Set<string>,
  answers: { profile_id: string; answer: string }[],
  alreadyPhoned: Set<string>,
): { id: string; name: string; phone: string; female: boolean }[] {
  const ans = new Map(answers.map((a) => [a.profile_id, a.answer]));
  const link = new Map(links.map((l) => [l.profile_id, l]));
  const out: { id: string; name: string; phone: string; female: boolean }[] = [];
  for (const m of members) {
    const l = link.get(m.id);
    const phone = saPhone(l?.phone);
    if (!l || !l.call_me || !l.linked_at || !phone) continue;
    if (inRoom.has(m.id) || alreadyPhoned.has(m.id)) continue;
    const a = ans.get(m.id);
    if (a === "cant" || a === "join") continue;
    out.push({ id: m.id, name: m.name, phone, female: !!m.female });
  }
  return out;
}

const first = (n: string) => n.trim().split(/\s+/)[0] ?? "";

/** «نورة، أحمد وسارة» */
export function joinNames(names: string[]): string {
  const n = names.map(first).filter(Boolean);
  if (n.length <= 1) return n[0] ?? "";
  return `${n.slice(0, -1).join("، ")} و${n[n.length - 1]}`;
}

/** كلام ويسي بالمكالمة (لهجة سعودية، قصير، بدون ضغط) */
export function callScript(name: string, waiting: string[], female = false): string {
  const w = joinNames(waiting);
  const [open, enter, can, press] = female ? ["افتحي", "وادخلي", "تقدرين", "اضغطي"] : ["افتح", "وادخل", "تقدر", "اضغط"];
  return `هلا ${first(name)}، معك ويسي من ويسنك. فريقك بدأ الاجتماع الحين${w ? `، و${w} ينتظرونك` : ""}. ${open} التطبيق ${enter} من الشريط اللي فوق. وإذا ما ${can}، ${press} «ما أقدر» بالتطبيق وأنا أبلّغهم. نشوفك هناك!`;
}

/** إشعار المكالمة بالتطبيق */
export function ringPush(starter: string, title?: string, female = false): { title: string; body: string } {
  if (title) return { title: "ويسي يتصل 📞", body: `اجتماع «${title}» بدأ الحين — ادخلوا` };
  const who = first(starter);
  return { title: "ويسي يتصل 📞", body: who ? `${who} ${female ? "بدأت" : "بدأ"} اجتماع الفريق — ادخلوا` : "الفريق بدأ الاجتماع — ادخلوا" };
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** TwiML المكالمة: صوت ويسي (لو تولّد) وإلا صوت عربي جاهز، ويتكرر مرة */
export function twiml(audioUrl: string | null, text: string): string {
  const say = audioUrl ? `<Play>${xml(audioUrl)}</Play>` : `<Say language="ar-XA">${xml(text)}</Say>`;
  return `<Response><Pause length="1"/>${say}<Pause length="1"/>${say}</Response>`;
}

export const PHONE_MONTHLY_PER_TEAM = 30;
/** نتصل بالجوال بعد 5 دقايق من المكالمة، ولين 20 دقيقة بالكثير */
export const PHONE_AFTER_MS = 5 * 60_000;
export const PHONE_UNTIL_MS = 20 * 60_000;
