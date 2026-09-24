/** Vocabulario de hipótesis compartido entre la acción (servidor) y los formularios (cliente). */

export const HYPOTHESIS_TYPES = ["niche", "market", "offer", "message", "channel", "volume", "other"] as const;
export const HYPOTHESIS_STATUSES = ["untested", "testing", "validated", "rejected"] as const;

export type HypothesisType = (typeof HYPOTHESIS_TYPES)[number];
export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];

export const HYPOTHESIS_TYPE_LABEL: Record<HypothesisType, string> = {
  niche: "Nicho",
  market: "Mercado",
  offer: "Oferta",
  message: "Mensaje",
  channel: "Canal",
  volume: "Volumen",
  other: "Otra",
};

export const HYPOTHESIS_STATUS_LABEL: Record<HypothesisStatus, string> = {
  untested: "Sin probar",
  testing: "En prueba",
  validated: "Validada",
  rejected: "Rechazada",
};

export type Hypothesis = {
  id: string;
  type: HypothesisType;
  statement: string;
  market: string | null;
  icp: string | null;
  problem: string | null;
  channel: string | null;
  urgency: number | null;
  ability_to_pay: number | null;
  competition: number | null;
  offer_potential: number | null;
  confidence: number | null;
  evidence: string | null;
  source: string | null;
  status: HypothesisStatus;
  superseded_by: string | null;
};

export const HYPOTHESIS_COLUMNS =
  "id, type, statement, market, icp, problem, channel, urgency, ability_to_pay, competition, offer_potential, confidence, evidence, source, status, superseded_by";
