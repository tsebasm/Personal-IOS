import type { MoneyAmount } from "./fx";

/**
 * Ingreso reconocido para la meta (spec §130, regla definitiva de C-1):
 * SOLO dinero efectivamente recibido (revenue_receipts.status = 'received').
 * Revertidos, facturas pendientes, contratos sin pagar y proyecciones de
 * billing.ts no cuentan. `transactions` no se suma (podría duplicar pagos).
 * received_at decide cuándo entra al acumulado. Montos en su moneda original.
 */

export type ReceiptLike = { amount: number | string; currency: string; status: string; received_at: string };

export function recognizedRevenue(receipts: ReceiptLike[], asOfInstant?: string): MoneyAmount[] {
  const byCurrency = new Map<string, number>();
  for (const r of receipts) {
    if (r.status !== "received") continue;
    if (asOfInstant && Date.parse(r.received_at) > Date.parse(asOfInstant)) continue;
    byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + Number(r.amount));
  }
  return [...byCurrency].map(([currency, amount]) => ({ amount, currency })).sort((a, b) => a.currency.localeCompare(b.currency));
}
