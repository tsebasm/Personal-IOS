import { daysBetween } from "@/lib/agencia/metrics";
import type { TaskLever } from "@/lib/tasks";
import type { CapacityMode, DayCapacity } from "./capacity";

/**
 * Priority Engine — reemplaza las dos lógicas previas (buckets por prioridad
 * en /today y el sort ad-hoc del dashboard). Regla (§ especificación):
 *
 *   score = impacto × relevancia para la meta × urgencia × resultado esperado ÷ esfuerzo
 *
 * Cada factor deja una razón legible: el Top 3 siempre puede explicarse.
 * Los pesos son REGLAS iniciales explícitas (no datos); cuando haya historial
 * de qué acciones movieron la meta, se calibran con él.
 */

export type ActionCandidate = {
  id: string;
  /** 'plan' = acción derivada del plan (p. ej. cuota de prospección), no una fila de tasks. */
  kind: "task" | "plan";
  title: string;
  priority: "alta" | "media" | "baja" | string;
  impact_score: number | null;
  effort: number | null;
  goal_id: string | null;
  lever: TaskLever | string | null;
  deadline: string | null;
  scheduled_date: string | null;
  estimated_minutes: number | null;
  execution_mode: CapacityMode | string | null;
  /** Dependencias no completadas (task_dependencies). */
  openDependencies: number;
};

export type PriorityContext = {
  today: string;
  northStarGoalId: string | null;
  /** goal_id → parent_goal_id, para saber si una meta cuelga de la North Star. */
  goalParents: Map<string, string | null>;
  activeGoalIds: Set<string>;
  /** La North Star es de adquisición/facturación → las palancas comerciales pesan más. */
  acquisitionFocus: boolean;
  capacity: DayCapacity | null;
};

export type ScoredAction = {
  item: ActionCandidate;
  score: number;
  factors: { impact: number; relevance: number; urgency: number; outcome: number; effort: number };
  reasons: string[];
};

export type Ranking = {
  top: ScoredAction[];
  secondary: (ScoredAction & { note?: string })[];
  excluded: (ScoredAction & { note: string })[];
  /** Minutos de capacidad que ocupa el Top por modo. */
  allocated: Record<"deep" | "shallow" | "passive", number>;
};

const PRIORITY_IMPACT: Record<string, number> = { alta: 4, media: 3, baja: 2 };

/** Regla inicial: cuánto acerca cada palanca a una meta de adquisición. */
export const ACQUISITION_LEVER_WEIGHT: Partial<Record<TaskLever, number>> = {
  sales_call: 1.5,
  follow_up: 1.4,
  offer: 1.3,
  outbound: 1.3,
  validation: 1.2,
  delivery: 1.2,
};

export function descendsFrom(goalId: string, ancestorId: string, parents: Map<string, string | null>): boolean {
  let cursor: string | null | undefined = goalId;
  for (let depth = 0; cursor && depth < 10; depth++) {
    if (cursor === ancestorId) return true;
    cursor = parents.get(cursor);
  }
  return false;
}

export function scoreAction(item: ActionCandidate, ctx: PriorityContext): ScoredAction {
  const reasons: string[] = [];

  const impact = item.impact_score ?? PRIORITY_IMPACT[item.priority] ?? 3;
  reasons.push(
    item.impact_score !== null ? `impacto ${item.impact_score}/5` : `impacto ${impact}/5 (inferido de prioridad ${item.priority})`
  );

  let relevance = 1;
  if (item.goal_id && ctx.northStarGoalId && descendsFrom(item.goal_id, ctx.northStarGoalId, ctx.goalParents)) {
    relevance = 1.5;
    reasons.push("mueve la meta principal");
  } else if (item.goal_id && ctx.activeGoalIds.has(item.goal_id)) {
    relevance = 1.15;
    reasons.push("ligada a una meta activa");
  } else {
    reasons.push("sin meta vinculada");
  }

  let urgency = 1;
  if (item.deadline) {
    const d = daysBetween(ctx.today, item.deadline);
    if (d < 0) {
      urgency = 2;
      reasons.push(`vencida hace ${-d} día(s)`);
    } else if (d === 0) {
      urgency = 1.8;
      reasons.push("vence hoy");
    } else if (d <= 2) {
      urgency = 1.5;
      reasons.push(`vence en ${d} día(s)`);
    } else if (d <= 7) {
      urgency = 1.2;
      reasons.push(`vence en ${d} días`);
    }
  }
  if (item.scheduled_date && item.scheduled_date <= ctx.today && urgency < 1.3) {
    urgency = 1.3;
    reasons.push(item.scheduled_date < ctx.today ? "programada para un día que ya pasó" : "programada para hoy");
  }

  const lever = item.lever as TaskLever | null;
  const outcome = ctx.acquisitionFocus && lever ? (ACQUISITION_LEVER_WEIGHT[lever] ?? 1) : 1;
  if (outcome > 1) reasons.push(`palanca comercial (${lever})`);

  const effortScore = item.effort ?? 3;
  const effort = 1 + (effortScore - 1) * 0.25;
  if (item.effort === null) reasons.push("esfuerzo sin estimar (se asume 3/5)");

  const score = (impact * relevance * urgency * outcome) / effort;
  return { item, score: Math.round(score * 100) / 100, factors: { impact, relevance, urgency, outcome, effort }, reasons };
}

type Budget = Record<"deep" | "shallow" | "passive", number>;

/** Intenta reservar tiempo para la acción en su modo (o en cualquiera, si no tiene). Devuelve el modo usado. */
function reserve(budget: Budget, item: ActionCandidate): "deep" | "shallow" | "passive" | null {
  const need = item.estimated_minutes ?? 0;
  const mode = item.execution_mode;
  const order: ("deep" | "shallow" | "passive")[] =
    mode === "deep" || mode === "shallow" || mode === "passive" ? [mode] : ["shallow", "deep"];
  for (const m of order) {
    if (budget[m] > 0 && budget[m] >= need) {
      budget[m] -= need;
      return m;
    }
  }
  return null;
}

/**
 * Ordena por score y elige un Top de máx. `topSize` que quepa en la
 * capacidad del día (si está configurada). Lo que no cabe o está bloqueado
 * no desaparece: queda como secundario/excluido con el motivo.
 */
export function rankActions(items: ActionCandidate[], ctx: PriorityContext, topSize = 3): Ranking {
  const scored = items.map((i) => scoreAction(i, ctx)).sort((a, b) => b.score - a.score);
  const budget: Budget = ctx.capacity?.configured
    ? { deep: ctx.capacity.minutes.deep, shallow: ctx.capacity.minutes.shallow, passive: ctx.capacity.minutes.passive }
    : { deep: Infinity, shallow: Infinity, passive: Infinity };
  const start = { ...budget };

  const top: ScoredAction[] = [];
  const secondary: Ranking["secondary"] = [];
  const excluded: Ranking["excluded"] = [];

  for (const s of scored) {
    if (s.item.openDependencies > 0) {
      excluded.push({ ...s, note: `bloqueada por ${s.item.openDependencies} dependencia(s) sin terminar` });
      continue;
    }
    if (top.length >= topSize) {
      secondary.push(s);
      continue;
    }
    const used = reserve(budget, s.item);
    if (used) top.push(s);
    else {
      const mode = s.item.execution_mode ?? "shallow/deep";
      secondary.push({ ...s, note: `no cabe hoy en tu capacidad (${mode}, ${s.item.estimated_minutes ?? 0} min)` });
    }
  }

  const spent = (k: keyof Budget) => (Number.isFinite(start[k]) ? start[k] - budget[k] : 0);
  return { top, secondary, excluded, allocated: { deep: spent("deep"), shallow: spent("shallow"), passive: spent("passive") } };
}
