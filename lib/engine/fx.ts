import { daysBetween } from "@/lib/agencia/metrics";

/**
 * Conversión de moneda para evaluar la meta (spec §130, C-1). Función pura.
 *
 * COP es la moneda operativa de registro; la meta se expresa y evalúa en USD.
 * Política (explícita y única para toda la app: motores, informes y UI):
 *  1. Tasa de referencia = la más reciente del par con rate_date ≤ fecha de evaluación.
 *  2. Vigencia máxima FX_POLICY.maxAgeDays. Sin tasa vigente → 'pending':
 *     se informa el monto original y NO se devuelve una cifra convertida.
 *  3. Ninguna tasa vive en el código; cambiar la tasa no reescribe los montos
 *     originales (solo cambia el equivalente calculado).
 */

export const FX_POLICY = {
  method: "latest_reference_rate",
  maxAgeDays: 31,
} as const;

export type FxRateLike = {
  id?: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  rate_date: string;
  source: string;
  source_reference?: string | null;
};

export type ReferenceRate = {
  /** Unidades de `to` por 1 unidad de `from` (ya invertida si el dato estaba al revés). */
  factor: number;
  rate: FxRateLike;
  ageDays: number;
};

export type RateLookup =
  | { status: "ok"; ref: ReferenceRate }
  | { status: "pending"; reason: "no_rate" | "stale_rate"; latest: FxRateLike | null; ageDays: number | null };

/** Busca la tasa de referencia from→to vigente a `asOf`. Acepta el par en cualquier sentido. */
export function referenceRate(
  rates: FxRateLike[],
  from: string,
  to: string,
  asOf: string,
  policy: { maxAgeDays: number } = FX_POLICY
): RateLookup {
  if (from === to) {
    return { status: "ok", ref: { factor: 1, rate: { base_currency: from, quote_currency: to, rate: 1, rate_date: asOf, source: "identidad" }, ageDays: 0 } };
  }
  const candidates = rates
    .filter((r) => r.rate > 0 && r.source.trim() !== "" && r.rate_date <= asOf)
    .filter((r) => (r.base_currency === from && r.quote_currency === to) || (r.base_currency === to && r.quote_currency === from))
    // Más reciente primero; a igual fecha, el par directo antes que el invertido (sin ambigüedad).
    .sort((a, b) => (a.rate_date === b.rate_date ? (a.base_currency === from ? -1 : 1) : a.rate_date < b.rate_date ? 1 : -1));

  const latest = candidates[0] ?? null;
  if (!latest) return { status: "pending", reason: "no_rate", latest: null, ageDays: null };
  const ageDays = daysBetween(latest.rate_date, asOf);
  if (ageDays > policy.maxAgeDays) return { status: "pending", reason: "stale_rate", latest, ageDays };
  const factor = latest.base_currency === from ? latest.rate : 1 / latest.rate;
  return { status: "ok", ref: { factor, rate: latest, ageDays } };
}

export type MoneyGoalProgress = {
  /** Meta en su moneda (nunca convertida). */
  target: { amount: number; currency: string };
  /** Acumulado reconocido en la moneda operativa (dato original). */
  recorded: { amount: number; currency: string };
  /** Equivalente en la moneda de la meta; null si la conversión está pendiente. */
  converted: { amount: number; currency: string } | null;
  progressPct: number | null;
  conversion: RateLookup;
};

/**
 * Progreso de una meta monetaria cuyo dinero se registra en otra moneda.
 * El objetivo nunca se convierte: se convierte el acumulado reconocido.
 */
export function moneyGoalProgress(input: {
  targetAmount: number;
  targetCurrency: string;
  recordedAmount: number;
  recordedCurrency: string;
  rates: FxRateLike[];
  asOf: string;
  policy?: { maxAgeDays: number };
}): MoneyGoalProgress {
  const conversion = referenceRate(input.rates, input.recordedCurrency, input.targetCurrency, input.asOf, input.policy);
  const converted =
    conversion.status === "ok" ? { amount: input.recordedAmount * conversion.ref.factor, currency: input.targetCurrency } : null;
  const progressPct =
    converted && input.targetAmount > 0 ? Math.min(100, Math.max(0, (converted.amount / input.targetAmount) * 100)) : null;
  return {
    target: { amount: input.targetAmount, currency: input.targetCurrency },
    recorded: { amount: input.recordedAmount, currency: input.recordedCurrency },
    converted,
    progressPct,
    conversion,
  };
}
