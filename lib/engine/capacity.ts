/**
 * Time Capacity Engine: cuánto tiempo utilizable hay en un día, por modo,
 * a partir de bloques recurrentes. No asume 24 h ni 8 h de trabajo: lo que
 * no está en ningún bloque se reporta como "sin planear", no como capacidad.
 */

export const CAPACITY_KINDS = [
  "sleep",
  "university",
  "transport",
  "meal",
  "exercise",
  "work",
  "deep",
  "shallow",
  "passive",
  "recovery",
  "other",
] as const;
export type CapacityKind = (typeof CAPACITY_KINDS)[number];

export const CAPACITY_KIND_LABEL: Record<CapacityKind, string> = {
  sleep: "Sueño",
  university: "Universidad",
  transport: "Transporte",
  meal: "Alimentación",
  exercise: "Ejercicio",
  work: "Trabajo / empleo",
  deep: "Trabajo profundo",
  shallow: "Trabajo ligero",
  passive: "Pasivo (celular, lectura)",
  recovery: "Descanso / recuperación",
  other: "Otro compromiso",
};

/** Capacidad utilizable para acciones. El transporte es pasivo: sirve para celular, no para deep work. */
export type CapacityMode = "deep" | "shallow" | "passive" | "recovery";
const MODE_OF_KIND: Partial<Record<CapacityKind, CapacityMode>> = {
  deep: "deep",
  shallow: "shallow",
  passive: "passive",
  transport: "passive",
  recovery: "recovery",
};

export type CapacityBlock = {
  id: string;
  label: string;
  kind: CapacityKind;
  days_of_week: number[];
  /** "HH:MM" o "HH:MM:SS" (tipo time de Postgres). */
  start_time: string;
  end_time: string;
  valid_from: string | null;
  valid_to: string | null;
};

export type DayCapacity = {
  date: string;
  /** Minutos utilizables por modo. */
  minutes: Record<CapacityMode, number>;
  /** Minutos comprometidos (sueño, universidad, comidas…). */
  committed: number;
  /** Minutos del día que ningún bloque cubre. */
  unplanned: number;
  blocks: (CapacityBlock & { minutes: number })[];
  /** Hay bloques definidos para este día. */
  configured: boolean;
};

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Duración de un bloque; si cruza medianoche (fin ≤ inicio) suma hasta el día siguiente. */
export function blockMinutes(start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return e > s ? e - s : 24 * 60 - s + e;
}

/** Día de la semana (0 = domingo) de una fecha "YYYY-MM-DD", sin depender de la zona del servidor. */
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function computeDayCapacity(blocks: CapacityBlock[], isoDate: string): DayCapacity {
  const weekday = weekdayOf(isoDate);
  const active = blocks
    .filter(
      (b) =>
        b.days_of_week.includes(weekday) &&
        (!b.valid_from || b.valid_from <= isoDate) &&
        (!b.valid_to || b.valid_to >= isoDate)
    )
    .map((b) => ({ ...b, minutes: blockMinutes(b.start_time, b.end_time) }))
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  const minutes: Record<CapacityMode, number> = { deep: 0, shallow: 0, passive: 0, recovery: 0 };
  let committed = 0;
  for (const b of active) {
    const mode = MODE_OF_KIND[b.kind];
    if (mode) minutes[mode] += b.minutes;
    else committed += b.minutes;
  }
  const total = committed + minutes.deep + minutes.shallow + minutes.passive + minutes.recovery;

  return {
    date: isoDate,
    minutes,
    committed,
    // Bloques solapados pueden sumar más de 24 h; en ese caso no hay tiempo "sin planear".
    unplanned: Math.max(0, 24 * 60 - total),
    blocks: active,
    configured: active.length > 0,
  };
}

/** Minutos utilizables para acciones (deep + shallow + passive; la recuperación no se asigna). */
export function actionableMinutes(c: DayCapacity): number {
  return c.minutes.deep + c.minutes.shallow + c.minutes.passive;
}

/** Suma de capacidad de una semana a partir de `startIso` (7 días). */
export function computeWeekCapacity(blocks: CapacityBlock[], days: string[]): Record<CapacityMode, number> {
  const total: Record<CapacityMode, number> = { deep: 0, shallow: 0, passive: 0, recovery: 0 };
  for (const d of days) {
    const c = computeDayCapacity(blocks, d);
    for (const k of Object.keys(total) as CapacityMode[]) total[k] += c.minutes[k];
  }
  return total;
}
