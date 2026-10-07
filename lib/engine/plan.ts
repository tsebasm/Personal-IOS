import type { ProspectingTotals } from "@/lib/agencia/metrics";
import type { FunnelAssumptions, PipelineSnapshotSettings } from "@/lib/agencia/plan-settings";
import { convertTotals, referenceRate, type ConvertedTotal, type FxRateLike, type MoneyAmount } from "./fx";
import { computeGap, type GapResult } from "./gap";
import { METRICS } from "./metrics-registry";
import { resolveRate } from "./rates";
import {
  assumedCloseDate,
  revenuePerNewClient,
  reverseEngineer,
  type FunnelRates,
  type ReverseInput,
  type ReverseResult,
} from "./reverse";

export type PlanGoal = {
  id: string;
  title: string;
  unit: string | null;
  /** §11: no nulo = meta bloqueada. */
  locked_at?: string | null;
  /** Moneda principal de una meta monetaria (C-1). Si falta y la unidad es un código ISO, se usa la unidad. */
  currency: string | null;
  baseline_value: number | null;
  target_value: number | null;
  current_value: number | null;
  start_date: string | null;
  deadline: string | null;
};

export type PlanInput = {
  today: string;
  goal: PlanGoal;
  /** Meta de ingresos: el valor actual es el ingreso RECONOCIDO (revenue_receipts), no el campo manual ni la facturación proyectada. */
  isVantRevenueGoal: boolean;
  revenue: {
    /** Dinero recibido por moneda original (lib/engine/revenue.ts). */
    recognized: MoneyAmount[];
    rates: FxRateLike[];
    /** Moneda operativa de los precios de la oferta (agencia_settings): COP. */
    offerCurrency: string;
  };
  totals: ProspectingTotals;
  assumptions: FunnelAssumptions;
  pipeline: PipelineSnapshotSettings;
};

/** Cómo se traduce la brecha de la meta a cierres del embudo. */
export type ClosesMode =
  | { kind: "revenue"; revenuePerClient: number; assumedCloseDate: string; closesNeeded: number }
  | { kind: "clients"; closesNeeded: number }
  | { kind: "unsupported"; reason: string }
  | { kind: "missing"; missing: string[] };

export type Plan = {
  goal: PlanGoal;
  /** null si lo recibido no puede expresarse en la moneda de la meta (sin tasa vigente). */
  currentValue: number | null;
  currentSource: "receipts" | "manual";
  /** Conversión aplicada al ingreso reconocido (transparencia: tasa, fecha, fuente o qué falta). */
  conversion: ConvertedTotal | null;
  /** Ingreso reconocido en su moneda original (dato complementario: nunca se reescribe). */
  revenueRecorded: MoneyAmount[] | null;
  gap: GapResult;
  rates: FunnelRates;
  closes: ClosesMode;
  reverseInput: ReverseInput | null;
  reverse: ReverseResult | null;
};

const pctToRatio = (v: number | null) => (v === null ? null : v / 100);
const CLIENT_UNIT = /client/i;

/** Tasas del embudo: histórico si alcanza la muestra del registro de métricas, si no la estimación. */
export function resolveFunnelRates(totals: ProspectingTotals, a: FunnelAssumptions): FunnelRates {
  return {
    reply: resolveRate({ num: totals.replies, den: totals.contacts }, pctToRatio(a.reply_rate), METRICS.reply_rate.minSample!),
    booking: resolveRate(
      { num: totals.appointments, den: totals.replies },
      pctToRatio(a.booking_rate),
      METRICS.booking_rate.minSample!
    ),
    show: resolveRate({ num: totals.shows, den: totals.appointments }, pctToRatio(a.show_rate), METRICS.show_rate.minSample!),
    close: resolveRate({ num: totals.closed, den: totals.shows }, pctToRatio(a.close_rate), METRICS.close_rate.minSample!),
  };
}

/**
 * Compone gap + tasas + reverse engineering para una meta. Puro: el loader
 * (lib/data/plan.ts) solo trae los datos; toda decisión numérica vive aquí.
 */
export function buildPlan(input: PlanInput): Plan {
  const { goal, assumptions: a, today } = input;
  const conversion = input.isVantRevenueGoal ? convertTotals(input.revenue.recognized, goalCurrency(goal), input.revenue.rates, today) : null;
  const currentValue = conversion
    ? conversion.status === "ok"
      ? conversion.amount
      : null
    : (goal.current_value ?? goal.baseline_value ?? 0);
  const currentSource = input.isVantRevenueGoal ? "receipts" : "manual";
  const revenueRecorded = input.isVantRevenueGoal ? input.revenue.recognized : null;
  const rawGap = computeGap({
    baseline: goal.baseline_value,
    current: currentValue ?? goal.baseline_value,
    target: goal.target_value,
    startDate: goal.start_date,
    deadline: goal.deadline,
    today,
  });
  // Sin tasa vigente no hay cifra de progreso: nada de mostrar 0 % como si fuera un dato.
  const gap: GapResult =
    currentValue === null
      ? { ...rawGap, remaining: null, progressPct: null, requiredPerDay: null, actualPerDay: null, projectedAtDeadline: null, onTrack: null }
      : rawGap;
  const rates = resolveFunnelRates(input.totals, a);

  const closes = closesNeededFor(input, gap, currentValue);
  if (closes.kind !== "revenue" && closes.kind !== "clients") {
    return { goal, currentValue, currentSource, conversion, revenueRecorded, gap, rates, closes, reverseInput: null, reverse: null };
  }

  const reverseInput: ReverseInput = {
    closesNeeded: closes.closesNeeded,
    rates,
    pipeline: input.pipeline,
    today,
    deadline: goal.deadline!,
    salesCycleDays: a.sales_cycle_days,
    outreachDaysPerWeek: a.outreach_days_per_week,
    minutesPerContact: a.minutes_per_contact,
  };
  const reverse = reverseEngineer(reverseInput);
  if (reverse.ok && closes.kind === "revenue") {
    reverse.trace.unshift(
      `Faltan ${Math.round(gap.remaining ?? 0).toLocaleString("es-CO")} ${goal.unit ?? ""} ÷ ${Math.round(closes.revenuePerClient).toLocaleString("es-CO")} por cliente nuevo (setup + fee × meses hasta el deadline, cierre supuesto ${closes.assumedCloseDate}) = ${closes.closesNeeded} cliente(s)`
    );
  }
  return { goal, currentValue, currentSource, conversion, revenueRecorded, gap, rates, closes, reverseInput, reverse };
}

const ISO_CURRENCY = /^[A-Z]{3}$/;
/** Moneda en la que se evalúa una meta monetaria: la declarada, o la unidad si es un código ISO. */
export function goalCurrency(goal: Pick<PlanGoal, "currency" | "unit">): string {
  if (goal.currency) return goal.currency;
  if (goal.unit && ISO_CURRENCY.test(goal.unit)) return goal.unit;
  return "COP";
}

function closesNeededFor(input: PlanInput, gap: GapResult, currentValue: number | null): ClosesMode {
  const { goal, assumptions: a, today } = input;
  const isClients = goal.unit !== null && CLIENT_UNIT.test(goal.unit);
  if (!input.isVantRevenueGoal && !isClients) {
    return {
      kind: "unsupported",
      reason:
        "El cálculo hacia atrás por embudo aplica a la meta de facturación de VANT o a metas medidas en clientes. Para esta meta solo se calcula la brecha.",
    };
  }

  const missing: string[] = [];
  if (goal.target_value === null) missing.push("valor objetivo de la meta (Punto B)");
  if (!goal.deadline) missing.push("deadline de la meta");
  if (input.isVantRevenueGoal) {
    if (a.setup_fee === null && a.monthly_fee === null) missing.push("precio de la oferta (setup y/o fee mensual)");
    if (a.sales_cycle_days === null) missing.push("duración del ciclo de venta (días)");
  }
  // Precios de la oferta (moneda operativa) → moneda de la meta, con la misma tasa de referencia.
  let offerFactor = 1;
  if (input.isVantRevenueGoal) {
    const cur = goalCurrency(goal);
    const fx = referenceRate(input.revenue.rates, input.revenue.offerCurrency, cur, today);
    if (currentValue === null || fx.status !== "ok") {
      missing.push(`tasa de cambio vigente ${input.revenue.offerCurrency}→${cur} (fx_rates)`);
    } else {
      offerFactor = fx.ref.factor;
    }
  }
  if (missing.length > 0) return { kind: "missing", missing };

  const remaining = gap.remaining ?? 0;
  if (isClients && !input.isVantRevenueGoal) return { kind: "clients", closesNeeded: Math.ceil(remaining) };

  const closeDate = assumedCloseDate(today, goal.deadline!, a.sales_cycle_days!);
  const perClient =
    revenuePerNewClient({
      setupFee: a.setup_fee ?? 0,
      monthlyFee: a.monthly_fee ?? 0,
      closeDate,
      deadline: goal.deadline!,
    }) * offerFactor;
  if (perClient <= 0) return { kind: "missing", missing: ["precio de la oferta mayor a 0"] };
  return { kind: "revenue", revenuePerClient: perClient, assumedCloseDate: closeDate, closesNeeded: Math.ceil(remaining / perClient) };
}
