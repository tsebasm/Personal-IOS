import { describe, expect, it } from "vitest";
import { computeAllocation, computeExecutionGap, outreachDaysIn } from "./allocation";

describe("computeAllocation", () => {
  it("suma por categoría y calcula porcentajes", () => {
    const a = computeAllocation([
      { date: "2026-09-24", minutes: 60, category: "ventas" },
      { date: "2026-09-24", minutes: 120, category: "construccion" },
      { date: "2026-09-24", minutes: 20, category: "perdido" },
      { date: "2026-09-24", minutes: 30, category: "desconocida" },
    ]);
    expect(a.totalMinutes).toBe(200);
    expect(a.share.construccion).toBe(60);
    expect(a.share.ventas).toBe(30);
  });

  it("sin registros no inventa porcentajes", () => {
    expect(computeAllocation([]).share.ventas).toBeNull();
  });
});

describe("computeExecutionGap", () => {
  it("compara horas de ventas requeridas por el plan vs registradas", () => {
    const allocation = computeAllocation([{ date: "d", minutes: 150, category: "ventas" }]);
    const gap = computeExecutionGap({
      allocation,
      dailySalesMinutesRequired: 75,
      outreachDaysInPeriod: 6,
      capacityMinutesInPeriod: 3000,
    });
    expect(gap?.requiredSalesMinutes).toBe(450);
    expect(gap?.gapMinutes).toBe(-300);
    expect(gap?.requiredSalesShareOfCapacity).toBe(15);
  });

  it("sin plan de ventas no hay gap que calcular", () => {
    expect(
      computeExecutionGap({ allocation: computeAllocation([]), dailySalesMinutesRequired: null, outreachDaysInPeriod: 7, capacityMinutesInPeriod: 0 })
    ).toBeNull();
  });
});

describe("outreachDaysIn", () => {
  it("proporcional a días por semana", () => {
    expect(outreachDaysIn(7, 5)).toBe(5);
    expect(outreachDaysIn(7, null)).toBe(7);
  });
});
