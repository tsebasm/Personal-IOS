import { weekdayOf } from "./capacity";

/**
 * Motor de rutinas (P-11) + intervenciones de experimentos (P-12). Puro.
 *
 * Rutina (regla recurrente de un sistema) → instancias de tarea por día →
 * datos reales (metric_entries / proveedores) → avance. La instancia guarda
 * el objetivo del día; el avance NUNCA se escribe a mano: se deriva de los datos.
 *
 * Una intervención de un experimento `running` sustituye temporalmente un
 * parámetro de la rutina en su período, sin modificar la rutina (el valor
 * base se conserva y vuelve solo cuando termina el período).
 */

export type RoutineLike = {
  id: string;
  system_id: string;
  title: string;
  metric_key: string;
  target_per_occurrence: number;
  unit: string;
  cadence: "daily" | "weekdays" | "weekly" | "custom" | string;
  days_of_week: number[];
  tier: "p0" | "p1" | "p2" | string;
  execution_mode: string | null;
  estimated_minutes_per_unit: number | null;
  valid_from: string;
  valid_to: string | null;
  status: string;
  archived_at?: string | null;
};

export type InterventionLike = {
  target_type: string;
  target_id: string;
  field: string;
  baseline: number;
  value: number;
  from: string;
  to: string;
};

export type ExperimentLike = { id: string; name: string; status: string; interventions: InterventionLike[] };

/** ¿La rutina está vigente ese día? (activa, no archivada, dentro de su período). */
export function routineActiveOn(r: RoutineLike, date: string): boolean {
  return r.status === "active" && !r.archived_at && r.valid_from <= date && (r.valid_to === null || r.valid_to >= date);
}

/** ¿La cadencia de la rutina cae ese día? */
export function routineOccursOn(r: RoutineLike, date: string): boolean {
  const wd = weekdayOf(date);
  switch (r.cadence) {
    case "daily":
      return true;
    case "weekdays":
      return wd >= 1 && wd <= 5;
    default:
      return r.days_of_week.includes(wd);
  }
}

export type EffectiveTarget = {
  value: number;
  /** De dónde sale el objetivo del día: la regla base o una intervención en curso. */
  source: "routine" | "intervention";
  experimentId: string | null;
  /** Hay más de una intervención activa sobre el mismo parámetro: se usa el valor base y se avisa. */
  conflict: string[] | null;
};

export function effectiveTarget(r: RoutineLike, date: string, experiments: ExperimentLike[]): EffectiveTarget {
  const active = experiments
    .filter((e) => e.status === "running")
    .flatMap((e) =>
      e.interventions
        .filter((i) => i.target_type === "routine" && i.target_id === r.id && i.field === "target_per_occurrence" && i.from <= date && i.to >= date)
        .map((i) => ({ experiment: e, intervention: i }))
    );
  if (active.length === 1) {
    return { value: active[0].intervention.value, source: "intervention", experimentId: active[0].experiment.id, conflict: null };
  }
  return {
    value: r.target_per_occurrence,
    source: "routine",
    experimentId: null,
    conflict: active.length > 1 ? active.map((a) => a.experiment.name) : null,
  };
}

export type RoutineInstance = {
  routine_id: string;
  system_id: string;
  title: string;
  scheduled_date: string;
  target_qty: number;
  unit: string;
  metric_key: string;
  tier: string;
  execution_mode: string | null;
  estimated_minutes: number | null;
  /** Explicación legible del objetivo del día. */
  trace: string;
  conflict: string[] | null;
};

/** Instancias que corresponden a `date`. Idempotente: la base garantiza una por rutina y día. */
export function materializeRoutines(routines: RoutineLike[], experiments: ExperimentLike[], date: string): RoutineInstance[] {
  return routines
    .filter((r) => routineActiveOn(r, date) && routineOccursOn(r, date))
    .map((r) => {
      const t = effectiveTarget(r, date, experiments);
      const exp = t.experimentId ? experiments.find((e) => e.id === t.experimentId) : null;
      const trace =
        t.source === "intervention"
          ? `${t.value} ${r.unit} por el experimento "${exp?.name}" (valor base ${r.target_per_occurrence})`
          : t.conflict
            ? `${t.value} ${r.unit} (valor base: hay intervenciones superpuestas de ${t.conflict.join(", ")}; revisa los experimentos)`
            : `${t.value} ${r.unit} (regla de la rutina)`;
      return {
        routine_id: r.id,
        system_id: r.system_id,
        title: r.title,
        scheduled_date: date,
        target_qty: t.value,
        unit: r.unit,
        metric_key: r.metric_key,
        tier: r.tier,
        execution_mode: r.execution_mode,
        estimated_minutes: r.estimated_minutes_per_unit !== null ? Math.ceil(r.estimated_minutes_per_unit * t.value) : null,
        trace,
        conflict: t.conflict,
      };
    });
}

export type MetricValueLike = { metric_key: string; date: string; value: number | null };

/**
 * Avance de una instancia a partir de los datos reales del día (P-11).
 * Sin ningún dato de esa métrica ese día → actual = null (faltante ≠ 0, §69).
 */
export function instanceProgress(
  instance: { metric_key: string; scheduled_date: string; target_qty: number },
  values: MetricValueLike[]
): { actual: number | null; progress: number | null } {
  const sameDay = values.filter((v) => v.metric_key === instance.metric_key && v.date === instance.scheduled_date && v.value !== null);
  if (sameDay.length === 0) return { actual: null, progress: null };
  const actual = sameDay.reduce((s, v) => s + (v.value ?? 0), 0);
  return { actual, progress: Math.min(1, actual / instance.target_qty) };
}
