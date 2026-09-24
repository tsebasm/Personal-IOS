import { describe, expect, it } from "vitest";
import {
  computeProspectingRates,
  daysBetween,
  nextVantMilestone,
  safePercent,
  safeRatio,
  sumProspectingTotals,
} from "./metrics";

describe("safeRatio / safePercent", () => {
  it("devuelve null sin denominador en vez de NaN/Infinity", () => {
    expect(safeRatio(5, 0)).toBeNull();
    expect(safePercent(5, 0)).toBeNull();
    expect(safeRatio(Number.NaN, 2)).toBeNull();
    expect(safePercent(1, 4)).toBe(25);
  });
});

describe("computeProspectingRates", () => {
  it("mide el cierre sobre citas asistidas", () => {
    const r = computeProspectingRates({ contacts: 200, replies: 20, appointments: 10, shows: 5, closed: 1 });
    expect(r.replyRate).toBe(10);
    expect(r.schedulingRate).toBe(50);
    expect(r.showRate).toBe(50);
    expect(r.closingRate).toBe(20);
  });

  it("sin asistencia registrada cae a citas agendadas y no inventa tasa de asistencia", () => {
    const r = computeProspectingRates({ contacts: 200, replies: 20, appointments: 7, closed: 0 });
    expect(r.showRate).toBeNull();
    expect(r.closingRate).toBe(0);
  });

  it("sin contactos no hay tasas", () => {
    const r = computeProspectingRates({ contacts: 0, replies: 0, appointments: 0, closed: 0 });
    expect(r).toEqual({ replyRate: null, schedulingRate: null, showRate: null, closingRate: null });
  });
});

describe("sumProspectingTotals", () => {
  it("suma las etapas nuevas y tolera sesiones previas a 0011", () => {
    const totals = sumProspectingTotals([
      { contacts_count: 20, replies_count: 2, appointments_count: 1, clients_closed: 0 },
      {
        contacts_count: 30,
        replies_count: 4,
        appointments_count: 2,
        clients_closed: 1,
        shows_count: 2,
        proposals_count: 1,
        followups_count: 10,
        minutes_spent: 90,
      },
    ]);
    expect(totals).toEqual({
      contacts: 50,
      replies: 6,
      appointments: 3,
      shows: 2,
      proposals: 1,
      followups: 10,
      closed: 1,
      minutes: 90,
    });
  });
});

describe("nextVantMilestone", () => {
  const goals = [
    { id: "root", title: "VANT", parent_goal_id: null, status: "activo", deadline: "2026-12-31" },
    { id: "a", title: "Hito A", parent_goal_id: "root", status: "activo", deadline: "2026-11-30" },
    { id: "b", title: "Hito B", parent_goal_id: "root", status: "activo", deadline: "2026-10-15" },
    { id: "c", title: "Hito C", parent_goal_id: "root", status: "cumplido", deadline: "2026-10-01" },
  ];

  it("elige la sub-meta activa con el deadline más próximo", () => {
    expect(nextVantMilestone(goals, "root")?.id).toBe("b");
  });

  it("null sin meta vinculada", () => {
    expect(nextVantMilestone(goals, null)).toBeNull();
  });
});

describe("daysBetween", () => {
  it("positivo hacia el futuro, negativo si ya pasó", () => {
    expect(daysBetween("2026-09-23", "2026-12-31")).toBe(99);
    expect(daysBetween("2026-09-23", "2026-09-20")).toBe(-3);
  });
});
