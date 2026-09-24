import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { shiftIsoDate, startOfDayInTimezone } from "@/lib/date";
import { computeBillingSummary, type VantClient } from "@/lib/agencia/billing";
import { sumProspectingTotals, type ProspectingTotals } from "@/lib/agencia/metrics";
import { computeAllocation } from "@/lib/engine/allocation";
import { computeHabitCompliance, weekStartOf, type HabitCompliance } from "@/lib/engine/habits";
import { descendsFrom } from "@/lib/engine/priority";
import { loadPlanContext } from "./plan";
import { getCurrentProfile } from "./profile";

export type DailyCheckin = {
  energy: number | null;
  focus: number | null;
  progress: "si" | "parcial" | "no" | null;
  note: string | null;
};

export type HabitToday = { id: string; title: string; doneToday: boolean; compliance: HabitCompliance };

export type SerHacerTener = {
  weekStart: string;
  ser: {
    habits: HabitToday[];
    /** Promedio de cumplimiento (7 días) de los hábitos con algo esperado. */
    avgCompliance7d: number | null;
    bestStreak: { value: number; unit: string } | null;
    checkin: DailyCheckin | null;
  };
  hacer: {
    prospecting: ProspectingTotals;
    salesMinutes: number;
    buildMinutes: number;
    tasksDoneForNorthStar: number;
  };
  tener: {
    revenueCumulative: number;
    activeClients: number;
    northStarProgressPct: number | null;
  };
};

/**
 * SER → HACER → TENER como capa transversal: identidad/hábitos, acciones
 * ejecutadas esta semana, resultados. Cada número sale de una tabla real.
 */
export const loadSerHacerTener = cache(async (): Promise<SerHacerTener | null> => {
  const [planCtx, profile] = await Promise.all([loadPlanContext(), getCurrentProfile()]);
  if (!planCtx || !profile) return null;
  const { today } = planCtx;
  const weekStart = weekStartOf(today);
  const logStart = shiftIsoDate(today, -62); // cubre rachas semanales de ~2 meses
  const supabase = await createClient();

  const [
    { data: habits },
    { data: logs },
    { data: checkinRow },
    { data: sessions },
    { data: timeEntries },
    { data: doneTasks },
    { data: goals },
    { data: clientsData },
  ] = await Promise.all([
    supabase.from("habits").select("id, title, frequency, target_per_period, days_of_week").eq("is_active", true).order("created_at"),
    supabase.from("habit_logs").select("habit_id, date, done").gte("date", logStart).lte("date", today),
    supabase.from("reviews").select("content").eq("type", "diaria").eq("period_start", today).limit(1).maybeSingle(),
    supabase
      .from("prospecting_sessions")
      .select("contacts_count, replies_count, appointments_count, shows_count, proposals_count, followups_count, clients_closed, minutes_spent")
      .gte("date", weekStart)
      .lte("date", today),
    supabase.from("time_entries").select("date, minutes, category").gte("date", weekStart).lte("date", today),
    supabase.from("tasks").select("goal_id").eq("status", "done").gte("completed_at", startOfDayInTimezone(weekStart, profile.timezone)),
    supabase.from("goals").select("id, parent_goal_id"),
    supabase
      .from("vant_clients")
      .select(
        "id, name, start_date, status, setup_fee, commission_type, commission_value, monthly_fee, additional_commission, ad_spend, paused_at, cancelled_at"
      ),
  ]);

  const doneByHabit = new Map<string, Set<string>>();
  for (const l of logs ?? []) {
    if (!l.done) continue;
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set());
    doneByHabit.get(l.habit_id)!.add(l.date);
  }
  const habitRows: HabitToday[] = (habits ?? []).map((h) => {
    const done = doneByHabit.get(h.id) ?? new Set<string>();
    return { id: h.id, title: h.title, doneToday: done.has(today), compliance: computeHabitCompliance(h, done, today, 7) };
  });
  const measured = habitRows.filter((h) => h.compliance.pct !== null);
  const avgCompliance7d =
    measured.length > 0 ? Math.round(measured.reduce((s, h) => s + h.compliance.pct!, 0) / measured.length) : null;
  const best = habitRows.reduce<HabitToday | null>(
    (acc, h) => (!acc || h.compliance.streak > acc.compliance.streak ? h : acc),
    null
  );

  const c = checkinRow?.content as Partial<DailyCheckin> | undefined;
  const checkin: DailyCheckin | null = c
    ? { energy: c.energy ?? null, focus: c.focus ?? null, progress: c.progress ?? null, note: c.note ?? null }
    : null;

  const allocation = computeAllocation(timeEntries ?? []);
  const northStarId = planCtx.plan?.goal.id ?? null;
  const parents = new Map((goals ?? []).map((g) => [g.id, g.parent_goal_id as string | null]));
  const tasksDoneForNorthStar = northStarId
    ? (doneTasks ?? []).filter((t) => t.goal_id && descendsFrom(t.goal_id, northStarId, parents)).length
    : 0;

  const clients: VantClient[] = (clientsData ?? []).map((cl) => ({
    ...cl,
    setup_fee: Number(cl.setup_fee),
    commission_value: Number(cl.commission_value),
    monthly_fee: Number(cl.monthly_fee),
    additional_commission: Number(cl.additional_commission),
    ad_spend: Number(cl.ad_spend),
  }));
  const billing = computeBillingSummary(clients, today);

  return {
    weekStart,
    ser: {
      habits: habitRows,
      avgCompliance7d,
      bestStreak: best && best.compliance.streak > 0 ? { value: best.compliance.streak, unit: best.compliance.streakUnit } : null,
      checkin,
    },
    hacer: {
      prospecting: sumProspectingTotals(sessions ?? []),
      salesMinutes: allocation.byCategory.ventas,
      buildMinutes: allocation.byCategory.construccion,
      tasksDoneForNorthStar,
    },
    tener: {
      revenueCumulative: billing.totalRevenue,
      activeClients: billing.activeClients,
      northStarProgressPct: planCtx.plan?.gap.progressPct ?? null,
    },
  };
});
