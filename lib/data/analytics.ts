import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isoDateInTimezone, shiftIsoDate, startOfDayInTimezone } from "@/lib/date";
import { computeBillingSummary, type VantClient } from "@/lib/agencia/billing";
import { sumProspectingTotals } from "@/lib/agencia/metrics";
import { computeAllocation } from "@/lib/engine/allocation";
import { outreachDaysIn } from "@/lib/engine/allocation";
import { computeHabitCompliance, weekStartOf } from "@/lib/engine/habits";
import { buildWeeklyRollup, compareDays, type DayMetrics, type PeriodData, type WeeklyRollup } from "@/lib/engine/rollup";
import { getCurrentProfile } from "./profile";
import { loadPlanContext } from "./plan";

export type Analytics = {
  today: string;
  weeks: PeriodData[];
  current: WeeklyRollup;
  dayDiff: ReturnType<typeof compareDays>;
  /** Semanas que ya tienen revisión semanal guardada (period_start). */
  closedWeeks: string[];
};

/**
 * Datos de las últimas `weeksBack` semanas (lunes a domingo) agrupados por
 * semana, más la comparación hoy vs ayer. Una sola ronda de consultas; los
 * cálculos están en lib/engine/rollup.ts.
 */
export const loadAnalytics = cache(async (weeksBack = 8): Promise<Analytics | null> => {
  const [profile, planCtx] = await Promise.all([getCurrentProfile(), loadPlanContext()]);
  if (!profile || !planCtx) return null;
  const tz = profile.timezone;
  const today = planCtx.today;
  const currentWeek = weekStartOf(today);
  const from = shiftIsoDate(currentWeek, -7 * (weeksBack - 1));
  const supabase = await createClient();

  const [sessions, timeEntries, doneTasks, scheduled, habits, logs, clientsRes, closed] = await Promise.all([
    supabase
      .from("prospecting_sessions")
      .select("date, contacts_count, replies_count, appointments_count, shows_count, proposals_count, followups_count, clients_closed, minutes_spent")
      .gte("date", from)
      .lte("date", today),
    supabase.from("time_entries").select("date, minutes, category").gte("date", from).lte("date", today),
    supabase.from("tasks").select("completed_at").eq("status", "done").gte("completed_at", startOfDayInTimezone(from, tz)),
    supabase.from("tasks").select("scheduled_date, status").gte("scheduled_date", from).lte("scheduled_date", today).neq("status", "cancelled"),
    supabase.from("habits").select("id, frequency, target_per_period, days_of_week").eq("is_active", true),
    supabase.from("habit_logs").select("habit_id, date, done").gte("date", shiftIsoDate(from, -7)).lte("date", today),
    supabase
      .from("vant_clients")
      .select(
        "id, name, start_date, status, setup_fee, commission_type, commission_value, monthly_fee, additional_commission, ad_spend, paused_at, cancelled_at"
      ),
    supabase.from("reviews").select("period_start").eq("type", "semanal").gte("period_start", from),
  ]);

  const clients: VantClient[] = (clientsRes.data ?? []).map((c) => ({
    ...c,
    setup_fee: Number(c.setup_fee),
    commission_value: Number(c.commission_value),
    monthly_fee: Number(c.monthly_fee),
    additional_commission: Number(c.additional_commission),
    ad_spend: Number(c.ad_spend),
  }));
  const revenueAt = (iso: string) => computeBillingSummary(clients, iso).totalRevenue;
  const doneDates = (doneTasks.data ?? []).map((t) => isoDateInTimezone(tz, new Date(t.completed_at as string)));
  const doneByHabit = new Map<string, Set<string>>();
  for (const l of logs.data ?? []) {
    if (!l.done) continue;
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set());
    doneByHabit.get(l.habit_id)!.add(l.date);
  }

  const inRange = <T extends { date: string }>(rows: T[], a: string, b: string) => rows.filter((r) => r.date >= a && r.date <= b);

  const periodFor = (start: string, end: string): PeriodData => {
    const alloc = computeAllocation(inRange(timeEntries.data ?? [], start, end));
    const compliance = (habits.data ?? [])
      .map((h) => computeHabitCompliance(h, doneByHabit.get(h.id) ?? new Set(), end, 7).pct)
      .filter((x): x is number => x !== null);
    return {
      start,
      end,
      prospecting: sumProspectingTotals(inRange(sessions.data ?? [], start, end)),
      salesMinutes: alloc.byCategory.ventas,
      buildMinutes: alloc.byCategory.construccion,
      loggedMinutes: alloc.totalMinutes,
      tasksDone: doneDates.filter((d) => d >= start && d <= end).length,
      tasksScheduled: (scheduled.data ?? []).filter((t) => t.scheduled_date! >= start && t.scheduled_date! <= end).length,
      habitCompliancePct: compliance.length ? Math.round(compliance.reduce((s, x) => s + x, 0) / compliance.length) : null,
      revenueStart: revenueAt(shiftIsoDate(start, -1)),
      revenueEnd: revenueAt(end),
    };
  };

  const weeks: PeriodData[] = [];
  for (let w = from; w <= currentWeek; w = shiftIsoDate(w, 7)) {
    const end = shiftIsoDate(w, 6);
    weeks.push(periodFor(w, end > today ? today : end));
  }

  // Objetivos del plan actual para la semana en curso (días transcurridos).
  const reverse = planCtx.plan?.reverse;
  const elapsed = weeks[weeks.length - 1];
  const daysElapsed = Math.round((Date.parse(elapsed.end) - Date.parse(elapsed.start)) / 86_400_000) + 1;
  const outreachDays = outreachDaysIn(daysElapsed, planCtx.assumptions.outreach_days_per_week);
  const current = buildWeeklyRollup(elapsed, weeks.length > 1 ? weeks[weeks.length - 2] : null, {
    contacts: reverse?.ok && reverse.dailyContacts !== null ? reverse.dailyContacts * outreachDays : null,
    salesMinutes: reverse?.ok && reverse.dailyMinutes !== null ? reverse.dailyMinutes * outreachDays : null,
  });

  const dayMetrics = (d: string): DayMetrics => {
    const p = periodFor(d, d);
    return {
      contacts: p.prospecting.contacts,
      replies: p.prospecting.replies,
      appointments: p.prospecting.appointments,
      tasksDone: p.tasksDone,
      habitsDone: [...doneByHabit.values()].filter((s) => s.has(d)).length,
      salesMinutes: p.salesMinutes,
      revenue: p.revenueEnd,
    };
  };

  return {
    today,
    weeks,
    current,
    dayDiff: compareDays(dayMetrics(today), dayMetrics(shiftIsoDate(today, -1))),
    closedWeeks: (closed.data ?? []).map((r) => r.period_start),
  };
});
