const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

/** "YYYY-MM-DD" for `date` as seen in `timezone` — matches Postgres `date` columns. */
export function isoDateInTimezone(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

export function isoDateDaysAgo(timezone: string, daysAgo: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - daysAgo);
  return isoDateInTimezone(timezone, now);
}

/** Shifts an "YYYY-MM-DD" string by `days` (can be negative) without a Date library. */
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** "jueves, 8 de noviembre" — greeting subtitle, timezone-aware. */
export function friendlyDate(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayIdx = new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day"))
  ).getDay();
  return `${DIAS[weekdayIdx]}, ${Number(get("day"))} de ${MESES[Number(get("month")) - 1]}`;
}

/**
 * Instante UTC (ISO) en que empieza el día `isoDate` en `timezone`. Para
 * filtrar timestamptz por "hoy del usuario" — `${date}T00:00:00` sería
 * medianoche UTC, 5 h antes de la medianoche de Bogotá.
 */
export function startOfDayInTimezone(isoDate: string, timezone: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  const offset = asLocal - guess; // ms que la zona va por delante de UTC
  return new Date(guess - offset).toISOString();
}
