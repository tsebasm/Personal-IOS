import { describe, expect, it } from "vitest";
import { computeHabitCompliance, weekStartOf } from "./habits";

const today = "2026-09-24"; // jueves
const set = (...d: string[]) => new Set(d);

describe("weekStartOf", () => {
  it("lunes de la semana", () => {
    expect(weekStartOf("2026-09-24")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21"); // domingo
    expect(weekStartOf("2026-09-21")).toBe("2026-09-21");
  });
});

describe("hábito diario", () => {
  const spec = { frequency: "diaria", target_per_period: 1, days_of_week: null };

  it("racha igual que antes y cumplimiento sobre días transcurridos", () => {
    const c = computeHabitCompliance(spec, set("2026-09-22", "2026-09-23"), today, 7);
    expect(c.streak).toBe(2);
    expect(c.expected).toBe(6); // hoy sin marcar no se exige
    expect(c.done).toBe(2);
    expect(c.dueToday).toBe(true);
  });
});

describe("hábito personalizado (lun/mié/vie)", () => {
  const spec = { frequency: "custom", target_per_period: 1, days_of_week: [1, 3, 5] };

  it("los días no programados no rompen la racha", () => {
    // lun 21, mié 23 cumplidos; mar 22 no programado; jue 24 (hoy) no programado.
    const c = computeHabitCompliance(spec, set("2026-09-21", "2026-09-23"), today, 7);
    expect(c.streak).toBe(2);
    expect(c.dueToday).toBe(false);
    expect(c.expected).toBe(3); // vie 18, lun 21, mié 23
    expect(c.pct).toBe(67);
  });
});

describe("hábito semanal (3 por semana)", () => {
  const spec = { frequency: "semanal", target_per_period: 3, days_of_week: null };

  it("cuenta semanas cumplidas y no penaliza la semana en curso incompleta", () => {
    const done = set(
      "2026-09-14",
      "2026-09-16",
      "2026-09-18", // semana 14-20 cumplida
      "2026-09-22" // semana actual: 1/3
    );
    const c = computeHabitCompliance(spec, done, today, 14);
    expect(c.streakUnit).toBe("semanas");
    expect(c.streak).toBe(1);
    expect(c.thisWeek).toEqual({ done: 1, target: 3 });
    expect(c.dueToday).toBe(true);
    expect(c.pct).toBe(100); // solo se exige la semana completa anterior
  });

  it("con la meta semanal cumplida ya no está pendiente hoy", () => {
    const c = computeHabitCompliance(spec, set("2026-09-21", "2026-09-22", "2026-09-23"), today, 7);
    expect(c.dueToday).toBe(false);
    expect(c.streak).toBe(1);
  });
});
