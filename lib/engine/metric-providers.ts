import { isoDateInTimezone } from "@/lib/date";

/**
 * Proveedores de métricas (P-14): traducen tablas operativas existentes a
 * valores de métricas genéricas (metric_key + fecha + valor). Así VANT es una
 * INSTANCIA (sus tablas alimentan claves genéricas) y no lógica del dominio.
 *
 * Regla de fuente única (§122): una clave provista por un proveedor tiene a
 * ese proveedor como fuente canónica. Si además hay metric_entries manuales
 * para la misma clave y día, NO se suman (sería doble conteo): se reportan
 * como conflicto para que el usuario decida.
 */

export type MetricValue = { metric_key: string; date: string; value: number; source: "app" | "manual" | string; provider: string | null };

export type MetricProvider<Row> = {
  id: string;
  /** Tabla de origen (para la UI de transparencia). */
  table: string;
  /** Claves que este proveedor produce (canónicas). */
  keys: readonly string[];
  /** `timezone`: zona del usuario, para fechar eventos con hora (un pago de las 21:00 en Bogotá no es del día siguiente). */
  toValues: (rows: Row[], ctx: { timezone: string }) => MetricValue[];
};

type ProspectingRow = {
  date: string;
  contacts_count: number;
  followups_count?: number | null;
  replies_count: number;
  appointments_count: number;
  shows_count?: number | null;
  proposals_count?: number | null;
  clients_closed: number;
};

const PROSPECTING_MAP: [keyof ProspectingRow, string][] = [
  ["contacts_count", "contacts"],
  ["followups_count", "followups"],
  ["replies_count", "replies"],
  ["appointments_count", "meetings_booked"],
  ["shows_count", "meetings_held"],
  ["proposals_count", "proposals"],
  ["clients_closed", "closes"],
];

/** VANT (instancia): sesiones de prospección → métricas del embudo. */
export const prospectingProvider: MetricProvider<ProspectingRow> = {
  id: "vant.prospecting_sessions",
  table: "prospecting_sessions",
  keys: PROSPECTING_MAP.map(([, k]) => k),
  toValues: (rows) =>
    rows.flatMap((r) =>
      PROSPECTING_MAP.filter(([col]) => r[col] !== null && r[col] !== undefined).map(([col, key]) => ({
        metric_key: key,
        date: r.date,
        value: Number(r[col]),
        source: "app",
        provider: "vant.prospecting_sessions",
      }))
    ),
};

type ReceiptRow = { amount: number | string; currency: string; status: string; received_at: string };

/** Dinero recibido (C-1) → métrica `revenue_received` en su moneda original (COP); la conversión es de fx.ts. */
export const receiptsProvider: MetricProvider<ReceiptRow> = {
  id: "revenue_receipts",
  table: "revenue_receipts",
  keys: ["revenue_received"],
  toValues: (rows, ctx) =>
    rows
      .filter((r) => r.status === "received")
      .map((r) => ({
        metric_key: "revenue_received",
        date: isoDateInTimezone(ctx.timezone, new Date(r.received_at)),
        value: Number(r.amount),
        source: "app",
        provider: "revenue_receipts",
      })),
};

export type CombinedMetrics = {
  values: MetricValue[];
  /** Registros manuales ignorados porque la clave tiene proveedor canónico ese día. */
  conflicts: { metric_key: string; date: string; provider: string; manualValue: number; providerValue: number }[];
};

/** Une datos de proveedores y metric_entries sin doble conteo. */
export function combineMetricValues(
  providerValues: MetricValue[],
  entries: { metric_key: string; date: string; value: number | null; source: string }[],
  providedKeys: readonly string[]
): CombinedMetrics {
  const provided = new Set(providedKeys);
  const byKeyDay = new Map<string, number>();
  for (const v of providerValues) byKeyDay.set(`${v.metric_key}|${v.date}`, (byKeyDay.get(`${v.metric_key}|${v.date}`) ?? 0) + v.value);

  const values = [...providerValues];
  const conflicts: CombinedMetrics["conflicts"] = [];
  for (const e of entries) {
    if (e.value === null) continue; // faltante: no es cero
    if (provided.has(e.metric_key)) {
      const pv = byKeyDay.get(`${e.metric_key}|${e.date}`);
      if (pv !== undefined) {
        const provider = providerValues.find((v) => v.metric_key === e.metric_key && v.date === e.date)?.provider ?? "?";
        conflicts.push({ metric_key: e.metric_key, date: e.date, provider, manualValue: e.value, providerValue: pv });
        continue;
      }
    }
    values.push({ metric_key: e.metric_key, date: e.date, value: e.value, source: e.source, provider: null });
  }
  return { values, conflicts };
}

export const PROVIDERS = [prospectingProvider, receiptsProvider] as const;
export const PROVIDED_KEYS: readonly string[] = PROVIDERS.flatMap((p) => p.keys);
