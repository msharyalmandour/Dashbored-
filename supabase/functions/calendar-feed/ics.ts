// بناء ملف iCalendar (RFC 5545) — دوال نقية بدون أي اعتماد، عشان تنختبر بسهولة.

export interface FeedEvent {
  uid: string;
  title: string;
  description?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM بتوقيت الرياض — لو موجود يصير حدث بساعة محددة، وإلا «طوال اليوم» */
  time?: string;
  /** مدة الحدث بالدقايق (افتراضي ٦٠) — للأحداث ذات الساعة فقط */
  durationMin?: number;
  location?: string;
  /** إزاحات التنبيه، مثل "-PT15H" (قبل ١٥ ساعة من بداية اليوم = ٩ م اليوم السابق) */
  alarms?: string[];
}

export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const enc = new TextEncoder();

/** طيّ الأسطر عند ٧٥ بايت (UTF-8) دون قطع حرف في النص. */
export function foldLine(line: string): string {
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      out.push(cur);
      cur = "";
      curBytes = 0;
      limit = 74; // السطر المكمّل يبدأ بمسافة
    }
    cur += ch;
    curBytes += b;
  }
  if (cur) out.push(cur);
  return out.join("\r\n ");
}

function compact(date: string): string {
  return date.replace(/-/g, "");
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** وقت الرياض (ثابت UTC+3 بدون توقيت صيفي) ← صيغة UTC بدون الحاجة لتعريف VTIMEZONE */
export function riyadhToUtc(date: string, time: string, addMinutes = 0): string {
  const [h, m] = time.split(":").map((x) => Number(x));
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), (h || 0) - 3, m || 0));
  d.setUTCMinutes(d.getUTCMinutes() + addMinutes);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildCalendar(name: string, events: FeedEvent[], now = new Date()): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wesync//Research Team//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Asia/Riyadh",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];
  const dtstamp = stamp(now);
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${dtstamp}`,
    );
    const timed = !!e.time && /^\d{1,2}:\d{2}$/.test(e.time);
    if (timed) {
      lines.push(`DTSTART:${riyadhToUtc(e.date, e.time!)}`, `DTEND:${riyadhToUtc(e.date, e.time!, e.durationMin ?? 60)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    lines.push(timed ? "TRANSP:OPAQUE" : "TRANSP:TRANSPARENT");
    for (const a of e.alarms ?? []) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:${a}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
