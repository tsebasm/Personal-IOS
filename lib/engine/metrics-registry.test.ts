import { describe, expect, it } from "vitest";
import { METRICS, goalProgressPct } from "./metrics-registry";

describe("goalProgressPct", () => {
  it("mide el avance desde el Punto A, no desde 0", () => {
    expect(goalProgressPct(15, 20, 10)).toBe(50);
    expect(goalProgressPct(5_000_000, 20_000_000)).toBe(25);
  });

  it("acota a 0–100", () => {
    expect(goalProgressPct(25, 20, 0)).toBe(100);
    expect(goalProgressPct(5, 20, 10)).toBe(0);
  });

  it("sin valor actual cuenta como Punto A", () => {
    expect(goalProgressPct(null, 20, 10)).toBe(0);
  });

  it("null si no hay objetivo o no hay brecha", () => {
    expect(goalProgressPct(5, null)).toBeNull();
    expect(goalProgressPct(5, 10, 10)).toBeNull();
  });

  it("soporta metas decrecientes (p. ej. bajar deuda)", () => {
    expect(goalProgressPct(6, 0, 10)).toBe(40);
  });
});

describe("METRICS", () => {
  it("cada métrica tiene una definición escrita", () => {
    for (const m of Object.values(METRICS)) expect(m.definition.length).toBeGreaterThan(10);
  });
});
