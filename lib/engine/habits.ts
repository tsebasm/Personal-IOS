import { shiftIsoDate } from "@/lib/date";
import { weekdayOf } from "./capacity";

/**
 * Cumplimiento de hábitos según su frecuencia real (antes `computeStreak`
 * trataba todo como diario y `frequency`/`days_of_week`/`target_per_period`
 * se guardaban sin usarse):
 * - diaria: cada día cuenta.
 * - custom: solo los días de `days_of_week` (0 = domingo).
 * - semanal: `target_per_period` veces por semana (lunes a domingo).
 */
export type HabitSpec = {
  frequency: "diaria" | "semanal" | "custom" | string;
  target_per_period: number;
  days_of_week: number[] | null;
};

export type HabitCompliance = {
  expected: number;
  done: number;
  /** 0–100, null si no se esperaba nada en la ventana. */
  pct: number | null;
  streak: number;
  streakUnit: "días" | "semanas";
  dueToday: boolean;
  /** Para semanales: cuántas lleva esta semana. */
  thisWeek: { done: number; target: number } | null;
};

/** Lunes de la semana de `iso` (semanas ISO). */
export function weekStartOf(iso: string): string {
  const wd = weekdayOf(iso); // 0 = domingo
  return shiftIsoDate(iso, -((wd + 6) % 7));
}

function isScheduled(spec: HabitSpec, iso: string): boolean {
  if (spec.frequency === "custom") return (spec.days_of_week ?? []).includes(weekdayOf(iso));
  return true;
}

function dailyLikeStreak(spec: HabitSpec, done: Set<string>, today: string): number {
  // Hoy sin marcar no rompe la racha: el día no ha terminado.
  let cursor = today;
  if (isScheduled(spec, cursor) && !done.has(cursor)) cursor = shiftIsoDate(cursor, -1);
  let streak = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (isScheduled(spec, cursor)) {
      if (!done.has(cursor)) break;
      streak++;
    }
    cursor = shiftIsoDate(cursor, -1);
  }
  return streak;
}

function countInWeek(done: Set<string>, weekStart: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (done.has(shiftIsoDate(weekStart, i))) n++;
  return n;
}

export function computeHabitCompliance(spec: HabitSpec, doneDates: Set<string>, today: string, windowDays = 28): HabitCompliance {
  const target = Math.max(1, spec.target_per_period || 1);
  const windowStart = shiftIsoDate(today, -(windowDays - 1));

  if (spec.frequency === "semanal") {
    // Semanas completas dentro de la ventana + la actual (prorrateada: no se exige lo que aún no se puede cumplir).
    const currentWeek = weekStartOf(today);
    let expected = 0;
    let done = 0;
    // Solo semanas completas dentro de la ventana (una semana a medias no puede exigirse entera).
    let firstWeek = weekStartOf(windowStart);
    if (firstWeek < windowStart) firstWeek = shiftIsoDate(firstWeek, 7);
    for (let w = firstWeek; w <= currentWeek; w = shiftIsoDate(w, 7)) {
      const count = countInWeek(doneDates, w);
      if (w === currentWeek) {
        if (count >= target) {
          expected += target;
          done += target;
        }
      } else {
        expected += target;
        done += Math.min(target, count);
      }
    }
    let streak = 0;
    const thisWeekCount = countInWeek(doneDates, currentWeek);
    if (thisWeekCount >= target) streak++;
    for (let w = shiftIsoDate(currentWeek, -7), guard = 0; guard < 60; w = shiftIsoDate(w, -7), guard++) {
      if (countInWeek(doneDates, w) >= target) streak++;
      else break;
    }
    return {
      expected,
      done,
      pct: expected > 0 ? Math.round((done / expected) * 100) : null,
      streak,
      streakUnit: "semanas",
      dueToday: thisWeekCount < target && !doneDates.has(today),
      thisWeek: { done: thisWeekCount, target },
    };
  }

  let expected = 0;
  let done = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = shiftIsoDate(windowStart, i);
    if (!isScheduled(spec, d)) continue;
    // Hoy solo cuenta como esperado si ya se cumplió (el día sigue abierto).
    if (d === today && !doneDates.has(d)) continue;
    expected++;
    if (doneDates.has(d)) done++;
  }
  return {
    expected,
    done,
    pct: expected > 0 ? Math.round((done / expected) * 100) : null,
    streak: dailyLikeStreak(spec, doneDates, today),
    streakUnit: "días",
    dueToday: isScheduled(spec, today),
    thisWeek: null,
  };
}
