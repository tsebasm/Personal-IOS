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
