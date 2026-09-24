/** Formateadores de presentación compartidos — antes duplicados en cada página. */

export const money = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Porcentaje ya calculado (0-100) o "—" si la métrica no tiene denominador. */
export const pct = (n: number | null, decimals = 0) => (n === null ? "—" : `${n.toFixed(decimals)}%`);
