/**
 * Definición única de cada métrica del sistema (regla 14: toda métrica tiene
 * una definición clara). Las vistas y la IA citan una `key` de aquí en vez
 * de reescribir la fórmula inline — así dos pantallas no pueden volver a
 * mostrar números distintos para "la misma" métrica.
 *
 * `minSample` es el denominador mínimo para tratar la tasa como dato
 * histórico; por debajo, los motores la marcan como ESTIMACIÓN/insuficiente.
 */
export type MetricKey =
  | "reply_rate"
  | "booking_rate"
  | "show_rate"
  | "close_rate"
  | "revenue_cumulative"
  | "revenue_current_month"
  | "goal_progress";

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  definition: string;
  unit: "%" | "COP";
  minSample?: number;
};

export const METRICS: Record<MetricKey, MetricDefinition> = {
  reply_rate: {
    key: "reply_rate",
    label: "Tasa de respuesta",
    definition: "Respuestas ÷ contactos, mismo período y canal (prospecting_sessions).",
    unit: "%",
    minSample: 100,
  },
  booking_rate: {
    key: "booking_rate",
    label: "Tasa de agendamiento",
    definition: "Citas agendadas ÷ respuestas.",
    unit: "%",
    minSample: 20,
  },
  show_rate: {
    key: "show_rate",
    label: "Tasa de asistencia",
    definition: "Citas asistidas ÷ citas agendadas.",
    unit: "%",
    minSample: 10,
  },
  close_rate: {
    key: "close_rate",
    label: "Tasa de cierre",
    definition:
      "Clientes cerrados ÷ citas asistidas (un no-show no es una oportunidad de cierre). Si no hay asistencia registrada (datos previos a 0011), ÷ citas agendadas.",
    unit: "%",
    minSample: 10,
  },
  revenue_cumulative: {
    key: "revenue_cumulative",
    label: "Facturación acumulada",
    definition:
      "Σ por cliente de setup + recurrente mensual × meses facturados, cortando en paused_at/cancelled_at (lib/agencia/billing.ts).",
    unit: "COP",
  },
  revenue_current_month: {
    key: "revenue_current_month",
    label: "Facturación del mes",
    definition: "Σ recurrente mensual de clientes activos hoy + setup de los que iniciaron este mes.",
    unit: "COP",
  },
  goal_progress: {
    key: "goal_progress",
    label: "Progreso de meta",
    definition: "(actual − Punto A) ÷ (objetivo − Punto A), acotado a 0–100%. Punto A = baseline_value, o 0 si no se registró.",
    unit: "%",
  },
};

/**
 * Progreso de una meta desde su Punto A. null cuando no hay objetivo o el
 * objetivo coincide con el punto de partida (no hay brecha que recorrer).
 */
export function goalProgressPct(
  current: number | null,
  target: number | null,
  baseline: number | null = null
): number | null {
  if (target === null || !Number.isFinite(target)) return null;
  const start = baseline ?? 0;
  const span = target - start;
  if (span === 0) return null;
  const raw = (((current ?? start) - start) / span) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}
