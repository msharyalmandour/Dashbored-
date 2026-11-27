import { tr } from "./i18n";
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
    "PRODID:-//Wesync//Research Calendar//AR",
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

/** ملف .ics للموعد (يفتح بتقويم الجوال أو قوقل) */
export function downloadIcs(date: string, time: string, minutes: number, who: string) {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const start = new Date(y, mo - 1, d, h || 0, m || 0);
  const end = new Date(start.getTime() + (minutes || 30) * 60000);
  const z = (t: Date) => t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wesync//AR", "BEGIN:VEVENT", `UID:${z(start)}@wesyncapp.com`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${who ? tr("اجتماع مع {0}", who) : tr("اجتماع المشرف/ة")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const el = Object.assign(document.createElement("a"), { href: url, download: "wesync-meeting.ics" });
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
