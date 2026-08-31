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
  closingRate: number | null; // %
};

export function computeProspectingRates(t: {
  contacts: number;
  replies: number;
  appointments: number;
  closed: number;
}): ProspectingRates {
  return {
    replyRate: safePercent(t.replies, t.contacts),
    schedulingRate: safePercent(t.appointments, t.replies),
    closingRate: safePercent(t.closed, t.appointments),
  };
}

export function sumProspectingTotals(
  sessions: { contacts_count: number; replies_count: number; appointments_count: number; clients_closed: number }[]
) {
  return sessions.reduce(
    (acc, s) => ({
      contacts: acc.contacts + s.contacts_count,
      replies: acc.replies + s.replies_count,
      appointments: acc.appointments + s.appointments_count,
      closed: acc.closed + s.clients_closed,
    }),
    { contacts: 0, replies: 0, appointments: 0, closed: 0 }
  );
}
