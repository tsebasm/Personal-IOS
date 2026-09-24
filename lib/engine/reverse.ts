import { daysBetween } from "@/lib/agencia/metrics";
import { monthsActiveSince } from "@/lib/agencia/billing";
import { shiftIsoDate } from "@/lib/date";
import type { ResolvedRate } from "./rates";

/**
 * Reverse engineering del embudo outbound:
 *   meta → cierres necesarios → citas asistidas → agendadas → respuestas → contactos
 * y de ahí a una cuota diaria dentro de la ventana en la que un contacto
 * nuevo todavía alcanza a cerrar antes del deadline. Todo puro y trazable:
 * cada número del resultado se explica en `trace`.
 */

export const FUNNEL_STAGES = ["reply", "booking", "show", "close"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export type FunnelRates = Record<FunnelStage, ResolvedRate>;

export const FUNNEL_STAGE_LABEL: Record<FunnelStage, string> = {
  reply: "Respuesta (respuestas ÷ contactos)",
  booking: "Agendamiento (citas ÷ respuestas)",
  show: "Asistencia (asistidas ÷ agendadas)",
  close: "Cierre (clientes ÷ asistidas)",
};

/** Oportunidades abiertas hoy (ni ganadas ni perdidas), por la última etapa alcanzada. */
export type PipelineSnapshot = { replied: number; booked: number; showed: number };

export type ReverseInput = {
  closesNeeded: number;
  rates: FunnelRates;
  pipeline: PipelineSnapshot;
  today: string;
  deadline: string;
  salesCycleDays: number | null;
  outreachDaysPerWeek: number | null;
  minutesPerContact: number | null;
};

export type StageVolume = { contacts: number; replies: number; booked: number; shows: number; closes: number };

export type ReverseResult =
  | {
      ok: false;
      missing: string[];
      /** Etapas con 0% medido con muestra suficiente: ningún volumen alcanza la meta hasta mejorarlas. */
      blocked: string[];
      trace: string[];
    }
  | {
      ok: true;
      /** Probabilidad de que un contacto nuevo termine en cliente. */
      pContactToClose: number;
      expectedFromPipeline: number;
      newClosesNeeded: number;
      /** Volumen para que el valor *esperado* de cierres alcance la meta. */
      volume: StageVolume;
      /** Contactos nuevos necesarios para alcanzar la meta con ~80% y ~90% de probabilidad. */
      contactsForConfidence: { p80: number; p90: number };
      /** Probabilidad de cumplir si se ejecuta exactamente `volume.contacts`. */
      probabilityAtExpectedVolume: number;
      outreachWindowEnd: string;
      outreachDays: number;
      windowClosed: boolean;
      dailyContacts: number | null;
      dailyMinutes: number | null;
      trace: string[];
    };

const LABEL: Record<FunnelStage, string> = {
  reply: "tasa de respuesta",
  booking: "tasa de agendamiento",
  show: "tasa de asistencia",
  close: "tasa de cierre",
};

/** P(X ≥ k) con X ~ Poisson(λ). Aproxima la suma de muchos intentos independientes de baja probabilidad. */
export function poissonAtLeast(k: number, lambda: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return 0;
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.min(1, Math.max(0, 1 - cdf));
}

/** Menor λ tal que P(X ≥ k) ≥ prob (bisección). */
export function lambdaForProbability(k: number, prob: number): number {
  if (k <= 0) return 0;
  let lo = 0;
  let hi = Math.max(1, k * 4);
  while (poissonAtLeast(k, hi) < prob) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (poissonAtLeast(k, mid) >= prob) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function reverseEngineer(input: ReverseInput): ReverseResult {
  const trace: string[] = [];
  const missing = FUNNEL_STAGES.filter((s) => input.rates[s].value === null).map((s) => LABEL[s]);
  if (input.salesCycleDays === null) missing.push("duración del ciclo de venta (días)");
  if (missing.length > 0) return { ok: false, missing, blocked: [], trace };

  const blocked = FUNNEL_STAGES.filter((s) => input.rates[s].value === 0).map(
    (s) => `${LABEL[s]} = 0% con n=${input.rates[s].n}`
  );
  if (blocked.length > 0) {
    trace.push("Con una etapa en 0% medido, más volumen no produce cierres: el cuello de botella es esa etapa, no la cantidad de contactos.");
    return { ok: false, missing: [], blocked, trace };
  }

  const r = {
    reply: input.rates.reply.value!,
    booking: input.rates.booking.value!,
    show: input.rates.show.value!,
    close: input.rates.close.value!,
  };
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  for (const s of FUNNEL_STAGES) {
    const rate = input.rates[s];
    trace.push(
      `${LABEL[s]} = ${pct(rate.value!)} [${rate.source}${rate.source === "historical" || rate.source === "historical_low_n" ? `, n=${rate.n}` : ""}]`
    );
  }

  const pContactToClose = r.reply * r.booking * r.show * r.close;
  trace.push(`P(contacto → cliente) = ${pct(r.reply)} × ${pct(r.booking)} × ${pct(r.show)} × ${pct(r.close)} = ${(pContactToClose * 100).toFixed(3)}%`);

  // Crédito del pipeline: cada oportunidad abierta vale el producto de las tasas que le faltan.
  const pFromReplied = r.booking * r.show * r.close;
  const pFromBooked = r.show * r.close;
  const pFromShowed = r.close;
  const expectedFromPipeline =
    input.pipeline.replied * pFromReplied + input.pipeline.booked * pFromBooked + input.pipeline.showed * pFromShowed;
  trace.push(
    `Pipeline abierto: ${input.pipeline.replied} con respuesta, ${input.pipeline.booked} agendadas, ${input.pipeline.showed} asistidas → ${expectedFromPipeline.toFixed(2)} cierres esperados`
  );

  const newClosesNeeded = Math.max(0, input.closesNeeded - expectedFromPipeline);
  const contacts = newClosesNeeded > 0 ? Math.ceil(newClosesNeeded / pContactToClose) : 0;
  const volume: StageVolume = {
    contacts,
    replies: Math.ceil(contacts * r.reply),
    booked: Math.ceil(contacts * r.reply * r.booking),
    shows: Math.ceil(contacts * r.reply * r.booking * r.show),
    closes: Math.round(newClosesNeeded * 100) / 100,
  };
  trace.push(`Cierres nuevos necesarios = ${input.closesNeeded} − ${expectedFromPipeline.toFixed(2)} = ${newClosesNeeded.toFixed(2)} → ${contacts} contactos nuevos`);

  const closesTarget = Math.ceil(input.closesNeeded);
  const contactsFor = (prob: number) =>
    Math.max(0, Math.ceil((lambdaForProbability(closesTarget, prob) - expectedFromPipeline) / pContactToClose));
  const contactsForConfidence = { p80: contactsFor(0.8), p90: contactsFor(0.9) };
  const probabilityAtExpectedVolume = poissonAtLeast(closesTarget, expectedFromPipeline + contacts * pContactToClose);
  trace.push(
    `Con ${contacts} contactos, P(≥${closesTarget} cierre${closesTarget === 1 ? "" : "s"}) ≈ ${(probabilityAtExpectedVolume * 100).toFixed(0)}% (Poisson). Para 80%: ${contactsForConfidence.p80}; para 90%: ${contactsForConfidence.p90}.`
  );

  // Ventana útil: un contacto hecho después de (deadline − ciclo) ya no alcanza a cerrar.
  const outreachWindowEnd = shiftIsoDate(input.deadline, -input.salesCycleDays!);
  const calendarDays = daysBetween(input.today, outreachWindowEnd) + 1;
  const perWeek = input.outreachDaysPerWeek ?? 7;
  if (input.outreachDaysPerWeek === null) trace.push("Días de prospección por semana no definidos: se asume 7 (SUPOSICIÓN).");
  const outreachDays = Math.max(0, Math.floor((calendarDays * perWeek) / 7));
  const windowClosed = outreachDays <= 0;
  trace.push(`Ventana de prospección: hasta ${outreachWindowEnd} (deadline − ${input.salesCycleDays} días de ciclo) = ${outreachDays} días de prospección`);

  const dailyContacts = windowClosed ? null : Math.ceil(contacts / outreachDays);
  const dailyMinutes =
    dailyContacts !== null && input.minutesPerContact !== null ? Math.ceil(dailyContacts * input.minutesPerContact) : null;
  if (windowClosed) trace.push("La ventana ya cerró: ningún contacto nuevo alcanza a cerrar antes del deadline con este ciclo de venta.");
  else trace.push(`Cuota diaria = ${contacts} ÷ ${outreachDays} = ${dailyContacts} contactos/día`);

  return {
    ok: true,
    pContactToClose,
    expectedFromPipeline,
    newClosesNeeded,
    volume,
    contactsForConfidence,
    probabilityAtExpectedVolume,
    outreachWindowEnd,
    outreachDays,
    windowClosed,
    dailyContacts,
    dailyMinutes,
    trace,
  };
}

/**
 * Facturación que aporta un cliente nuevo hasta el deadline: setup + fee
 * mensual × meses facturados (misma regla de meses que lib/agencia/billing.ts).
 */
export function revenuePerNewClient(input: {
  setupFee: number;
  monthlyFee: number;
  closeDate: string;
  deadline: string;
}): number {
  if (input.closeDate > input.deadline) return 0;
  return input.setupFee + input.monthlyFee * monthsActiveSince(input.closeDate, input.deadline);
}

/**
 * Fecha de cierre supuesta para planear: punto medio entre el primer cierre
 * posible (hoy + ciclo) y el deadline. Suponer que todos cierran pronto
 * inflaría el ingreso por cliente; suponer que todos cierran al final lo
 * subestimaría. Es SUPOSICIÓN y así se reporta en el trace.
 */
export function assumedCloseDate(today: string, deadline: string, salesCycleDays: number): string {
  const earliest = shiftIsoDate(today, salesCycleDays);
  if (earliest >= deadline) return deadline;
  return shiftIsoDate(earliest, Math.floor(daysBetween(earliest, deadline) / 2));
}

/** Sensibilidad: cuota diaria si una tasa fuera `multiplier` veces su valor actual. */
export function sensitivity(
  input: ReverseInput,
  stage: FunnelStage,
  multipliers: number[]
): { multiplier: number; rate: number | null; dailyContacts: number | null; contacts: number | null }[] {
  return multipliers.map((m) => {
    const base = input.rates[stage];
    if (base.value === null) return { multiplier: m, rate: null, dailyContacts: null, contacts: null };
    const rate = Math.min(1, base.value * m);
    const res = reverseEngineer({ ...input, rates: { ...input.rates, [stage]: { ...base, value: rate } } });
    return {
      multiplier: m,
      rate,
      dailyContacts: res.ok ? res.dailyContacts : null,
      contacts: res.ok ? res.volume.contacts : null,
    };
  });
}
