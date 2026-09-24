import { sumProspectingTotals, type ProspectingTotals } from "@/lib/agencia/metrics";

type SessionRow = Parameters<typeof sumProspectingTotals>[0][number] & { message_variant: string | null };

export type VariantResult = {
  variant: string;
  totals: ProspectingTotals;
  /** Tasa de la métrica del experimento (0–1) y su denominador. */
  rate: number | null;
  n: number;
  reachedSample: boolean;
};

const METRIC: Record<string, { num: (t: ProspectingTotals) => number; den: (t: ProspectingTotals) => number }> = {
  reply_rate: { num: (t) => t.replies, den: (t) => t.contacts },
  booking_rate: { num: (t) => t.appointments, den: (t) => t.replies },
  show_rate: { num: (t) => t.shows, den: (t) => t.appointments },
  close_rate: { num: (t) => t.closed, den: (t) => t.shows },
};

/**
 * Resultados por variante a partir de las sesiones atribuidas. Solo sugiere
 * un líder cuando TODAS las variantes alcanzaron la muestra: antes de eso
 * cualquier diferencia es ruido y se reporta como "insuficiente".
 */
export function experimentResults(
  metricKey: string,
  variants: string[],
  sessions: SessionRow[],
  sampleTarget: number
): { variants: VariantResult[]; leader: string | null; unassigned: number } {
  const m = METRIC[metricKey] ?? METRIC.reply_rate;
  const results = variants.map((v) => {
    const totals = sumProspectingTotals(sessions.filter((s) => (s.message_variant ?? "").trim() === v));
    const n = m.den(totals);
    return { variant: v, totals, n, rate: n > 0 ? m.num(totals) / n : null, reachedSample: n >= sampleTarget };
  });
  const unassigned = sessions.filter((s) => !variants.includes((s.message_variant ?? "").trim())).length;
  const allReached = results.length > 0 && results.every((r) => r.reachedSample);
  const leader = allReached
    ? [...results].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))[0]?.variant ?? null
    : null;
  return { variants: results, leader, unassigned };
}
