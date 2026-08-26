import type { CalendarEvent } from "../data/types";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function toICSStamp(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** يبني ملف .ics قياسي (iCalendar) من أحداث التقويم — يفتح مباشرة بتقويم
    قوقل أو أبل أو أوتلوك، عشان المواعيد تظهر بمكان يشيكونه الطلاب فعليًا */
export function buildICS(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NURSYNC//Research Calendar//AR",
    "CALSCALE:GREGORIAN",
  ];

  for (const e of events) {
    const start = parseDateTime(e.date, e.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@nursync`,
      `DTSTART:${toICSStamp(start)}`,
      `DTEND:${toICSStamp(end)}`,
      `SUMMARY:${escapeICSText(e.title)}`,
      `LOCATION:${escapeICSText(e.location)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(events: CalendarEvent[], filename = "nursync-calendar.ics") {
  const content = buildICS(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
