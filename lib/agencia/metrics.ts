/** División segura: evita NaN/Infinity cuando el denominador es 0 o inválido. */
export function safeRatio(numerator: number, denominator: number): number | null {
  if (!denominator || !Number.isFinite(denominator) || !Number.isFinite(numerator)) return null;
  return numerator / denominator;
}

export function safePercent(numerator: number, denominator: number): number | null {
  const ratio = safeRatio(numerator, denominator);
  return ratio === null ? null : ratio * 100;
}

export type CampaignTotals = {
  spend: number;
  leads: number;
  qualifiedLeads: number;
  formsCompleted: number;
  callsScheduled: number;
  callsAttended: number;
  callsTotalAccumulated: number;
  callsGoal: number;
};

export type CampaignRates = {
  cpl: number | null;
  qualificationRate: number | null; // %
  schedulingRate: number | null; // %
  attendanceRate: number | null; // %
};

export function computeCampaignRates(t: {
  spend: number;
  leads: number;
  qualifiedLeads: number;
  callsScheduled: number;
  callsAttended: number;
}): CampaignRates {
  return {
    cpl: safeRatio(t.spend, t.leads),
    qualificationRate: safePercent(t.qualifiedLeads, t.leads),
    schedulingRate: safePercent(t.callsScheduled, t.qualifiedLeads),
    attendanceRate: safePercent(t.callsAttended, t.callsScheduled),
  };
}

export function sumCampaignTotals(
  campaigns: {
    spend: number;
    leads: number;
    qualified_leads: number;
    forms_completed: number;
    calls_scheduled: number;
    calls_attended: number;
    calls_total_accumulated: number;
    calls_goal: number | null;
  }[]
): CampaignTotals {
  return campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + Number(c.spend),
      leads: acc.leads + c.leads,
      qualifiedLeads: acc.qualifiedLeads + c.qualified_leads,
      formsCompleted: acc.formsCompleted + c.forms_completed,
      callsScheduled: acc.callsScheduled + c.calls_scheduled,
      callsAttended: acc.callsAttended + c.calls_attended,
      callsTotalAccumulated: acc.callsTotalAccumulated + c.calls_total_accumulated,
      callsGoal: acc.callsGoal + (c.calls_goal ?? 0),
    }),
    {
      spend: 0,
      leads: 0,
      qualifiedLeads: 0,
      formsCompleted: 0,
      callsScheduled: 0,
      callsAttended: 0,
      callsTotalAccumulated: 0,
      callsGoal: 0,
    }
  );
}

export type ProspectingRates = {
  replyRate: number | null; // %
  schedulingRate: number | null; // %
  showRate: number | null; // %
  closingRate: number | null; // %
};

/**
 * Tasas del embudo outbound (definiciones en lib/engine/metrics-registry.ts).
 * El cierre se mide sobre citas *asistidas*; si nunca se registró asistencia
 * (sesiones anteriores a 0011), cae a citas agendadas para no perder el dato.
 */
export function computeProspectingRates(t: {
  contacts: number;
  replies: number;
  appointments: number;
  shows?: number;
  closed: number;
}): ProspectingRates {
  const shows = t.shows ?? 0;
  return {
    replyRate: safePercent(t.replies, t.contacts),
    schedulingRate: safePercent(t.appointments, t.replies),
    showRate: shows > 0 ? safePercent(shows, t.appointments) : null,
    closingRate: safePercent(t.closed, shows > 0 ? shows : t.appointments),
  };
}

export type ProspectingTotals = {
  contacts: number;
  replies: number;
  appointments: number;
  shows: number;
  proposals: number;
  followups: number;
  closed: number;
  minutes: number;
};

export function sumProspectingTotals(
  sessions: {
    contacts_count: number;
    replies_count: number;
    appointments_count: number;
    clients_closed: number;
    shows_count?: number | null;
    proposals_count?: number | null;
    followups_count?: number | null;
    minutes_spent?: number | null;
  }[]
): ProspectingTotals {
  return sessions.reduce<ProspectingTotals>(
    (acc, s) => ({
      contacts: acc.contacts + s.contacts_count,
      replies: acc.replies + s.replies_count,
      appointments: acc.appointments + s.appointments_count,
      shows: acc.shows + (s.shows_count ?? 0),
      proposals: acc.proposals + (s.proposals_count ?? 0),
      followups: acc.followups + (s.followups_count ?? 0),
      closed: acc.closed + s.clients_closed,
      minutes: acc.minutes + (s.minutes_spent ?? 0),
    }),
    { contacts: 0, replies: 0, appointments: 0, shows: 0, proposals: 0, followups: 0, closed: 0, minutes: 0 }
  );
}

export type VantMilestoneGoal = {
  id: string;
  title: string;
  parent_goal_id: string | null;
  status: string;
  deadline: string | null;
};

/**
 * La sub-meta activa de VANT (hija de la meta de facturación vinculada) con
 * el vencimiento más próximo — el "qué sigue" concreto camino a la meta
 * grande. No es una tabla aparte: se deriva de `goals` en cada carga.
 */
export function nextVantMilestone(goals: VantMilestoneGoal[], vantGoalId: string | null): VantMilestoneGoal | null {
  if (!vantGoalId) return null;
  const children = goals.filter((g) => g.parent_goal_id === vantGoalId && g.status === "activo" && g.deadline);
  if (children.length === 0) return null;
  return [...children].sort((a, b) => (a.deadline! < b.deadline! ? -1 : a.deadline! > b.deadline! ? 1 : 0))[0];
}

/** Días entre dos fechas "YYYY-MM-DD" (positivo si `deadline` es futuro respecto a `today`). */
export function daysBetween(today: string, deadline: string): number {
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = deadline.split("-").map(Number);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / msPerDay);
}
