import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isoDateInTimezone, startOfDayInTimezone } from "@/lib/date";
import { computeDayCapacity, type CapacityBlock, type DayCapacity } from "@/lib/engine/capacity";
import { rankActions, type ActionCandidate, type Ranking } from "@/lib/engine/priority";
import { getCurrentProfile } from "./profile";
import { loadPlanContext, type PlanContext } from "./plan";

export type TodayTask = ActionCandidate & { status: string };

export type TodayContext = {
  today: string;
  timezone: string;
  planCtx: PlanContext | null;
  capacity: DayCapacity;
  ranking: Ranking;
  /** Tareas de días anteriores sin completar: requieren decisión (modo adaptativo). */
  missed: TodayTask[];
  /** Tareas de hoy ya completadas. */
  doneToday: { id: string; title: string }[];
  contactsToday: number;
  outreachQuota: { target: number; source: "manual" | "calculated"; remaining: number; minutesPerContact: number | null } | null;
};

const TASK_COLUMNS =
  "id, title, status, priority, impact_score, effort, goal_id, lever, deadline, scheduled_date, estimated_minutes, execution_mode, completed_at";

/**
 * Todo lo que necesita el Command Center. Solo I/O + armado de candidatos;
 * el orden sale de lib/engine/priority.ts (misma lógica que el dashboard).
 */
export const loadTodayContext = cache(async (): Promise<TodayContext | null> => {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const planCtx = await loadPlanContext();
  const today = planCtx?.today ?? isoDateInTimezone(profile.timezone);

  const [{ data: openTasks }, { data: doneTodayData }, { data: goals }, { data: deps }, { data: blocks }, { data: sessionsToday }] =
    await Promise.all([
      supabase.from("tasks").select(TASK_COLUMNS).not("status", "in", "(done,cancelled)").limit(300),
      supabase
        .from("tasks")
        .select("id, title")
        .eq("status", "done")
        .gte("completed_at", startOfDayInTimezone(today, profile.timezone))
        .order("completed_at", { ascending: false }),
      supabase.from("goals").select("id, parent_goal_id, status"),
      supabase.from("task_dependencies").select("task_id, depends_on_task_id"),
      supabase.from("capacity_blocks").select("id, label, kind, days_of_week, start_time, end_time, valid_from, valid_to"),
      supabase.from("prospecting_sessions").select("contacts_count").eq("date", today),
    ]);

  const open = openTasks ?? [];
  const openIds = new Set(open.map((t) => t.id));
  const openDeps = new Map<string, number>();
  for (const d of deps ?? []) {
    if (openIds.has(d.depends_on_task_id)) openDeps.set(d.task_id, (openDeps.get(d.task_id) ?? 0) + 1);
  }

  const toCandidate = (t: (typeof open)[number]): TodayTask => ({
    id: t.id,
    kind: "task",
    title: t.title,
    status: t.status,
    priority: t.priority,
    impact_score: t.impact_score,
    effort: t.effort,
    goal_id: t.goal_id,
    lever: t.lever,
    deadline: t.deadline,
    scheduled_date: t.scheduled_date,
    estimated_minutes: t.estimated_minutes,
    execution_mode: t.execution_mode,
    openDependencies: openDeps.get(t.id) ?? 0,
  });

  // Programadas en días anteriores: no se re-priorizan solas, se deciden.
  const missed = open.filter((t) => t.scheduled_date && t.scheduled_date < today).map(toCandidate);
  const missedIds = new Set(missed.map((m) => m.id));
  const candidates: ActionCandidate[] = open.filter((t) => !missedIds.has(t.id)).map(toCandidate);

  const capacity = computeDayCapacity((blocks ?? []) as CapacityBlock[], today);
  const contactsToday = (sessionsToday ?? []).reduce((s, r) => s + r.contacts_count, 0);

  // La cuota de prospección del plan compite en el Top como una acción más.
  const quota = planCtx?.dailyOutreachTarget ?? null;
  const minutesPerContact = planCtx?.assumptions.minutes_per_contact ?? null;
  const outreachQuota = quota
    ? { target: quota.value, source: quota.source, remaining: Math.max(0, quota.value - contactsToday), minutesPerContact }
    : null;
  const northStarId = planCtx?.plan?.goal.id ?? null;
  if (outreachQuota && outreachQuota.remaining > 0) {
    candidates.push({
      id: "plan:outreach",
      kind: "plan",
      title: `Prospectar ${outreachQuota.remaining} contacto(s) nuevos (cuota ${outreachQuota.source === "calculated" ? "calculada por el plan" : "manual"})`,
      priority: "alta",
      impact_score: 5,
      effort: 3,
      goal_id: northStarId,
      lever: "outbound",
      deadline: today,
      scheduled_date: today,
      estimated_minutes: minutesPerContact !== null ? Math.ceil(outreachQuota.remaining * minutesPerContact) : null,
      // Sin modo fijo: cabe en bloques ligeros o profundos (escribir mensajes no exige deep work).
      execution_mode: null,
      openDependencies: 0,
    });
  }

  // Follow-ups vencidos (tabla leads) compiten como una acción: cerrar lo abierto antes de abrir más.
  const overdue = planCtx?.overdueFollowups ?? 0;
  if (overdue > 0) {
    candidates.push({
      id: "plan:followups",
      kind: "plan",
      title: `Hacer ${overdue} follow-up(s) pendientes`,
      priority: "alta",
      impact_score: 5,
      effort: 2,
      goal_id: northStarId,
      lever: "follow_up",
      deadline: today,
      scheduled_date: today,
      estimated_minutes: minutesPerContact !== null ? Math.ceil(overdue * minutesPerContact) : null,
      execution_mode: null,
      openDependencies: 0,
    });
  }

  const goalParents = new Map((goals ?? []).map((g) => [g.id, g.parent_goal_id as string | null]));
  const activeGoalIds = new Set((goals ?? []).filter((g) => g.status === "activo").map((g) => g.id));
  const ranking = rankActions(candidates, {
    today,
    northStarGoalId: northStarId,
    goalParents,
    activeGoalIds,
    acquisitionFocus: planCtx?.plan?.closes.kind === "revenue" || planCtx?.plan?.closes.kind === "clients",
    capacity: capacity.configured ? capacity : null,
  });

  return {
    today,
    timezone: profile.timezone,
    planCtx,
    capacity,
    ranking,
    missed,
    doneToday: doneTodayData ?? [],
    contactsToday,
    outreachQuota,
  };
});
