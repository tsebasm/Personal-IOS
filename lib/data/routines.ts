import { materializeRoutines, type ExperimentLike, type RoutineLike } from "@/lib/engine/routines";
import { assertCan } from "@/lib/intelligence/permissions";

type Client = {
  from: (t: string) => { select: (c: string) => PromiseLike<{ data: unknown[] | null; error: { message: string; code?: string } | null }> };
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
};

/**
 * Crea (si faltan) las instancias del día de las rutinas vigentes (P-11).
 * Operación automática de bajo riesgo del sistema (§99 nivel 5), idempotente.
 * Si el esquema todavía no tiene rutinas (0017/0020 sin aplicar), no hace nada:
 * Hoy nunca debe romperse por esto (§102).
 */
export async function ensureRoutineInstances(supabase: Client, date: string): Promise<{ created: number; skipped?: string }> {
  assertCan("system", "materialize_routines");
  const [{ data: routines, error: rErr }, { data: experiments, error: eErr }] = await Promise.all([
    supabase.from("routines").select(
      "id, system_id, title, metric_key, target_per_occurrence, unit, cadence, days_of_week, tier, execution_mode, estimated_minutes_per_unit, valid_from, valid_to, status, archived_at"
    ),
    supabase.from("experiments").select("id, name, status, interventions"),
  ]);
  if (rErr) return { created: 0, skipped: rErr.message };
  const rows = (routines ?? []) as RoutineLike[];
  if (rows.length === 0) return { created: 0 };

  const instances = materializeRoutines(
    rows.map((r) => ({ ...r, target_per_occurrence: Number(r.target_per_occurrence), estimated_minutes_per_unit: r.estimated_minutes_per_unit === null ? null : Number(r.estimated_minutes_per_unit) })),
    eErr ? [] : ((experiments ?? []) as ExperimentLike[]).map((e) => ({ ...e, interventions: Array.isArray(e.interventions) ? e.interventions : [] })),
    date
  );
  if (instances.length === 0) return { created: 0 };
  const { data, error } = await supabase.rpc("materialize_routine_instances", { p_instances: instances });
  if (error) return { created: 0, skipped: error.message };
  return { created: Number(data ?? 0) };
}
