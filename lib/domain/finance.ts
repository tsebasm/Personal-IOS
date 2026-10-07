import { z } from "zod";
import { currencyCode, isoDate, optText, rowOf, text, type FkSchema } from "./common";

/**
 * Tasas de cambio (spec §130, C-1). COP es la moneda operativa de registro;
 * la meta se expresa y evalúa en USD. Una tasa es un DATO con fecha, fuente y
 * referencia: nunca vive en el código ni se inventa.
 */

export const fxRateObject = (_fk: FkSchema) =>
  z.object({
    /** Par: 1 unidad de `base_currency` = `rate` unidades de `quote_currency` (p. ej. 1 USD = 3.900 COP). */
    base_currency: currencyCode,
    quote_currency: currencyCode,
    rate: z.number().finite().positive(),
    rate_date: isoDate,
    /** De dónde sale la cotización (p. ej. "TRM Banco de la República"). Obligatorio. */
    source: text,
    /** URL o documento que respalda el dato. */
    source_reference: optText,
    note: optText,
  });
export const fxRateCheck = (r: { base_currency: string; quote_currency: string }) => r.base_currency !== r.quote_currency;
export const FX_RATE_MSG = "Una tasa necesita dos monedas distintas.";
export const fxRateShape = (fk: FkSchema) => fxRateObject(fk).refine(fxRateCheck, FX_RATE_MSG);

export const FxRate = rowOf(fxRateObject(z.string().uuid())).refine(fxRateCheck, FX_RATE_MSG);
export type FxRate = z.infer<typeof FxRate>;

// INGRESO RECONOCIDO (C-1, regla definitiva) ------------------------------------
// Única fuente del acumulado de la meta: dinero efectivamente recibido.
// received cuenta · reversed deja de contar y conserva el historial.

export const REVENUE_CONCEPTS = ["setup", "monthly_fee", "commission", "additional_commission", "other"] as const;
export const REVENUE_STATUSES = ["received", "reversed"] as const;

export const revenueReceiptObject = (fk: FkSchema) =>
  z.object({
    vant_client_id: fk.nullable().default(null),
    counterparty: optText,
    received_at: z.string().datetime({ offset: true }),
    amount: z.number().finite().positive(),
    currency: currencyCode.default("COP"),
    concept: z.enum(REVENUE_CONCEPTS),
    status: z.enum(REVENUE_STATUSES).default("received"),
    reversed_at: z.string().datetime({ offset: true }).nullable().default(null),
    reversal_reason: optText,
    reference: optText,
    idempotency_key: optText,
    note: optText,
  });
export const revenueReceiptCheck = (r: {
  vant_client_id: string | null;
  counterparty: string | null;
  status: string;
  reversed_at: string | null;
  reversal_reason: string | null;
}) =>
  (r.vant_client_id !== null || r.counterparty !== null) &&
  (r.status === "reversed") === (r.reversed_at !== null) &&
  (r.status !== "reversed" || r.reversal_reason !== null);
export const REVENUE_RECEIPT_MSG = "Recibo inválido: indica cliente o contraparte; una reversión exige fecha y motivo.";

export const RevenueReceipt = rowOf(revenueReceiptObject(z.string().uuid())).refine(revenueReceiptCheck, REVENUE_RECEIPT_MSG);
export type RevenueReceipt = z.infer<typeof RevenueReceipt>;
