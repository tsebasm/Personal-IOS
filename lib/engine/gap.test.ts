import { describe, expect, it } from "vitest";
import { computeGap } from "./gap";

const base = {
  baseline: 0,
  current: 0,
  target: 20_000_000,
  startDate: "2026-09-23",
  deadline: "2026-12-31",
  today: "2026-09-23",
};

describe("computeGap", () => {
  it("calcula lo que falta y el ritmo requerido (hoy cuenta como día)", () => {
    const g = computeGap(base);
    expect(g.status).toBe("in_progress");
    expect(g.remaining).toBe(20_000_000);
    expect(g.daysLeft).toBe(99);
    expect(g.requiredPerDay).toBeCloseTo(200_000);
    expect(g.actualPerDay).toBeNull(); // 0 días transcurridos
  });

  it("proyecta con el ritmo real y dice si va en camino", () => {
    const g = computeGap({ ...base, current: 5_000_000, startDate: "2026-09-13" });
    expect(g.actualPerDay).toBeCloseTo(500_000);
    expect(g.onTrack).toBe(true);
    const slow = computeGap({ ...base, current: 100_000, startDate: "2026-09-13" });
    expect(slow.onTrack).toBe(false);
  });

  it("detecta meta cumplida y meta vencida", () => {
    expect(computeGap({ ...base, current: 21_000_000 }).status).toBe("achieved");
    expect(computeGap({ ...base, today: "2027-01-05" }).status).toBe("overdue");
  });

  it("sin objetivo no inventa brecha", () => {
    const g = computeGap({ ...base, target: null });
    expect(g.status).toBe("no_target");
    expect(g.remaining).toBeNull();
  });

  it("soporta metas decrecientes", () => {
    const g = computeGap({ ...base, baseline: 10, current: 6, target: 0 });
    expect(g.remaining).toBe(6);
    expect(g.progressPct).toBe(40);
  });
});
