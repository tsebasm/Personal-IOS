import { suggestTier, type TierRule, type TierTask } from "@/lib/engine/tiers";

type Client = {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Recalcula el nivel sugerido (P0/P1/P2) de las tareas abiertas y lo guarda
 * (apply_tier_suggestions, 0021). Nunca pisa un override del usuario: en ese
 * caso solo actualiza la sugerencia conservada. Idempotente; si el esquema
 * aún no tiene 0021, no hace nada (§102: Hoy no se rompe).
 */
export async function syncTierSuggestions(supabase: Client): Promise<{ updated: number; skipped?: string }> {
  const [tasksRes, rulesRes, projectsRes, routinesRes, profileRes, systemsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, tier, tier_suggested_source, origin, routine_id, lever, system_id, project_id, objective_id, goal_id, status")
      .not("status", "in", "(done,completed,cancelled)")
      .limit(500),
    supabase.from("priority_rules").select("id, system_id, lever, tier, note").is("archived_at", null),
    supabase.from("projects").select("id, system_id, objective_id, goal_id"),
    supabase.from("routines").select("id, tier"),
    supabase.from("profiles").select("north_star_goal_id").maybeSingle(),
    supabase.from("systems").select("id, title"),
  ]);
  if (tasksRes.error || rulesRes.error) return { updated: 0, skipped: (tasksRes.error ?? rulesRes.error).message };

  const northStar = (profileRes.data?.north_star_goal_id as string | null) ?? null;
  const [goalsRes, objectivesRes] = await Promise.all([
    supabase.from("goals").select("id, parent_goal_id"),
    northStar ? supabase.from("objectives").select("id").eq("goal_id", northStar).eq("status", "active") : Promise.resolve({ data: [] }),
  ]);
  // Árbol de la meta principal (meta + sub-metas).
  const currentGoalIds = new Set<string>();
  if (northStar) {
    currentGoalIds.add(northStar);
    const goals = (goalsRes.data ?? []) as { id: string; parent_goal_id: string | null }[];
    let grew = true;
    while (grew) {
      grew = false;
      for (const g of goals) if (g.parent_goal_id && currentGoalIds.has(g.parent_goal_id) && !currentGoalIds.has(g.id)) {
        currentGoalIds.add(g.id);
        grew = true;
      }
    }
  }
  const routineTier = new Map(((routinesRes.data ?? []) as { id: string; tier: string }[]).map((r) => [r.id, r.tier]));
  const ctx = {
    rules: (rulesRes.data ?? []) as TierRule[],
    projects: new Map(((projectsRes.data ?? []) as { id: string; system_id: string | null; objective_id: string | null; goal_id: string | null }[]).map((p) => [p.id, p])),
    currentObjectiveIds: new Set(((objectivesRes.data ?? []) as { id: string }[]).map((o) => o.id)),
    currentGoalIds,
    systemTitles: new Map(((systemsRes.data ?? []) as { id: string; title: string }[]).map((s) => [s.id, s.title])),
  };

  const items = ((tasksRes.data ?? []) as TierTask[]).map((t) => {
    const s = suggestTier({ ...t, routine_tier: t.routine_id ? (routineTier.get(t.routine_id) ?? null) : null }, ctx);
    return { id: t.id, tier: s.tier, source: s.source, reason: s.reason };
  });
  if (items.length === 0) return { updated: 0 };
  const { data, error } = await supabase.rpc("apply_tier_suggestions", { p_items: items });
  if (error) return { updated: 0, skipped: error.message };
  return { updated: Number(data ?? 0) };
}
