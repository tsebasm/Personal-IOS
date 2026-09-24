import { describe, expect, it } from "vitest";
import { followupsDue, pipelineFromLeads } from "@/lib/agencia/leads";
import { detectBottleneck } from "./bottleneck";
import { buildPlanPhases } from "./plan30";

const totals = (over: Partial<Record<string, number>> = {}) => ({
  contacts: 0,
  replies: 0,
  appointments: 0,
  shows: 0,
  proposals: 0,
  followups: 0,
  closed: 0,
  minutes: 0,
  ...over,
});
const noRef = { reply: null, booking: null, show: null, close: null };

describe("detectBottleneck", () => {
  it("sin muestra suficiente no diagnostica: dice qué falta", () => {
    const r = detectBottleneck({ current: totals({ contacts: 40, replies: 2 }), previous: null, reference: { ...noRef, reply: 0.1 }, requiredContacts: null, overdueFollowups: 0 });
    expect(r.top).toBeNull();
    expect(r.missingData[0]).toMatch(/respuesta: n=40 de 100/);
  });

  it("separa observación de hipótesis en una tasa baja con muestra", () => {
    const r = detectBottleneck({ current: totals({ contacts: 200, replies: 8 }), previous: null, reference: { ...noRef, reply: 0.1 }, requiredContacts: null, overdueFollowups: 0 });
    expect(r.top?.kind).toBe("low_response_rate");
    expect(r.top?.observation).toMatch(/4\.0% \(n=200\).*10\.0% \(estimación\)/);
    expect(r.top?.hypotheses.length).toBeGreaterThan(0);
    expect(r.top?.metric).toBe("Tasa de respuesta");
  });

  it("usa el período anterior como referencia si no hay estimación", () => {
    const r = detectBottleneck({
      current: totals({ contacts: 150, replies: 6 }),
      previous: totals({ contacts: 150, replies: 21 }),
      reference: noRef,
      requiredContacts: null,
      overdueFollowups: 0,
    });
    expect(r.top?.observation).toMatch(/período anterior/);
  });

  it("volumen bajo es el cuello de botella si las tasas están bien", () => {
    const r = detectBottleneck({ current: totals({ contacts: 30 }), previous: null, reference: noRef, requiredContacts: 100, overdueFollowups: 0 });
    expect(r.top?.kind).toBe("insufficient_volume");
  });

  it("caso de la especificación: menos volumen y mejor conversión → no recomendar más volumen", () => {
    const r = detectBottleneck({
      current: totals({ contacts: 300, replies: 35, appointments: 8, shows: 2, closed: 0 }),
      previous: totals({ contacts: 500, replies: 20, appointments: 4 }),
      reference: { reply: 0.1, booking: 0.5, show: 0.7, close: 0.2 },
      requiredContacts: 450,
      overdueFollowups: 0,
    });
    expect(r.volumeDownConversionUp).toBe(true);
    expect(r.findings.some((f) => f.kind === "insufficient_volume")).toBe(false);
  });

  it("follow-ups vencidos aparecen como hallazgo", () => {
    const r = detectBottleneck({ current: totals(), previous: null, reference: noRef, requiredContacts: null, overdueFollowups: 3 });
    expect(r.top?.kind).toBe("insufficient_followup");
  });
});

describe("leads", () => {
  it("pipeline por última etapa (propuesta cuenta como asistió)", () => {
    const stages = ["contacted", "replied", "booked", "showed", "proposal", "won", "lost"] as const;
    expect(pipelineFromLeads(stages.map((stage) => ({ stage })))).toEqual({ replied: 1, booked: 1, showed: 2 });
  });

  it("follow-ups vencidos solo de leads abiertos", () => {
    const due = followupsDue(
      [
        { stage: "replied" as const, next_followup_on: "2026-09-20" },
        { stage: "won" as const, next_followup_on: "2026-09-20" },
        { stage: "booked" as const, next_followup_on: "2026-09-30" },
      ],
      "2026-09-24"
    );
    expect(due).toHaveLength(1);
  });
});

describe("buildPlanPhases", () => {
  const base = {
    today: "2026-09-24",
    deadline: "2026-12-31",
    salesCycleDays: 14,
    hasValidatedHypothesis: false,
    testingHypotheses: 2,
    attributedContacts: 50,
    minSamplePerHypothesis: 100,
    dailyContacts: 15,
    hasPipelineToConvert: false,
  };

  it("la validación dura lo necesario para juntar muestra, con tope", () => {
    const p = buildPlanPhases(base);
    const v = p.phases.find((x) => x.key === "validation")!;
    expect(v.end).toBe("2026-10-03"); // (200 − 50) / 15 = 10 días
    expect(p.phases.find((x) => x.key === "pipeline")!.end).toBe("2026-12-17");
    expect(p.checkpoints[0]).toBe("2026-10-01");
  });

  it("se omite si ya hay una hipótesis validada", () => {
    const p = buildPlanPhases({ ...base, hasValidatedHypothesis: true });
    expect(p.phases.find((x) => x.key === "validation")!.status).toBe("skipped");
  });

  it("la conversión arranca hoy si ya hay citas", () => {
    const p = buildPlanPhases({ ...base, hasPipelineToConvert: true });
    expect(p.phases.find((x) => x.key === "conversion")!.start).toBe("2026-09-24");
  });
});
