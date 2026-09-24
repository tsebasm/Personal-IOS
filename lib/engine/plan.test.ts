import { describe, expect, it } from "vitest";
import { parseAssumptions, parsePipelineSnapshot } from "@/lib/agencia/plan-settings";
import { buildPlan, type PlanInput } from "./plan";

const zeroTotals = { contacts: 0, replies: 0, appointments: 0, shows: 0, proposals: 0, followups: 0, closed: 0, minutes: 0 };

const input: PlanInput = {
  today: "2026-09-23",
  goal: {
    id: "g1",
    title: "Facturación acumulada VANT",
    unit: "COP",
    baseline_value: 0,
    target_value: 20_000_000,
    current_value: 999, // manual: debe ignorarse en la meta de VANT
    start_date: "2026-09-23",
    deadline: "2026-12-31",
  },
  isVantRevenueGoal: true,
  revenueCumulative: 0,
  totals: zeroTotals,
  assumptions: parseAssumptions({
    reply_rate: 8,
    booking_rate: 30,
    show_rate: 70,
    close_rate: 20,
    sales_cycle_days: 14,
    minutes_per_contact: 5,
    outreach_days_per_week: 6,
    setup_fee: 2_000_000,
    monthly_fee: 1_500_000,
  }),
  pipeline: parsePipelineSnapshot({}),
};

describe("buildPlan", () => {
  it("la meta de VANT toma el valor actual de la facturación, no del campo manual", () => {
    const plan = buildPlan({ ...input, revenueCumulative: 3_000_000 });
    expect(plan.currentSource).toBe("billing");
    expect(plan.currentValue).toBe(3_000_000);
    expect(plan.gap.remaining).toBe(17_000_000);
  });

  it("convierte la brecha en COP a clientes con el precio de la oferta", () => {
    const plan = buildPlan(input);
    expect(plan.closes.kind).toBe("revenue");
    if (plan.closes.kind !== "revenue") return;
    // cierre supuesto 18-nov → nov + dic = 2 meses: 2M + 1,5M × 2 = 5M → 20M / 5M = 4 clientes
    expect(plan.closes.assumedCloseDate).toBe("2026-11-18");
    expect(plan.closes.revenuePerClient).toBe(5_000_000);
    expect(plan.closes.closesNeeded).toBe(4);
    expect(plan.reverse?.ok).toBe(true);
    if (plan.reverse?.ok) {
      expect(plan.reverse.volume.contacts).toBe(Math.ceil(4 / (0.08 * 0.3 * 0.7 * 0.2)));
      expect(plan.reverse.trace[0]).toMatch(/cliente\(s\)/);
    }
  });

  it("todas las tasas salen como ESTIMACIÓN mientras no haya muestra", () => {
    const plan = buildPlan(input);
    expect(Object.values(plan.rates).every((r) => r.source === "estimate")).toBe(true);
  });

  it("con muestra suficiente, la tasa histórica reemplaza a la estimación", () => {
    const plan = buildPlan({ ...input, totals: { ...zeroTotals, contacts: 200, replies: 30 } });
    expect(plan.rates.reply.source).toBe("historical");
    expect(plan.rates.reply.value).toBeCloseTo(0.15);
    // 30 respuestas ≥ mínimo de 20 y 0 citas: 0% es dato real, y bloquea el plan.
    expect(plan.rates.booking.source).toBe("historical");
    expect(plan.rates.booking.value).toBe(0);
    expect(plan.reverse?.ok).toBe(false);
    if (plan.reverse && !plan.reverse.ok) expect(plan.reverse.blocked).toHaveLength(1);
  });

  it("dice qué falta si no hay precio ni ciclo de venta", () => {
    const plan = buildPlan({ ...input, assumptions: parseAssumptions({}) });
    expect(plan.closes).toEqual({
      kind: "missing",
      missing: ["precio de la oferta (setup y/o fee mensual)", "duración del ciclo de venta (días)"],
    });
    expect(plan.reverse).toBeNull();
  });

  it("metas medidas en clientes usan la brecha directamente", () => {
    const plan = buildPlan({
      ...input,
      isVantRevenueGoal: false,
      goal: { ...input.goal, unit: "clientes", target_value: 1, current_value: 0 },
    });
    expect(plan.closes).toEqual({ kind: "clients", closesNeeded: 1 });
  });

  it("otras metas solo calculan la brecha", () => {
    const plan = buildPlan({ ...input, isVantRevenueGoal: false, goal: { ...input.goal, unit: "kg" } });
    expect(plan.closes.kind).toBe("unsupported");
    expect(plan.gap.remaining).not.toBeNull();
  });
});

describe("parseAssumptions / parsePipelineSnapshot", () => {
  it("tolera jsonb vacío o con basura", () => {
    expect(parseAssumptions(null).reply_rate).toBeNull();
    expect(parseAssumptions({ reply_rate: "8" }).reply_rate).toBe(8);
    expect(parsePipelineSnapshot({ replied: -3, booked: "2" })).toEqual({ replied: 0, booked: 2, showed: 0, as_of: null });
  });
});
