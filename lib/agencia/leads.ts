/** Vocabulario de leads compartido entre acciones, loaders y formularios. */

export const LEAD_STAGES = ["contacted", "replied", "booked", "showed", "proposal", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  contacted: "Contactado",
  replied: "Respondió",
  booked: "Cita agendada",
  showed: "Asistió",
  proposal: "Propuesta enviada",
  won: "Ganado",
  lost: "Perdido",
};

export const OPEN_STAGES: LeadStage[] = ["contacted", "replied", "booked", "showed", "proposal"];

export type Lead = {
  id: string;
  name: string;
  company: string | null;
  channel: string | null;
  hypothesis_id: string | null;
  stage: LeadStage;
  stage_changed_at: string;
  next_followup_on: string | null;
  followups_done: number;
  est_value: number | null;
  lost_reason: string | null;
  notes: string | null;
};

export const LEAD_COLUMNS =
  "id, name, company, channel, hypothesis_id, stage, stage_changed_at, next_followup_on, followups_done, est_value, lost_reason, notes";

/**
 * Pipeline abierto por última etapa alcanzada, en la forma que usa el motor
 * de reverse engineering. 'proposal' cuenta como 'showed' (ya asistió; falta
 * la decisión) — misma probabilidad restante: la tasa de cierre.
 */
export function pipelineFromLeads(leads: Pick<Lead, "stage">[]): { replied: number; booked: number; showed: number } {
  let replied = 0;
  let booked = 0;
  let showed = 0;
  for (const l of leads) {
    if (l.stage === "replied") replied++;
    else if (l.stage === "booked") booked++;
    else if (l.stage === "showed" || l.stage === "proposal") showed++;
  }
  return { replied, booked, showed };
}

/** Leads abiertos con follow-up vencido o para hoy. */
export function followupsDue<T extends Pick<Lead, "stage" | "next_followup_on">>(leads: T[], today: string): T[] {
  return leads.filter((l) => OPEN_STAGES.includes(l.stage) && l.next_followup_on !== null && l.next_followup_on <= today);
}
