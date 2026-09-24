import { describe, expect, it } from "vitest";
import { resolveRate } from "./rates";

describe("resolveRate", () => {
  it("usa el histórico cuando la muestra alcanza el mínimo", () => {
    const r = resolveRate({ num: 12, den: 120 }, 0.05, 100);
    expect(r.source).toBe("historical");
    expect(r.value).toBeCloseTo(0.1);
    expect(r.n).toBe(120);
  });

  it("con muestra insuficiente usa la estimación, pero conserva lo observado", () => {
    const r = resolveRate({ num: 3, den: 20 }, 0.08, 100);
    expect(r.source).toBe("estimate");
    expect(r.value).toBe(0.08);
    expect(r.observed).toBeCloseTo(0.15);
  });

  it("sin estimación, usa el histórico marcado como muestra insuficiente", () => {
    const r = resolveRate({ num: 3, den: 20 }, null, 100);
    expect(r.source).toBe("historical_low_n");
    expect(r.value).toBeCloseTo(0.15);
  });

  it("un 0% con muestra chica y sin estimación es dato faltante, no una tasa de 0", () => {
    const r = resolveRate({ num: 0, den: 7 }, null, 10);
    expect(r.source).toBe("missing");
    expect(r.value).toBeNull();
  });

  it("un 0% con muestra suficiente es un dato real", () => {
    const r = resolveRate({ num: 0, den: 150 }, 0.1, 100);
    expect(r.source).toBe("historical");
    expect(r.value).toBe(0);
  });

  it("sin datos ni estimación falta el dato", () => {
    expect(resolveRate({ num: 0, den: 0 }, undefined, 10).source).toBe("missing");
  });
});
