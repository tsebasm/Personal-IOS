import { describe, expect, it } from "vitest";
import { buildWeeklyRollup, compareDays, type PeriodData } from "./rollup";

const zero = { contacts: 0, replies: 0, appointments: 0, shows: 0, proposals: 0, followups: 0, closed: 0, minutes: 0 };
const period = (over: Partial<PeriodData> = {}): PeriodData => ({
  start: "2026-09-21",
  end: "2026-09-27",
  prospecting: zero,
  salesMinutes: 0,
  buildMinutes: 0,
  loggedMinutes: 0,
  tasksDone: 0,
  tasksScheduled: 0,
  habitCompliancePct: null,
  revenueStart: 0,
  revenueEnd: 0,
  ...over,
});

describe("buildWeeklyRollup", () => {
  it("plan vs real con varianza y eficiencia", () => {
    const r = buildWeeklyRollup(
      period({ prospecting: { ...zero, contacts: 60, replies: 6, appointments: 2 }, salesMinutes: 300, loggedMinutes: 600, tasksDone: 4, tasksScheduled: 5 }),
      null,
      { contacts: 90, salesMinutes: 450 }
    );
    expect(r.variance.contacts).toBe(-30);
    expect(r.variance.contactsPct).toBe(67);
    expect(r.efficiency.repliesPerSalesHour).toBeCloseTo(1.2);
    expect(r.execution.tasksDoneRate).toBe(80);
    expect(r.execution.salesShareOfLogged).toBe(50);
    expect(r.observations[0]).toBe("Contactos nuevos: 60 de 90 planeados (-30).");
  });

  it("compara tasas con la semana anterior como hechos, sin causas", () => {
    const r = buildWeeklyRollup(
      period({ prospecting: { ...zero, contacts: 100, replies: 6 } }),
      period({ prospecting: { ...zero, contacts: 100, replies: 14 } }),
      { contacts: null, salesMinutes: null }
    );
    expect(r.observations).toContain("Tasa de respuesta: 14.0% → 6.0%.");
    expect(r.observations.join(" ")).not.toMatch(/porque|causa/i);
  });

  it("sin horas de ventas no inventa eficiencia", () => {
    const r = buildWeeklyRollup(period(), null, { contacts: null, salesMinutes: null });
    expect(r.efficiency.repliesPerSalesHour).toBeNull();
    expect(r.variance.contacts).toBeNull();
  });
});

describe("compareDays", () => {
  it("solo lo que cambió", () => {
    const base = { contacts: 10, replies: 1, appointments: 0, tasksDone: 2, habitsDone: 1, salesMinutes: 60, revenue: 0 };
    const diff = compareDays({ ...base, contacts: 15, tasksDone: 3 }, base);
    expect(diff.map((d) => [d.key, d.delta])).toEqual([
      ["contacts", 5],
      ["tasksDone", 1],
    ]);
  });
});
