import type { TASK_PLAN_STATES, TASK_STATUSES } from "./execution";
import type { GOAL_ACTIVATION_STATES } from "./strategy";

/**
 * Traducción de vocabularios existentes (antes de la Fase A) al dominio.
 *
 * La migración 0017 agrega las columnas nuevas y amplía los CHECK, pero NO
 * reescribe `tasks.status` ni `goals.status`: once archivos del código actual
 * leen esos valores ('done', 'today', 'activo'…). La reescritura física se
 * hace junto con el código en la Fase B (ejecución de tareas). Hasta entonces,
 * todo lector del dominio pasa por estas funciones, para que el resto del
 * sistema ya vea los estados de §26 / §56.
 */

type TaskStatus = (typeof TASK_STATUSES)[number];
type TaskPlanState = (typeof TASK_PLAN_STATES)[number];

const LEGACY_TASK: Record<string, { status: TaskStatus; plan_state: TaskPlanState | null }> = {
  inbox: { status: "pending", plan_state: "inbox" },
  next: { status: "pending", plan_state: "next" },
  today: { status: "pending", plan_state: "today" },
  in_progress: { status: "in_progress", plan_state: null },
  waiting: { status: "blocked", plan_state: null },
  done: { status: "completed", plan_state: null },
  cancelled: { status: "cancelled", plan_state: null },
};

/** Estado de dominio a partir de la fila. Si la fila ya trae `plan_state` (0017), se respeta. */
export function taskStatusFromRow(row: { status: string; plan_state?: string | null }): {
  status: TaskStatus;
  plan_state: TaskPlanState | null;
} {
  const mapped = LEGACY_TASK[row.status];
  const status = mapped ? mapped.status : (row.status as TaskStatus);
  const plan_state = (row.plan_state as TaskPlanState | null | undefined) ?? mapped?.plan_state ?? null;
  return { status, plan_state };
}

type GoalActivation = (typeof GOAL_ACTIVATION_STATES)[number];

/**
 * goals.status (activo/pausado/cumplido/cancelado) → §56. Solo se usa si la
 * fila aún no tiene activation_state (0017 lo rellena con este mismo mapeo).
 * 'pausado' → EN COLA: es lo más cercano en §56 (no hay estado "pausada").
 */
export const LEGACY_GOAL_ACTIVATION: Record<string, GoalActivation> = {
  activo: "active",
  pausado: "queued",
  cumplido: "completed",
  cancelado: "archived",
};
