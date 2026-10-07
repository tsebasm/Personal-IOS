/**
 * Motor de ejecución del día (spec §47–§50, §31–§32; B-2). Puro.
 */

// RITMO (§47–48) ----------------------------------------------------------------

export const PACE_STATES = ["very_ahead", "ahead", "on_pace", "slightly_behind", "behind", "critically_behind"] as const;
export type PaceState = (typeof PACE_STATES)[number];

export const PACE_LABEL: Record<PaceState, string> = {
  very_ahead: "Muy adelantado",
  ahead: "Adelantado",
  on_pace: "En ritmo",
  slightly_behind: "Ligeramente atrasado",
  behind: "Atrasado",
  critically_behind: "Críticamente atrasado",
};

/** Umbrales sobre ritmo real ÷ ritmo requerido (§48: configurables; estos son los valores por defecto). */
export const DEFAULT_PACE_THRESHOLDS = { veryAhead: 1.5, ahead: 1.1, onPace: 0.95, slightlyBehind: 0.8, behind: 0.5 } as const;

export type PaceResult =
  | { state: PaceState; ratio: number; requiredPerDay: number; actualPerDay: number }
  | { state: null; reason: "achieved" | "no_requirement" | "no_actual" };

export function paceStatus(
  requiredPerDay: number | null,
  actualPerDay: number | null,
  t: typeof DEFAULT_PACE_THRESHOLDS = DEFAULT_PACE_THRESHOLDS
): PaceResult {
  if (requiredPerDay === null) return { state: null, reason: "no_requirement" };
  if (requiredPerDay <= 0) return { state: null, reason: "achieved" };
  if (actualPerDay === null) return { state: null, reason: "no_actual" };
  const ratio = actualPerDay / requiredPerDay;
  const state: PaceState =
    ratio >= t.veryAhead ? "very_ahead" : ratio >= t.ahead ? "ahead" : ratio >= t.onPace ? "on_pace" : ratio >= t.slightlyBehind ? "slightly_behind" : ratio >= t.behind ? "behind" : "critically_behind";
  return { state, ratio, requiredPerDay, actualPerDay };
}

/** §49/§62: brecha visible (diaria y proyectada a 7 días), sin juicio. */
export function paceGap(requiredPerDay: number, actualPerDay: number) {
  const daily = Math.max(0, requiredPerDay - actualPerDay);
  return { daily, weekly: daily * 7 };
}

// TAREAS DEL DÍA ---------------------------------------------------------------------

export type DayTask = {
  id: string;
  title: string;
  tier: "p0" | "p1" | "p2" | null;
  done: boolean;
  target_qty: number | null;
  unit: string | null;
  metric_key: string | null;
};

export type TaskCompletion = {
  /** Real del día según los datos (null = sin datos: no es 0). */
  actual: number | null;
  /** 0–1 para tareas cuantificables con datos; null si no aplica o no hay datos. */
  progress: number | null;
  complete: boolean;
};

/**
 * Una tarea cuantificable con métrica se completa por sus DATOS (actual ≥ objetivo),
 * no por una casilla. Las demás, por su estado.
 */
export function taskCompletion(task: DayTask, actualForMetric: number | null): TaskCompletion {
  if (task.target_qty !== null && task.metric_key) {
    const progress = actualForMetric === null ? null : Math.min(1, actualForMetric / task.target_qty);
    return { actual: actualForMetric, progress, complete: task.done || (actualForMetric !== null && actualForMetric >= task.target_qty) };
  }
  return { actual: null, progress: null, complete: task.done };
}

// SCORE DE EJECUCIÓN (§50) -------------------------------------------------------------

export type ExecutionScore = {
  /** Acciones requeridas (P0 + P1) completadas ÷ planificadas × 100; null si no hay nada planificado. */
  score: number | null;
  byTier: Record<"p0" | "p1" | "p2", { planned: number; done: number }>;
  /** P0 incompleto → prioridad visual + advertencia (B-2), nunca bloqueo. */
  p0Pending: number;
  missionComplete: boolean;
};

/** El score mide ejecución, nunca progreso de la meta (§50). P2 no es requerido. */
export function executionScore(items: { tier: DayTask["tier"]; complete: boolean }[]): ExecutionScore {
  const byTier = { p0: { planned: 0, done: 0 }, p1: { planned: 0, done: 0 }, p2: { planned: 0, done: 0 } };
  for (const it of items) {
    const t = it.tier ?? "p2";
    byTier[t].planned += 1;
    if (it.complete) byTier[t].done += 1;
  }
  const planned = byTier.p0.planned + byTier.p1.planned;
  const done = byTier.p0.done + byTier.p1.done;
  const p0Pending = byTier.p0.planned - byTier.p0.done;
  return {
    score: planned === 0 ? null : Math.round((done / planned) * 100),
    byTier,
    p0Pending,
    missionComplete: byTier.p0.planned > 0 && p0Pending === 0,
  };
}

/** Suma del día por métrica a partir de valores combinados (proveedores + registros). */
export function dailyActuals(values: { metric_key: string; date: string; value: number }[], date: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) if (v.date === date) m.set(v.metric_key, (m.get(v.metric_key) ?? 0) + v.value);
  return m;
}
