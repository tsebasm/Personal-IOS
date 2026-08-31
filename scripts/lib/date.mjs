// Mirrors the date helpers in lib/date.ts (kept separate because scripts run
// as plain Node ESM, not through Next's TS pipeline).

export function isoDateInTimezone(timezone, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

export function shiftIsoDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Offset (ms) of `timeZone` from UTC at `instantMs` — works for any IANA zone, independent of the host's own timezone. */
function timezoneOffsetMs(instantMs, timeZone) {
  const d = new Date(instantMs);
  const utcStr = d.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = d.toLocaleString("en-US", { timeZone });
  return new Date(utcStr).getTime() - new Date(tzStr).getTime();
}

/**
 * Converts a wall-clock "YYYY-MM-DD" + "HH:MM" reading *in* `timeZone* into
 * the matching UTC instant (ISO string) — e.g. calendar_events.starts_at
 * needs a real timestamptz, but the seed only knows "08:00 local time".
 */
export function zonedTimeToUtcIso(dateIso, timeStr, timeZone) {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guessMs = Date.UTC(y, m - 1, d, hh, mm, 0);
  return new Date(guessMs + timezoneOffsetMs(guessMs, timeZone)).toISOString();
}
