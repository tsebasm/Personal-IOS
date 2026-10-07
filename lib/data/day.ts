import { startOfDayInTimezone, shiftIsoDate } from "@/lib/date";
import { combineMetricValues, PROVIDED_KEYS, prospectingProvider, receiptsProvider } from "@/lib/engine/metric-providers";
import { dailyActuals, executionScore, taskCompletion, type DayTask, type ExecutionScore, type TaskCompletion } from "@/lib/engine/execution";
import type { TierInfo } from "@/components/tier-control";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type DayItem = DayTask & {
  completion: TaskCompletion;
  tierInfo: TierInfo;
  /** Dónde se registran los datos de esta métrica (proveedor), si aplica. */
  recordHref: string | null;
  fromRoutine: boolean;
  status: string;
};

export type DayExecution = {
  items: DayItem[];
  score: ExecutionScore;
  actuals: Map<string, number>;
  /** Registros manuales ignorados porque la métrica ya tiene fuente canónica ese día. */
  conflicts: number;
};

/** Dónde se registra cada métrica provista (instancia VANT u otra fuente). */
const RECORD_HREF: Record<string, string> = {
  contacts: "/dashboard/agencia/prospecting",
  followups: "/dashboard/agencia/prospecting",
  replies: "/dashboard/agencia/prospecting",
  meetings_booked: "/dashboard/agencia/prospecting",
  meetings_held: "/dashboard/agencia/prospecting",
  proposals: "/dashboard/agencia/prospecting",
  closes: "/dashboard/agencia/prospecting",
  revenue_received: "/dashboard/ingresos",
};

const DONE = new Set(["done", "completed"]);

/**
 * Ejecución del día (Hoy v2): tareas de hoy con su nivel, avance derivado de
 * datos reales (proveedores + metric_entries, sin doble conteo) y score.
 * Tolerante a migraciones pendientes: select("*") y consultas opcionales.
 */
export async function loadDayExecution(supabase: Supabase, today: string, timezone: string): Promise<DayExecution> {
  const dayStart = startOfDayInTimezone(today, timezone);
  const dayEnd = startOfDayInTimezone(shiftIsoDate(today, 1), timezone);
  const [tasksRes, sessionsRes, receiptsRes, entriesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .neq("status", "cancelled")
      .or(`scheduled_date.eq.${today},plan_state.eq.today,status.eq.today,and(completed_at.gte.${dayStart},completed_at.lt.${dayEnd})`)
      .limit(200),
    supabase
      .from("prospecting_sessions")
      .select("date, contacts_count, followups_count, replies_count, appointments_count, shows_count, proposals_count, clients_closed")
      .eq("date", today),
    supabase.from("revenue_receipts").select("amount, currency, status, received_at").gte("received_at", dayStart).lt("received_at", dayEnd),
    supabase.from("metric_entries").select("metric_key, date, value, source").eq("date", today),
  ]);

  // plan_state puede no existir (0017 pendiente): reintenta sin ese filtro.
  let taskRows = tasksRes.data as Record<string, unknown>[] | null;
  if (tasksRes.error) {
    const fallback = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "cancelled")
      .or(`scheduled_date.eq.${today},status.eq.today,and(completed_at.gte.${dayStart},completed_at.lt.${dayEnd})`)
      .limit(200);
    taskRows = fallback.data as Record<string, unknown>[] | null;
  }

  const providerValues = [
    ...prospectingProvider.toValues(sessionsRes.data ?? [], { timezone }),
    ...(receiptsRes.error ? [] : receiptsProvider.toValues(receiptsRes.data ?? [], { timezone })),
  ];
  const combined = combineMetricValues(
    providerValues,
    entriesRes.error ? [] : ((entriesRes.data ?? []) as { metric_key: string; date: string; value: number | null; source: string }[]).map((e) => ({ ...e, value: e.value === null ? null : Number(e.value) })),
    PROVIDED_KEYS
  );
  const actuals = dailyActuals(combined.values, today);

  const items: DayItem[] = (taskRows ?? []).map((t) => {
    const task: DayTask = {
      id: t.id as string,
      title: t.title as string,
      tier: (t.tier as DayTask["tier"]) ?? null,
      done: DONE.has(t.status as string),
      target_qty: t.target_qty === null || t.target_qty === undefined ? null : Number(t.target_qty),
      unit: (t.unit as string | null) ?? null,
      metric_key: (t.metric_key as string | null) ?? null,
    };
    const actual = task.metric_key ? (actuals.get(task.metric_key) ?? null) : null;
    return {
      ...task,
      status: t.status as string,
      completion: taskCompletion(task, actual),
      tierInfo: {
        tier: (t.tier as string | null) ?? null,
        tier_suggested: (t.tier_suggested as string | null) ?? null,
        tier_suggested_reason: (t.tier_suggested_reason as string | null) ?? null,
        tier_source: (t.tier_source as string | null) ?? null,
        tier_override_reason: (t.tier_override_reason as string | null) ?? null,
      },
      recordHref: task.metric_key ? (RECORD_HREF[task.metric_key] ?? null) : null,
      fromRoutine: !!t.routine_id,
    };
  });

  const order = { p0: 0, p1: 1, p2: 2 } as const;
  items.sort((a, b) => order[a.tier ?? "p2"] - order[b.tier ?? "p2"] || Number(a.completion.complete) - Number(b.completion.complete));
  return {
    items,
    score: executionScore(items.map((i) => ({ tier: i.tier, complete: i.completion.complete }))),
    actuals,
    conflicts: combined.conflicts.length,
  };
}
