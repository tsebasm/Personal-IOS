import type { ProspectingTotals } from "@/lib/agencia/metrics";

/**
 * Feedback loop semanal: PLAN → ACTUAL → VARIANZA → (análisis humano) → AJUSTE.
 * Solo calcula; las observaciones son hechos numéricos, nunca causas.
 */

export type PeriodData = {
  start: string;
  end: string;
  prospecting: ProspectingTotals;
  salesMinutes: number;
  buildMinutes: number;
  loggedMinutes: number;
  tasksDone: number;
  tasksScheduled: number;
  habitCompliancePct: number | null;
  /** Facturación acumulada al final del período (billing) y al inicio. */
  revenueStart: number;
  revenueEnd: number;
};

export type PlanTargets = {
  /** Contactos nuevos que el plan pedía en el período (null si no hay plan). */
  contacts: number | null;
  salesMinutes: number | null;
};

type Rates = { reply: number | null; booking: number | null; show: number | null; close: number | null };

export type WeeklyRollup = {
  start: string;
  end: string;
  plan: PlanTargets;
  actual: {
    contacts: number;
    followups: number;
    replies: number;
    appointments: number;
    shows: number;
    closed: number;
    salesMinutes: number;
    revenueDelta: number;
  };
  variance: { contacts: number | null; contactsPct: number | null; salesMinutes: number | null };
  rates: Rates;
  previousRates: Rates | null;
  efficiency: { repliesPerSalesHour: number | null; appointmentsPerSalesHour: number | null; revenuePerSalesHour: number | null };
  execution: { tasksDoneRate: number | null; habitCompliancePct: number | null; salesShareOfLogged: number | null };
  observations: string[];
};

const r = (num: number, den: number) => (den > 0 ? num / den : null);
const ratesOf = (t: ProspectingTotals): Rates => ({
  reply: r(t.replies, t.contacts),
  booking: r(t.appointments, t.replies),
  show: r(t.shows, t.appointments),
  close: r(t.closed, t.shows),
});
const p1 = (x: number) => `${(x * 100).toFixed(1)}%`;

export function buildWeeklyRollup(current: PeriodData, previous: PeriodData | null, plan: PlanTargets): WeeklyRollup {
  const t = current.prospecting;
  const hours = current.salesMinutes / 60;
  const rates = ratesOf(t);
  const previousRates = previous ? ratesOf(previous.prospecting) : null;
  const revenueDelta = current.revenueEnd - current.revenueStart;

  const observations: string[] = [];
  if (plan.contacts !== null) {
    observations.push(`Contactos nuevos: ${t.contacts} de ${plan.contacts} planeados (${t.contacts - plan.contacts >= 0 ? "+" : ""}${t.contacts - plan.contacts}).`);
  }
  if (plan.salesMinutes !== null) {
    observations.push(`Horas de ventas registradas: ${hours.toFixed(1)} de ${(plan.salesMinutes / 60).toFixed(1)} requeridas.`);
  }
  if (previous) {
    const dc = t.contacts - previous.prospecting.contacts;
    if (dc !== 0) observations.push(`Contactos vs semana anterior: ${dc > 0 ? "+" : ""}${dc}.`);
    const labels: [keyof Rates, string][] = [
      ["reply", "respuesta"],
      ["booking", "agendamiento"],
      ["show", "asistencia"],
      ["close", "cierre"],
    ];
    for (const [k, label] of labels) {
      const a = rates[k];
      const b = previousRates![k];
      if (a !== null && b !== null && a !== b) observations.push(`Tasa de ${label}: ${p1(b)} → ${p1(a)}.`);
    }
  }
  if (revenueDelta !== 0) observations.push(`Facturación acumulada: +${Math.round(revenueDelta).toLocaleString("es-CO")} COP en el período.`);
  if (current.tasksScheduled > 0) observations.push(`Tareas: ${current.tasksDone} completadas de ${current.tasksScheduled} programadas.`);

  return {
    start: current.start,
    end: current.end,
    plan,
    actual: {
      contacts: t.contacts,
      followups: t.followups,
      replies: t.replies,
      appointments: t.appointments,
      shows: t.shows,
      closed: t.closed,
      salesMinutes: current.salesMinutes,
      revenueDelta,
    },
    variance: {
      contacts: plan.contacts !== null ? t.contacts - plan.contacts : null,
      contactsPct: plan.contacts ? Math.round((t.contacts / plan.contacts) * 100) : null,
      salesMinutes: plan.salesMinutes !== null ? current.salesMinutes - plan.salesMinutes : null,
    },
    rates,
    previousRates,
    efficiency: {
      repliesPerSalesHour: hours > 0 ? t.replies / hours : null,
      appointmentsPerSalesHour: hours > 0 ? t.appointments / hours : null,
      revenuePerSalesHour: hours > 0 ? revenueDelta / hours : null,
    },
    execution: {
      tasksDoneRate: current.tasksScheduled > 0 ? Math.round((current.tasksDone / current.tasksScheduled) * 100) : null,
      habitCompliancePct: current.habitCompliancePct,
      salesShareOfLogged: current.loggedMinutes > 0 ? Math.round((current.salesMinutes / current.loggedMinutes) * 100) : null,
    },
    observations,
  };
}

export type DayMetrics = {
  contacts: number;
  replies: number;
  appointments: number;
  tasksDone: number;
  habitsDone: number;
  salesMinutes: number;
  revenue: number;
};

const DAY_LABEL: Record<keyof DayMetrics, string> = {
  contacts: "Contactos nuevos",
  replies: "Respuestas",
  appointments: "Citas agendadas",
  tasksDone: "Tareas completadas",
  habitsDone: "Hábitos cumplidos",
  salesMinutes: "Minutos de ventas",
  revenue: "Facturación acumulada",
};

/** "¿Qué cambió desde ayer?": solo las métricas que se movieron. */
export function compareDays(today: DayMetrics, yesterday: DayMetrics) {
  return (Object.keys(DAY_LABEL) as (keyof DayMetrics)[])
    .map((k) => ({ key: k, label: DAY_LABEL[k], today: today[k], yesterday: yesterday[k], delta: today[k] - yesterday[k] }))
    .filter((x) => x.delta !== 0);
}
