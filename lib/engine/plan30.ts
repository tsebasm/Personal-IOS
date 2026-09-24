import { daysBetween } from "@/lib/agencia/metrics";
import { shiftIsoDate } from "@/lib/date";

/**
 * Plan por fases (Módulo 6) — duraciones dinámicas, no "día 1 = 50 emails":
 *   A · Validación   mercado/ICP/oferta mientras ninguna hipótesis esté validada.
 *   B · Pipeline     prospección + calificación hasta el fin de la ventana útil.
 *   C · Conversión   calls, follow-up, propuestas y cierre.
 *   D · Optimización checkpoints semanales (bottleneck + experimentos).
 * Las fases se solapan: son énfasis, no bloques rígidos.
 */

export type PhaseKey = "validation" | "pipeline" | "conversion" | "optimization";

export type Phase = {
  key: PhaseKey;
  label: string;
  start: string;
  end: string;
  focus: string[];
  exitCriteria: string;
  status: "done" | "active" | "upcoming" | "skipped";
};

export type PlanPhasesInput = {
  today: string;
  deadline: string;
  salesCycleDays: number;
  /** Hay al menos una hipótesis de nicho/oferta validada. */
  hasValidatedHypothesis: boolean;
  /** Hipótesis en prueba y contactos ya atribuidos a ellas. */
  testingHypotheses: number;
  attributedContacts: number;
  /** Muestra mínima por hipótesis para decidir (reply_rate.minSample). */
  minSamplePerHypothesis: number;
  dailyContacts: number | null;
  /** Ya existen citas agendadas/asistidas (hay qué convertir). */
  hasPipelineToConvert: boolean;
  /** Tope de la fase de validación como fracción de los días restantes. */
  maxValidationShare?: number;
};

export type PlanPhases = { phases: Phase[]; checkpoints: string[]; trace: string[] };

export function buildPlanPhases(input: PlanPhasesInput): PlanPhases {
  const trace: string[] = [];
  const daysLeft = Math.max(0, daysBetween(input.today, input.deadline));
  const outreachEnd = shiftIsoDate(input.deadline, -input.salesCycleDays);
  const maxShare = input.maxValidationShare ?? 0.2;

  // A · Validación: días para juntar la muestra mínima en las hipótesis en prueba (mín. 2).
  let validationDays = 0;
  if (!input.hasValidatedHypothesis) {
    const hypotheses = Math.max(2, input.testingHypotheses);
    const needed = Math.max(0, hypotheses * input.minSamplePerHypothesis - input.attributedContacts);
    const perDay = input.dailyContacts && input.dailyContacts > 0 ? input.dailyContacts : null;
    const raw = perDay ? Math.ceil(needed / perDay) : Math.ceil(daysLeft * maxShare);
    const cap = Math.max(1, Math.floor(daysLeft * maxShare));
    validationDays = Math.min(raw, cap);
    trace.push(
      perDay
        ? `Validación: ${hypotheses} hipótesis × ${input.minSamplePerHypothesis} contactos − ${input.attributedContacts} ya atribuidos = ${needed} → ${raw} días a ${perDay}/día (tope ${cap} días = ${Math.round(maxShare * 100)}% del tiempo).`
        : `Validación: sin cuota diaria calculada, se reserva el tope de ${cap} días.`
    );
  } else {
    trace.push("Hay una hipótesis validada: la fase de validación se omite.");
  }

  const validationEnd = validationDays > 0 ? shiftIsoDate(input.today, validationDays - 1) : input.today;
  // La conversión arranca cuando ya hay citas, o a mitad del ciclo de venta desde que empieza el pipeline.
  const conversionStart = input.hasPipelineToConvert
    ? input.today
    : shiftIsoDate(input.today, Math.max(1, Math.floor(input.salesCycleDays / 2)));

  const status = (start: string, end: string): Phase["status"] =>
    end < input.today ? "done" : start <= input.today ? "active" : "upcoming";

  const phases: Phase[] = [
    {
      key: "validation",
      label: "A · Validación",
      start: input.today,
      end: validationEnd,
      focus: ["mercado", "ICP", "problema", "oferta", "canal"],
      exitCriteria: `Una hipótesis supera a las demás en tasa de respuesta con n ≥ ${input.minSamplePerHypothesis}, o se alcanza el tope y se elige la mejor (confianza baja).`,
      status: validationDays > 0 ? status(input.today, validationEnd) : "skipped",
    },
    {
      key: "pipeline",
      label: "B · Pipeline",
      start: input.today,
      end: outreachEnd < input.today ? input.today : outreachEnd,
      focus: ["prospección", "outreach", "calificación"],
      exitCriteria: `Termina el ${outreachEnd}: después, un contacto nuevo no alcanza a cerrar antes del deadline.`,
      status: outreachEnd < input.today ? "done" : "active",
    },
    {
      key: "conversion",
      label: "C · Conversión",
      start: conversionStart > input.deadline ? input.deadline : conversionStart,
      end: input.deadline,
      focus: ["calls", "follow-up", "propuestas", "cierre"],
      exitCriteria: "Cierres suficientes para la meta o deadline.",
      status: status(conversionStart, input.deadline),
    },
    {
      key: "optimization",
      label: "D · Optimización",
      start: input.today,
      end: input.deadline,
      focus: ["datos", "cuello de botella", "experimentos", "ajustes"],
      exitCriteria: "Cada checkpoint: revisar cuello de botella, cerrar experimentos con muestra y recalcular el plan.",
      status: "active",
    },
  ];

  const checkpoints: string[] = [];
  for (let d = shiftIsoDate(input.today, 7); d <= input.deadline; d = shiftIsoDate(d, 7)) checkpoints.push(d);
  trace.push(`Checkpoints semanales: ${checkpoints.length}. Ventana de prospección hasta ${outreachEnd}.`);

  return { phases, checkpoints, trace };
}
