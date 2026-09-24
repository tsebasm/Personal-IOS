/**
 * Forma de agencia_settings.funnel_assumptions / pipeline_snapshot (jsonb).
 * Compartido entre la acción (servidor), el loader y los formularios.
 * Las tasas se guardan en % (0–100) porque así las escribe el usuario.
 */

export type FunnelAssumptions = {
  reply_rate: number | null;
  booking_rate: number | null;
  show_rate: number | null;
  close_rate: number | null;
  sales_cycle_days: number | null;
  minutes_per_contact: number | null;
  outreach_days_per_week: number | null;
  setup_fee: number | null;
  monthly_fee: number | null;
  /** De dónde salen estas estimaciones (nota de la VANT Brain, intuición, benchmark…). */
  source: string | null;
};

export type PipelineSnapshotSettings = {
  replied: number;
  booked: number;
  showed: number;
  as_of: string | null;
};

export const ASSUMPTION_NUMBER_KEYS = [
  "reply_rate",
  "booking_rate",
  "show_rate",
  "close_rate",
  "sales_cycle_days",
  "minutes_per_contact",
  "outreach_days_per_week",
  "setup_fee",
  "monthly_fee",
] as const;

function numOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Lectura defensiva: el jsonb puede venir vacío o de una versión anterior. */
export function parseAssumptions(raw: unknown): FunnelAssumptions {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { source: typeof o.source === "string" && o.source ? o.source : null } as FunnelAssumptions;
  for (const k of ASSUMPTION_NUMBER_KEYS) out[k] = numOrNull(o[k]);
  return out;
}

export function parsePipelineSnapshot(raw: unknown): PipelineSnapshotSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const count = (v: unknown) => Math.max(0, Math.round(numOrNull(v) ?? 0));
  return {
    replied: count(o.replied),
    booked: count(o.booked),
    showed: count(o.showed),
    as_of: typeof o.as_of === "string" && o.as_of ? o.as_of : null,
  };
}
