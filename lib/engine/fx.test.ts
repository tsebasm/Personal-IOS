import { describe, expect, it } from "vitest";
import { FX_POLICY, moneyGoalProgress, referenceRate, type FxRateLike } from "./fx";

const rate = (rate_date: string, rate: number, extra: Partial<FxRateLike> = {}): FxRateLike => ({
  base_currency: "USD",
  quote_currency: "COP",
  rate,
  rate_date,
  source: "TRM Banco de la República",
  ...extra,
});

const goal = (recordedCop: number, rates: FxRateLike[], asOf = "2026-10-06") =>
  moneyGoalProgress({ targetAmount: 5000, targetCurrency: "USD", recordedAmount: recordedCop, recordedCurrency: "COP", rates, asOf });

describe("conversión para la meta (C-1)", () => {
  it("convierte el acumulado en COP a USD con la tasa de referencia; la meta no se toca", () => {
    const p = goal(3_900_000, [rate("2026-10-01", 3900)]);
    expect(p.target).toEqual({ amount: 5000, currency: "USD" });
    expect(p.recorded).toEqual({ amount: 3_900_000, currency: "COP" });
    expect(p.converted?.amount).toBeCloseTo(1000);
    expect(p.progressPct).toBeCloseTo(20);
    expect(p.conversion.status === "ok" && p.conversion.ref.rate.rate_date).toBe("2026-10-01");
  });

  it("usa la tasa más reciente con fecha ≤ evaluación (nunca una futura)", () => {
    const p = goal(4_000_000, [rate("2026-09-20", 4100), rate("2026-10-03", 4000), rate("2026-10-10", 3000)]);
    expect(p.conversion.status === "ok" && p.conversion.ref.rate.rate).toBe(4000);
    expect(p.converted?.amount).toBeCloseTo(1000);
  });

  it("acepta el par invertido (COP→USD) sin inventar nada", () => {
    const p = goal(3_900_000, [rate("2026-10-01", 1 / 3900, { base_currency: "COP", quote_currency: "USD" })]);
    expect(p.converted?.amount).toBeCloseTo(1000);
  });

  it("sin tasa: progreso en USD pendiente, se conserva el COP, no hay cifra", () => {
    const p = goal(2_000_000, []);
    expect(p.converted).toBeNull();
    expect(p.progressPct).toBeNull();
    expect(p.recorded.amount).toBe(2_000_000);
    expect(p.conversion).toMatchObject({ status: "pending", reason: "no_rate" });
  });

  it("tasa vencida (> vigencia de la política): pendiente, informa cuál era la última", () => {
    const p = goal(2_000_000, [rate("2026-08-01", 4000)]);
    expect(p.converted).toBeNull();
    expect(p.conversion).toMatchObject({ status: "pending", reason: "stale_rate" });
    if (p.conversion.status === "pending") expect(p.conversion.latest?.rate_date).toBe("2026-08-01");
  });

  it("el límite de vigencia es inclusivo y viene de la política explícita", () => {
    expect(FX_POLICY.maxAgeDays).toBe(31);
    expect(referenceRate([rate("2026-09-05", 4000)], "COP", "USD", "2026-10-06").status).toBe("ok"); // 31 días
    expect(referenceRate([rate("2026-09-04", 4000)], "COP", "USD", "2026-10-06").status).toBe("pending"); // 32 días
  });

  it("descarta tasas sin fuente o no positivas", () => {
    expect(referenceRate([rate("2026-10-01", 3900, { source: " " })], "COP", "USD", "2026-10-06").status).toBe("pending");
    expect(referenceRate([rate("2026-10-01", 0)], "COP", "USD", "2026-10-06").status).toBe("pending");
  });

  it("cambiar la tasa solo cambia el equivalente, no el monto original", () => {
    const before = goal(3_900_000, [rate("2026-10-01", 3900)]);
    const after = goal(3_900_000, [rate("2026-10-01", 3900), rate("2026-10-05", 4100)]);
    expect(after.recorded).toEqual(before.recorded);
    expect(after.converted!.amount).toBeLessThan(before.converted!.amount);
  });

  it("el progreso se acota a 0–100 %", () => {
    expect(goal(39_000_000, [rate("2026-10-01", 3900)]).progressPct).toBe(100);
  });
});
