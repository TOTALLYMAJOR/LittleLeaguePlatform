import type { LeagueEvent } from "./contracts";

export interface PublicCalendarActions {
  appleUrl: string;
  downloadUrl: string;
  fileName: string;
  googleUrl: string;
  outlookUrl: string;
}

function calendarTimestamp(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function eventDescription(event: LeagueEvent, teamName: string) {
  const activity = event.eventType.replace(/_/g, " ");
  const opponent = event.opponent ? ` Opponent: ${event.opponent}.` : "";
  return `${teamName} ${activity}.${opponent} Check LeaguePilot for the current event status before leaving.`;
}

export function buildPublicEventCalendarActions(event: LeagueEvent, teamName: string): PublicCalendarActions {
  const location = [event.locationName, event.locationAddress].filter(Boolean).join(", ");
  const description = eventDescription(event, teamName);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LeaguePilot//Public Schedule//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeCalendarText(event.id)}@leaguepilot.us`,
    `DTSTAMP:${calendarTimestamp(event.updatedAt || event.createdAt)}`,
    `DTSTART:${calendarTimestamp(event.startsAt)}`,
    `DTEND:${calendarTimestamp(event.endsAt)}`,
    `SUMMARY:${escapeCalendarText(event.title)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const calendarDataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarTimestamp(event.startsAt)}/${calendarTimestamp(event.endsAt)}`,
    details: description,
    location
  });
  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: new Date(event.startsAt).toISOString(),
    enddt: new Date(event.endsAt).toISOString(),
    body: description,
    location
  });

  return {
    appleUrl: calendarDataUrl,
    downloadUrl: calendarDataUrl,
    fileName: `${event.id}.ics`,
    googleUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlookUrl: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`
  };
}

export function publicArrivalLabel(event: LeagueEvent) {
  return event.status === "cancelled" ? "Do not travel" : "Not published";
}
