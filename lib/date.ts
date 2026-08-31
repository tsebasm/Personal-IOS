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
