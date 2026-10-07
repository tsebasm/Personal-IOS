import { z } from "zod";
import {
  currencyCode,
  dataQuality,
  dataSource,
  EXECUTION_MODES,
  isoDate,
  metricKey,
  optText,
  rowOf,
  text,
  textList,
  tier,
  timestamp,
  type FkSchema,
} from "./common";

/**
 * CAPA 2 — EJECUCIÓN (PHASE-A-DESIGN.md §2).
 * Rutina (regla recurrente de un sistema) → instancias de tarea → datos reales
 * (metric_entries / proveedores) → métricas. El progreso se deriva de los
 * datos, no de un contador duplicado (P-11).
 */

const num = z.number().finite();
const optNum = num.nullable().default(null);

// RUTINAS (P-11) ---------------------------------------------------------------

export const ROUTINE_CADENCES = ["daily", "weekdays", "weekly", "custom"] as const;
export const ROUTINE_STATUSES = ["active", "paused", "archived"] as const;

export const routineObject = (fk: FkSchema) =>
  z.object({
    system_id: fk,
    title: text,
    /** Métrica cuyos datos reales miden el avance de cada instancia. */
    metric_key: metricKey,
    target_per_occurrence: num.positive(),
    unit: text,
    cadence: z.enum(ROUTINE_CADENCES),
    /** 0 = domingo … 6 = sábado. Obligatorio con cadence 'custom' o 'weekly'. */
    days_of_week: z.array(z.number().int().min(0).max(6)).default([]),
    tier: tier,
    execution_mode: z.enum(EXECUTION_MODES).nullable().default(null),
    estimated_minutes_per_unit: num.positive().nullable().default(null),
    valid_from: isoDate,
    valid_to: isoDate.nullable().default(null),
    status: z.enum(ROUTINE_STATUSES).default("active"),
  });
export const routineCheck = (r: { cadence: string; days_of_week: number[]; valid_from: string; valid_to: string | null }) =>
  !((r.cadence === "custom" || r.cadence === "weekly") && r.days_of_week.length === 0) && !(r.valid_to && r.valid_to < r.valid_from);
export const ROUTINE_MSG = "Rutina inválida: define los días (cadencia custom/weekly) y un período coherente.";
export const routineShape = (fk: FkSchema) => routineObject(fk).refine(routineCheck, ROUTINE_MSG);

// TAREAS §25–27 (P-2) -----------------------------------------------------------

/** Estados guardados (§26). OVERDUE y VERIFIED se derivan: ver effectiveTaskStatus. */
export const TASK_STATUSES = ["pending", "in_progress", "partially_completed", "completed", "blocked", "cancelled"] as const;
/** Estados de planificación, separados de los de ejecución (P-2). */
export const TASK_PLAN_STATES = ["inbox", "next", "today"] as const;
/** Estado efectivo que ve el usuario: los 8 de §26. */
export const EFFECTIVE_TASK_STATUSES = [...TASK_STATUSES, "overdue", "verified"] as const;
export type EffectiveTaskStatus = (typeof EFFECTIVE_TASK_STATUSES)[number];

export const taskObject = (fk: FkSchema) =>
  z.object({
    title: text,
    description: optText,
    status: z.enum(TASK_STATUSES).default("pending"),
    plan_state: z.enum(TASK_PLAN_STATES).nullable().default(null),
    tier: tier.default("p2"),
    goal_id: fk.nullable().default(null),
    objective_id: fk.nullable().default(null),
    system_id: fk.nullable().default(null),
    project_id: fk.nullable().default(null),
    milestone_id: fk.nullable().default(null),
    /** Instancia generada por una rutina (una por rutina y fecha). */
    routine_id: fk.nullable().default(null),
    /** Cantidad esperada / real / unidad (30 contactos, 90 min). */
    target_qty: num.positive().nullable().default(null),
    actual_qty: num.min(0).nullable().default(null),
    unit: optText,
    /** Si está definida, actual_qty se deriva de los datos de esta métrica (no se escribe a mano). */
    metric_key: metricKey.nullable().default(null),
    deadline: isoDate.nullable().default(null),
    scheduled_date: isoDate.nullable().default(null),
    /** Fecha real de ejecución (puede ser posterior al deadline: vencida ≠ no realizada). */
    executed_on: isoDate.nullable().default(null),
    verified_at: timestamp.nullable().default(null),
    evidence_required: z.boolean().default(false),
    done_criteria: optText,
    lever: z.string().nullable().default(null),
    execution_mode: z.enum(EXECUTION_MODES).nullable().default(null),
    estimated_minutes: z.number().int().positive().nullable().default(null),
  });
export const taskCheck = (t: { target_qty: number | null; unit: string | null }) => t.target_qty === null || t.unit !== null;
export const TASK_MSG = "Una tarea cuantificable necesita unidad.";
export const taskShape = (fk: FkSchema) => taskObject(fk).refine(taskCheck, TASK_MSG);

/**
 * Estado que se muestra (§26). VERIFIED tiene prioridad sobre COMPLETED;
 * OVERDUE solo aplica a tareas abiertas con deadline pasado y nunca significa
 * "no realizada": al completarla tarde vuelve a su estado real.
 */
export function effectiveTaskStatus(
  t: { status: (typeof TASK_STATUSES)[number]; deadline: string | null; verified_at: string | null },
  today: string
): EffectiveTaskStatus {
  if (t.status === "completed") return t.verified_at ? "verified" : "completed";
  if (t.status === "cancelled" || t.status === "blocked") return t.status;
  if (t.deadline && t.deadline < today) return "overdue";
  return t.status;
}

/** Progreso de una tarea cuantificable (0–1), o null si no es cuantificable o falta el dato. */
export function taskProgress(t: { target_qty: number | null; actual_qty: number | null }): number | null {
  if (t.target_qty === null || t.actual_qty === null) return null;
  return Math.min(1, t.actual_qty / t.target_qty);
}

// EVIDENCIA §27 -----------------------------------------------------------------

export const EVIDENCE_TARGETS = ["task", "metric_entry", "daily_log", "experiment"] as const;

export const evidenceShape = (fk: FkSchema) =>
  z.object({
    entity_type: z.enum(EVIDENCE_TARGETS),
    entity_id: fk,
    target: optNum,
    actual: optNum,
    source: dataSource,
    verified: z.boolean().default(false),
    note: optText,
    url: z.string().url().nullable().default(null),
  });

// DATOS DE MÉTRICAS §68–69 (P-14) ----------------------------------------------------

export const metricEntryObject = (fk: FkSchema) =>
  z.object({
    metric_key: metricKey,
    date: isoDate,
    /** null solo si el dato falta o está incompleto: un faltante nunca es cero (§69). */
    value: num.nullable(),
    currency: currencyCode.nullable().default(null),
    source: dataSource,
    quality: dataQuality,
    system_id: fk.nullable().default(null),
    task_id: fk.nullable().default(null),
    note: optText,
  });
export const metricEntryCheck = (m: { value: number | null; quality: string }) =>
  m.value !== null || m.quality === "missing" || m.quality === "incomplete";
export const METRIC_ENTRY_MSG = "Sin valor, la calidad debe ser 'missing' o 'incomplete' (un faltante no es cero).";
export const metricEntryShape = (fk: FkSchema) => metricEntryObject(fk).refine(metricEntryCheck, METRIC_ENTRY_MSG);

// REGISTRO DIARIO §35 (P-3) ------------------------------------------------------------

const tierCount = z.object({ planned: z.number().int().min(0), done: z.number().int().min(0) });

export const dailyLogShape = (_fk: FkSchema) =>
  z.object({
    date: isoDate,
    mission: optText,
    /** Snapshot al cerrar el día (§35); inmutable una vez cerrado. */
    tiers: z.object({ p0: tierCount, p1: tierCount, p2: tierCount }).nullable().default(null),
    execution_score: z.number().min(0).max(100).nullable().default(null),
    minutes_worked: z.number().int().min(0).nullable().default(null),
    energy: z.number().int().min(1).max(5).nullable().default(null),
    focus: z.number().int().min(1).max(5).nullable().default(null),
    problems: textList,
    blockers: textList,
    learnings: textList,
    tomorrow: textList,
    notes: optText,
    closed_at: timestamp.nullable().default(null),
  });

// HÁBITOS §52–53 (entidad distinta de las rutinas) -------------------------------------

export const habitShape = (fk: FkSchema) =>
  z.object({
    title: text,
    tier: tier.default("p1"),
    system_id: fk.nullable().default(null),
    goal_id: fk.nullable().default(null),
    frequency: z.enum(["diaria", "semanal", "custom"]).default("diaria"),
    target_per_period: z.number().int().positive().default(1),
    days_of_week: z.array(z.number().int().min(0).max(6)).nullable().default(null),
    /** §53: preferir fuente automática confiable cuando exista. */
    source: dataSource.default("manual"),
    is_active: z.boolean().default(true),
  });

// Filas completas ------------------------------------------------------------------

export const Routine = rowOf(routineObject(z.string().uuid()), { versioned: true }).refine(routineCheck, ROUTINE_MSG);
export const Task = rowOf(taskObject(z.string().uuid())).refine(taskCheck, TASK_MSG);
export const Evidence = rowOf(evidenceShape(z.string().uuid()));
export const MetricEntry = rowOf(metricEntryObject(z.string().uuid())).refine(metricEntryCheck, METRIC_ENTRY_MSG);
export const DailyLog = rowOf(dailyLogShape(z.string().uuid()));
export const Habit = rowOf(habitShape(z.string().uuid()));

export type Routine = z.infer<typeof Routine>;
export type Task = z.infer<typeof Task>;
export type Evidence = z.infer<typeof Evidence>;
export type MetricEntry = z.infer<typeof MetricEntry>;
export type DailyLog = z.infer<typeof DailyLog>;
export type Habit = z.infer<typeof Habit>;
