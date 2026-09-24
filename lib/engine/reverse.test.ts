import { describe, expect, it } from "vitest";
import {
  assumedCloseDate,
  lambdaForProbability,
  poissonAtLeast,
  revenuePerNewClient,
  reverseEngineer,
  sensitivity,
  type ReverseInput,
} from "./reverse";
import { resolveRate } from "./rates";

const est = (v: number) => resolveRate({ num: 0, den: 0 }, v, 10);

const input: ReverseInput = {
  closesNeeded: 1,
  rates: { reply: est(0.08), booking: est(0.3), show: est(0.7), close: est(0.2) },
  pipeline: { replied: 0, booked: 0, showed: 0 },
  today: "2026-09-23",
  deadline: "2026-10-23",
  salesCycleDays: 10,
  outreachDaysPerWeek: 7,
  minutesPerContact: 5,
};

describe("reverseEngineer", () => {
  it("reproduce el ejemplo de la arquitectura (§6): ≈298 contactos, ≈15/día", () => {
    const r = reverseEngineer(input);
    if (!r.ok) throw new Error("esperaba resultado");
    expect(r.pContactToClose).toBeCloseTo(0.00336, 5);
    expect(r.volume.contacts).toBe(298);
    expect(r.outreachWindowEnd).toBe("2026-10-13");
    expect(r.outreachDays).toBe(21);
    expect(r.dailyContacts).toBe(15);
    expect(r.dailyMinutes).toBe(75);
  });

  it("el pipeline abierto reduce el volumen necesario", () => {
    const r = reverseEngineer({ ...input, pipeline: { replied: 0, booked: 2, showed: 2 } });
    if (!r.ok) throw new Error("esperaba resultado");
    // 2 × 0,7 × 0,2 + 2 × 0,2 = 0,68 cierres esperados
    expect(r.expectedFromPipeline).toBeCloseTo(0.68);
    expect(r.volume.contacts).toBe(Math.ceil(0.32 / 0.00336));
  });

  it("dice qué dato falta en vez de calcular", () => {
    const r = reverseEngineer({
      ...input,
      rates: { ...input.rates, show: resolveRate({ num: 0, den: 0 }, null, 10) },
      salesCycleDays: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["tasa de asistencia", "duración del ciclo de venta (días)"]);
  });

  it("una etapa en 0% medido bloquea el plan en vez de pedir volumen infinito", () => {
    const r = reverseEngineer({ ...input, rates: { ...input.rates, booking: resolveRate({ num: 0, den: 30 }, 0.3, 20) } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.blocked).toEqual(["tasa de agendamiento = 0% con n=30"]);
  });

  it("detecta la ventana cerrada", () => {
    const r = reverseEngineer({ ...input, deadline: "2026-09-30" });
    if (!r.ok) throw new Error("esperaba resultado");
    expect(r.windowClosed).toBe(true);
    expect(r.dailyContacts).toBeNull();
  });

  it("para más confianza pide más volumen que el valor esperado", () => {
    const r = reverseEngineer(input);
    if (!r.ok) throw new Error("esperaba resultado");
    expect(r.probabilityAtExpectedVolume).toBeGreaterThan(0.6);
    expect(r.probabilityAtExpectedVolume).toBeLessThan(0.7);
    expect(r.contactsForConfidence.p80).toBeGreaterThan(r.volume.contacts);
    expect(r.contactsForConfidence.p90).toBeGreaterThan(r.contactsForConfidence.p80);
  });

  it("días de prospección por semana reducen los días útiles", () => {
    const r = reverseEngineer({ ...input, outreachDaysPerWeek: 5 });
    if (!r.ok) throw new Error("esperaba resultado");
    expect(r.outreachDays).toBe(15);
    expect(r.dailyContacts).toBe(20);
  });
});

describe("sensitivity", () => {
  it("una tasa de respuesta más alta baja la cuota diaria", () => {
    const [low, mid, high] = sensitivity(input, "reply", [0.5, 1, 1.5]);
    expect(low.dailyContacts!).toBeGreaterThan(mid.dailyContacts!);
    expect(high.dailyContacts!).toBeLessThan(mid.dailyContacts!);
  });
});

describe("Poisson", () => {
  it("P(X ≥ 1) = 1 − e^−λ", () => {
    expect(poissonAtLeast(1, 1)).toBeCloseTo(1 - Math.exp(-1));
    expect(poissonAtLeast(0, 0)).toBe(1);
  });

  it("lambdaForProbability invierte poissonAtLeast", () => {
    const l = lambdaForProbability(2, 0.9);
    expect(poissonAtLeast(2, l)).toBeGreaterThanOrEqual(0.9);
    expect(poissonAtLeast(2, l * 0.98)).toBeLessThan(0.9);
  });
});

describe("ingreso por cliente nuevo", () => {
  it("setup + fee × meses facturados hasta el deadline", () => {
    expect(
      revenuePerNewClient({ setupFee: 2_000_000, monthlyFee: 1_500_000, closeDate: "2026-11-10", deadline: "2026-12-31" })
    ).toBe(5_000_000);
    expect(revenuePerNewClient({ setupFee: 1, monthlyFee: 1, closeDate: "2027-01-02", deadline: "2026-12-31" })).toBe(0);
  });

  it("asume cierre a mitad de camino entre el primer cierre posible y el deadline", () => {
    expect(assumedCloseDate("2026-09-23", "2026-12-31", 14)).toBe("2026-11-18"); // 7-oct + ⌊85/2⌋ días
    expect(assumedCloseDate("2026-12-25", "2026-12-31", 14)).toBe("2026-12-31");
  });
});
