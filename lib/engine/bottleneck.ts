import type { ProspectingTotals } from "@/lib/agencia/metrics";
import { METRICS } from "./metrics-registry";

/**
 * Bottleneck Engine. Separa estrictamente:
 *   OBSERVACIÓN (lo que el dato muestra, con n)
 *   HIPÓTESIS (posibles causas — nunca afirmadas como hecho)
 *   ACCIÓN / MÉTRICA (experimento sugerido y cómo evaluarlo)
 * Sin muestra suficiente no diagnostica: dice qué dato falta.
 */

export type BottleneckKind =
  | "low_response_rate"
  | "low_booking_rate"
  | "low_show_rate"
  | "low_close_rate"
  | "insufficient_volume"
  | "insufficient_followup";

export const BOTTLENECK_LABEL: Record<BottleneckKind, string> = {
  low_response_rate: "Tasa de respuesta baja",
  low_booking_rate: "Tasa de agendamiento baja",
  low_show_rate: "Tasa de asistencia baja",
  low_close_rate: "Tasa de cierre baja",
  insufficient_volume: "Volumen insuficiente",
  insufficient_followup: "Seguimiento insuficiente",
};

export type Finding = {
  kind: BottleneckKind;
  /** 0–1: qué tan lejos está de la referencia. */
  severity: number;
  observation: string;
  hypotheses: string[];
  action: string;
  metric: string;
};

export type BottleneckInput = {
  current: ProspectingTotals;
  /** Período anterior de igual duración, para detectar cambios. */
  previous: ProspectingTotals | null;
  /** Referencias por etapa (proporción 0–1): estimación del usuario o null. */
  reference: { reply: number | null; booking: number | null; show: number | null; close: number | null };
  /** Contactos que el plan exigía en el período (null si no hay plan). */
  requiredContacts: number | null;
  overdueFollowups: number;
};

export type BottleneckResult = {
  top: Finding | null;
  findings: Finding[];
  missingData: string[];
  /** Señal explícita cuando no hay que recomendar "más volumen". */
  volumeDownConversionUp: boolean;
};

type Stage = {
  key: "reply" | "booking" | "show" | "close";
  kind: BottleneckKind;
  label: string;
  num: (t: ProspectingTotals) => number;
  den: (t: ProspectingTotals) => number;
  minSample: number;
  hypotheses: string[];
  action: (n: number) => string;
};

const STAGES: Stage[] = [
  {
    key: "reply",
    kind: "low_response_rate",
    label: "respuesta",
    num: (t) => t.replies,
    den: (t) => t.contacts,
    minSample: METRICS.reply_rate.minSample!,
    hypotheses: ["El mensaje no genera suficiente interés.", "El segmento contactado no coincide con el ICP.", "El canal no es el adecuado para este ICP."],
    action: (n) => `Probar 2 variantes de mensaje con ${n} contactos cada una (experimento A/B).`,
  },
  {
    key: "booking",
    kind: "low_booking_rate",
    label: "agendamiento",
    num: (t) => t.appointments,
    den: (t) => t.replies,
    minSample: METRICS.booking_rate.minSample!,
    hypotheses: ["El paso de respuesta a cita pide demasiado compromiso.", "La oferta no es clara en la conversación.", "Falta seguimiento después de la primera respuesta."],
    action: (n) => `Probar un CTA de agendamiento distinto en las próximas ${n} respuestas.`,
  },
  {
    key: "show",
    kind: "low_show_rate",
    label: "asistencia",
    num: (t) => t.shows,
    den: (t) => t.appointments,
    minSample: METRICS.show_rate.minSample!,
    hypotheses: ["Faltan recordatorios entre el agendamiento y la cita.", "Se agendan prospectos poco calificados.", "La cita se agenda demasiado lejos en el tiempo."],
    action: (n) => `Agregar confirmación + recordatorio 24 h y 1 h antes en las próximas ${n} citas.`,
  },
  {
    key: "close",
    kind: "low_close_rate",
    label: "cierre",
    num: (t) => t.closed,
    den: (t) => t.shows,
    minSample: METRICS.close_rate.minSample!,
    hypotheses: ["Se llega a la llamada con prospectos sin capacidad de pago.", "La oferta o el precio no encajan con el problema.", "El guion de la llamada no cuantifica el costo del problema."],
    action: (n) => `Calificar capacidad de pago antes de agendar y medir las próximas ${n} llamadas.`,
  },
];

const rate = (num: number, den: number) => (den > 0 ? num / den : null);
const fmt = (x: number) => `${(x * 100).toFixed(1)}%`;

export function detectBottleneck(input: BottleneckInput): BottleneckResult {
  const findings: Finding[] = [];
  const missingData: string[] = [];
  const { current, previous } = input;

  for (const s of STAGES) {
    const n = s.den(current);
    const actual = rate(s.num(current), n);
    if (actual === null || n < s.minSample) {
      missingData.push(`tasa de ${s.label}: n=${n} de ${s.minSample} necesarios`);
      continue;
    }
    // Referencia: la estimación declarada; si no hay, el período anterior con muestra suficiente.
    const prevN = previous ? s.den(previous) : 0;
    const prevRate = previous && prevN >= s.minSample ? rate(s.num(previous), prevN) : null;
    const ref = input.reference[s.key] ?? prevRate;
    if (ref === null || ref <= 0) {
      missingData.push(`referencia para la tasa de ${s.label} (estimación o período anterior con muestra)`);
      continue;
    }
    const ratio = actual / ref;
    if (ratio < 0.8) {
      findings.push({
        kind: s.kind,
        severity: Math.min(1, 1 - ratio),
        observation: `La tasa de ${s.label} es ${fmt(actual)} (n=${n}) frente a una referencia de ${fmt(ref)}${
          input.reference[s.key] !== null ? " (estimación)" : " (período anterior)"
        }.`,
        hypotheses: s.hypotheses,
        action: s.action(s.minSample),
        metric: `Tasa de ${s.label}`,
      });
    }
  }

  if (input.requiredContacts !== null && input.requiredContacts > 0) {
    const ratio = current.contacts / input.requiredContacts;
    if (ratio < 0.8) {
      findings.push({
        kind: "insufficient_volume",
        severity: Math.min(1, 1 - ratio),
        observation: `Se hicieron ${current.contacts} contactos nuevos de ${input.requiredContacts} que el plan requería en el período.`,
        hypotheses: ["La capacidad asignada a ventas no alcanza.", "Otras tareas desplazaron la prospección.", "La cuota es mayor a la capacidad real (revisar el plan)."],
        action: "Bloquear la cuota diaria de prospección como prioridad #1 en Hoy durante 7 días.",
        metric: "Contactos nuevos por día",
      });
    }
  }

  if (input.overdueFollowups > 0) {
    findings.push({
      kind: "insufficient_followup",
      severity: Math.min(1, input.overdueFollowups / 5),
      observation: `${input.overdueFollowups} lead(s) abiertos tienen el follow-up vencido.`,
      hypotheses: ["No hay un momento fijo del día para follow-ups.", "Los follow-ups no aparecen en las prioridades."],
      action: "Hacer los follow-ups vencidos antes de contactar nuevos prospectos.",
      metric: "Follow-ups vencidos",
    });
  }

  // Menos volumen pero mejor conversión: el cuello de botella no es la cantidad.
  let volumeDownConversionUp = false;
  if (previous && previous.contacts > 0 && current.contacts > 0) {
    const prevConv = rate(previous.appointments, previous.contacts);
    const curConv = rate(current.appointments, current.contacts);
    volumeDownConversionUp =
      current.contacts < previous.contacts && prevConv !== null && curConv !== null && curConv > prevConv;
  }
  // Si además hay otra etapa débil, no se recomienda "más volumen": el problema está en otra parte.
  const otherIssue = findings.some((f) => f.kind !== "insufficient_volume");
  const filtered =
    volumeDownConversionUp && otherIssue ? findings.filter((f) => f.kind !== "insufficient_volume") : findings;
  const sorted = [...filtered].sort((a, b) => b.severity - a.severity);

  return { top: sorted[0] ?? null, findings: sorted, missingData, volumeDownConversionUp };
}
