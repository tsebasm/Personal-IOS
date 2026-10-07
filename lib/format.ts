/** Formateadores de presentación compartidos — antes duplicados en cada página. */

export const money = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Porcentaje ya calculado (0-100) o "—" si la métrica no tiene denominador. */
export const pct = (n: number | null, decimals = 0) => (n === null ? "—" : `${n.toFixed(decimals)}%`);

/** Monto en cualquier moneda ISO (C-1: la moneda viaja con el dato). */
export const moneyIn = (n: number, currency: string) =>
  n.toLocaleString("es-CO", { style: "currency", currency, maximumFractionDigits: currency === "COP" ? 0 : 2 });

type ConversionLike =
  | { status: "ok"; lookups: { from: string; ref: { factor: number; rate: { rate: number; base_currency: string; quote_currency: string; rate_date: string; source: string } } }[] }
  | { status: "pending"; missing: { from: string; reason: "no_rate" | "stale_rate"; latest: { rate_date: string } | null }[] };

/**
 * Texto de transparencia de una conversión (C-1): qué tasa, de qué fecha y
 * fuente; o por qué está pendiente. Un único texto para toda la app.
 */
export function describeConversion(c: ConversionLike | null): string | null {
  if (!c) return null;
  if (c.status === "pending") {
    return c.missing
      .map((m) =>
        m.reason === "no_rate"
          ? `Pendiente de conversión: no hay tasa ${m.from} registrada.`
          : `Pendiente de conversión: la última tasa ${m.from} (${m.latest?.rate_date}) superó la vigencia.`
      )
      .join(" ");
  }
  if (c.lookups.length === 0) return null;
  return c.lookups
    .map(({ ref }) => `Tasa ${ref.rate.base_currency}/${ref.rate.quote_currency} ${ref.rate.rate.toLocaleString("es-CO")} del ${ref.rate.rate_date} (${ref.rate.source})`)
    .join(" · ");
}
