/**
 * Clasificación P0/P1/P2 sugerida (spec §28, §130 B-1). Pura.
 *
 *   P0 = no ejecutarlo compromete directamente el resultado actual.
 *   P1 = sostiene o mejora el resultado; no es el cuello de botella inmediato.
 *   P2 = útil, no crítico para el resultado actual.
 *
 * La sugerencia sale de datos y relaciones, nunca del texto del título:
 *   1. plan    — nivel asignado en un plan aprobado (change set);
 *   2. routine — la tarea es instancia de una rutina (la rutina define su nivel);
 *   3. rule    — priority_rules (datos editables): sistema + palanca > palanca > sistema;
 *   4. structure — aporta a la meta actual (objetivo/proyecto/meta en su árbol) → P1;
 *   5. default — sin vínculo con la meta actual → P2.
 * P0 solo proviene de datos explícitos (plan, rutina o regla). El usuario puede
 * sobrescribir; la sugerencia original se conserva (override trazable).
 */

export type Tier = "p0" | "p1" | "p2";
export type TierSource = "plan" | "routine" | "rule" | "structure" | "default";
export type TierSuggestion = { tier: Tier; source: TierSource; reason: string };

export type TierRule = { id: string; system_id: string | null; lever: string | null; tier: Tier; note?: string | null };

export type TierTask = {
  id: string;
  tier: string | null;
  tier_suggested_source: string | null;
  origin: string | null;
  routine_id: string | null;
  routine_tier?: string | null;
  lever: string | null;
  system_id: string | null;
  project_id: string | null;
  objective_id: string | null;
  goal_id: string | null;
};

export type TierContext = {
  rules: TierRule[];
  /** project → su sistema/objetivo/meta (para heredar el contexto estructural). */
  projects: Map<string, { system_id: string | null; objective_id: string | null; goal_id: string | null }>;
  /** Objetivos activos que cuelgan de la meta principal. */
  currentObjectiveIds: Set<string>;
  /** Meta principal y sus sub-metas (árbol). */
  currentGoalIds: Set<string>;
  systemTitles?: Map<string, string>;
};

const isTier = (v: unknown): v is Tier => v === "p0" || v === "p1" || v === "p2";

export function suggestTier(task: TierTask, ctx: TierContext): TierSuggestion {
  // 1. Plan aprobado: el nivel se decidió al aprobar el paquete (no se reinterpreta).
  if ((task.tier_suggested_source === "plan" || (task.tier_suggested_source === null && (task.origin === "import" || task.origin === "claude"))) && isTier(task.tier)) {
    return { tier: task.tier, source: "plan", reason: "Asignado en el plan aprobado" };
  }
  // 2. Rutina.
  if (task.routine_id && isTier(task.routine_tier ?? task.tier)) {
    return { tier: (task.routine_tier ?? task.tier) as Tier, source: "routine", reason: "Nivel de la rutina" };
  }

  const project = task.project_id ? ctx.projects.get(task.project_id) : undefined;
  const systemId = task.system_id ?? project?.system_id ?? null;

  // 3. Reglas como datos, la más específica primero.
  const active = ctx.rules;
  const match =
    (systemId && task.lever ? active.find((r) => r.system_id === systemId && r.lever === task.lever) : undefined) ??
    (task.lever ? active.find((r) => r.system_id === null && r.lever === task.lever) : undefined) ??
    (systemId ? active.find((r) => r.system_id === systemId && r.lever === null) : undefined);
  if (match) {
    const scope = [match.system_id ? `sistema ${ctx.systemTitles?.get(match.system_id) ?? "del plan"}` : null, match.lever ? `palanca ${match.lever}` : null]
      .filter(Boolean)
      .join(" + ");
    return { tier: match.tier, source: "rule", reason: `Regla de prioridad (${scope})${match.note ? `: ${match.note}` : ""}` };
  }

  // 4. Estructura: aporta a la meta actual.
  const objectiveId = task.objective_id ?? project?.objective_id ?? null;
  const goalId = task.goal_id ?? project?.goal_id ?? null;
  if ((objectiveId && ctx.currentObjectiveIds.has(objectiveId)) || (goalId && ctx.currentGoalIds.has(goalId))) {
    return { tier: "p1", source: "structure", reason: "Aporta a la meta actual, sin regla que la marque crítica" };
  }
  // 5. Sin vínculo con el resultado actual.
  return { tier: "p2", source: "default", reason: "Sin vínculo con la meta actual" };
}

/**
 * Reglas sugeridas para empezar (el usuario decide si cargarlas y puede
 * editarlas). Son genéricas por palanca de acción, no por negocio.
 */
export const STARTER_RULES: { lever: string; tier: Tier; note: string }[] = [
  { lever: "outbound", tier: "p0", note: "Generar oportunidades produce el resultado" },
  { lever: "follow_up", tier: "p0", note: "Cerrar lo abierto antes de abrir más" },
  { lever: "sales_call", tier: "p0", note: "Convierte oportunidades en resultado" },
  { lever: "offer", tier: "p0", note: "Sin propuesta no hay cierre" },
  { lever: "delivery", tier: "p0", note: "Cumplir a clientes sostiene el ingreso" },
  { lever: "validation", tier: "p1", note: "Mejora la puntería, no es el resultado" },
  { lever: "build", tier: "p1", note: "Capacidad para ejecutar los P0" },
  { lever: "study", tier: "p1", note: "Capacidad" },
  { lever: "content", tier: "p2", note: "Útil, no crítico ahora" },
  { lever: "admin", tier: "p2", note: "Necesario, no mueve el resultado" },
  { lever: "personal", tier: "p2", note: "Fuera del resultado actual" },
];
