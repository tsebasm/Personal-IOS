import { daysBetween } from "@/lib/agencia/metrics";
import { goalProgressPct } from "./metrics-registry";

export type GapInput = {
  baseline: number | null;
  current: number | null;
  target: number | null;
  /** Desde cuándo se mide el ritmo real; si falta, no se calcula ritmo real. */
  startDate: string | null;
  deadline: string | null;
  today: string;
};

export type GapStatus = "no_target" | "achieved" | "overdue" | "no_deadline" | "in_progress";

export type GapResult = {
  status: GapStatus;
  baseline: number;
  current: number;
  target: number | null;
  /** Lo que falta para el Punto B (0 si ya se alcanzó). */
  remaining: number | null;
  progressPct: number | null;
  daysLeft: number | null;
  daysElapsed: number | null;
  /** Ritmo necesario por día desde hoy (incluye hoy) hasta el deadline. */
  requiredPerDay: number | null;
  /** Ritmo real por día desde startDate. */
  actualPerDay: number | null;
  /** Valor al deadline si el ritmo real se mantiene (proyección lineal — orientativa). */
  projectedAtDeadline: number | null;
  onTrack: boolean | null;
};

/**
 * Brecha entre Punto A/actual y Punto B. Función pura: sin I/O, sin fechas
 * del servidor. Las metas decrecientes (target < baseline) también funcionan.
 */
export function computeGap(input: GapInput): GapResult {
  const baseline = input.baseline ?? 0;
  const current = input.current ?? baseline;
  const target = input.target;
  const direction = target !== null && target < baseline ? -1 : 1;

  const daysLeft = input.deadline ? daysBetween(input.today, input.deadline) : null;
  const daysElapsed = input.startDate ? daysBetween(input.startDate, input.today) : null;

  if (target === null) {
    return {
      status: "no_target",
      baseline,
      current,
      target,
      remaining: null,
      progressPct: null,
      daysLeft,
      daysElapsed,
      requiredPerDay: null,
      actualPerDay: null,
      projectedAtDeadline: null,
      onTrack: null,
    };
  }

  const remaining = Math.max(0, (target - current) * direction);
  const progressPct = goalProgressPct(current, target, baseline);
  const achieved = remaining === 0;

  // Días hábiles para producir: hoy cuenta (el día no ha terminado).
  const daysToWork = daysLeft !== null ? daysLeft + 1 : null;
  const requiredPerDay = !achieved && daysToWork !== null && daysToWork > 0 ? remaining / daysToWork : null;
  const actualPerDay =
    daysElapsed !== null && daysElapsed > 0 ? ((current - baseline) * direction) / daysElapsed : null;
  const projectedAtDeadline =
    actualPerDay !== null && daysLeft !== null && daysLeft >= 0 ? current + actualPerDay * direction * daysToWork! : null;

  let status: GapStatus = "in_progress";
  if (achieved) status = "achieved";
  else if (daysLeft === null) status = "no_deadline";
  else if (daysLeft < 0) status = "overdue";

  return {
    status,
    baseline,
    current,
    target,
    remaining,
    progressPct,
    daysLeft,
    daysElapsed,
    requiredPerDay,
    actualPerDay,
    projectedAtDeadline,
    onTrack:
      achieved ? true : projectedAtDeadline !== null ? (projectedAtDeadline - target) * direction >= 0 : null,
  };
}
