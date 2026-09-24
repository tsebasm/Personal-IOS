/**
 * Resolución de tasas del embudo: DATO histórico cuando hay muestra
 * suficiente, ESTIMACIÓN declarada por el usuario cuando no. Nunca mezcla
 * ambas sin decirlo — cada tasa sale con su `source` y su `n`.
 */

export type RateSource = "historical" | "estimate" | "historical_low_n" | "missing";

export type ResolvedRate = {
  /** Proporción 0–1, o null si no hay ni dato ni estimación. */
  value: number | null;
  source: RateSource;
  /** Denominador histórico (tamaño de muestra real). */
  n: number;
  /** Tasa histórica observada aunque la muestra no alcance, para mostrarla junto a la estimación. */
  observed: number | null;
  minSample: number;
};

/**
 * Regla de corte duro (DECISIÓN de la arquitectura, §6):
 * - n ≥ minSample → histórico.
 * - si no, estimación del usuario si existe.
 * - sin estimación pero con algo de dato → histórico con muestra insuficiente (se usa, marcado).
 * - nada → missing: el motor dirá qué dato falta en vez de inventarlo.
 */
export function resolveRate(
  historical: { num: number; den: number },
  estimate: number | null | undefined,
  minSample: number
): ResolvedRate {
  const n = Math.max(0, historical.den);
  const observed = n > 0 ? Math.max(0, historical.num) / n : null;

  if (observed !== null && n >= minSample) {
    return { value: observed, source: "historical", n, observed, minSample };
  }
  if (estimate !== null && estimate !== undefined && Number.isFinite(estimate) && estimate > 0) {
    return { value: Math.min(1, estimate), source: "estimate", n, observed, minSample };
  }
  // Un 0% observado con muestra chica no sirve para planear (dividiría por cero).
  if (observed !== null && observed > 0) {
    return { value: observed, source: "historical_low_n", n, observed, minSample };
  }
  return { value: null, source: "missing", n, observed, minSample };
}

export const RATE_SOURCE_LABEL: Record<RateSource, string> = {
  historical: "HISTÓRICO",
  estimate: "ESTIMACIÓN",
  historical_low_n: "HISTÓRICO · muestra insuficiente",
  missing: "FALTA DATO",
};
