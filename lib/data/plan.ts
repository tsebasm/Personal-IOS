import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isoDateInTimezone } from "@/lib/date";
import { computeBillingSummary, type VantClient } from "@/lib/agencia/billing";
import { sumProspectingTotals, type ProspectingTotals } from "@/lib/agencia/metrics";
import {
  parseAssumptions,
  parsePipelineSnapshot,
  type FunnelAssumptions,
  type PipelineSnapshotSettings,
} from "@/lib/agencia/plan-settings";
import { buildPlan, type Plan } from "@/lib/engine/plan";
import { followupsDue, pipelineFromLeads, type LeadStage } from "@/lib/agencia/leads";
import { detectBottleneck, type BottleneckResult } from "@/lib/engine/bottleneck";
import { buildPlanPhases, type PlanPhases } from "@/lib/engine/plan30";
import { outreachDaysIn } from "@/lib/engine/allocation";
import { METRICS } from "@/lib/engine/metrics-registry";
import { shiftIsoDate } from "@/lib/date";
import { daysBetween } from "@/lib/agencia/metrics";
import { getCurrentProfile } from "./profile";

export type PlanContext = {
  today: string;
  /** De dónde salió la meta que se planea. */
  goalSource: "north_star" | "vant_goal" | null;
  plan: Plan | null;
  assumptions: FunnelAssumptions;
  pipeline: PipelineSnapshotSettings;
  /** De dónde sale el pipeline: la tabla leads (si hay) o la foto manual. */
  pipelineSource: "leads" | "manual";
  overdueFollowups: number;
  totals: ProspectingTotals;
  bottleneck: BottleneckResult;
  phases: PlanPhases | null;
  dailyOutreachOverride: number | null;
  /** Meta diaria efectiva: override manual si existe, si no la calculada. */
  dailyOutreachTarget: { value: number; source: "manual" | "calculated" } | null;
};

/**
 * Trae lo que necesita el motor de plan y lo ejecuta. Solo I/O: toda la
 * lógica numérica está en lib/engine/plan.ts. Cacheado por request para
 * que /dashboard y /dashboard/plan no repitan consultas si se combinan.
 *
 * Meta planeada: la North Star si existe; si no, la meta de facturación
 * vinculada a VANT.
 */
export const loadPlanContext = cache(async (): Promise<PlanContext | null> => {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const today = isoDateInTimezone(profile.timezone);

  const [{ data: profileRow }, { data: settings }, { data: sessions }, { data: clientsData }, { data: leadsData }, { data: hypothesesData }] =
    await Promise.all([
    supabase.from("profiles").select("north_star_goal_id").eq("id", profile.userId).maybeSingle(),
    supabase
      .from("agencia_settings")
      .select("vant_goal_id, daily_outreach_target, funnel_assumptions, pipeline_snapshot")
      .maybeSingle(),
    supabase
      .from("prospecting_sessions")
      .select(
        "date, hypothesis_id, contacts_count, replies_count, appointments_count, shows_count, proposals_count, followups_count, clients_closed, minutes_spent"
      ),
    supabase
      .from("vant_clients")
      .select(
        "id, name, start_date, status, setup_fee, commission_type, commission_value, monthly_fee, additional_commission, ad_spend, paused_at, cancelled_at"
      ),
    supabase.from("leads").select("stage, next_followup_on"),
    supabase.from("hypotheses").select("id, type, status").in("type", ["niche", "offer", "market"]),
  ]);

  const assumptions = parseAssumptions(settings?.funnel_assumptions);
  const leads = (leadsData ?? []) as { stage: LeadStage; next_followup_on: string | null }[];
  // Con leads registrados, el pipeline es el real; la foto manual queda como respaldo.
  const pipelineSource: PlanContext["pipelineSource"] = leads.length > 0 ? "leads" : "manual";
  const pipeline: PipelineSnapshotSettings =
    pipelineSource === "leads" ? { ...pipelineFromLeads(leads), as_of: today } : parsePipelineSnapshot(settings?.pipeline_snapshot);
  const overdueFollowups = followupsDue(leads, today).length;
  const totals = sumProspectingTotals(sessions ?? []);
  const vantGoalId = settings?.vant_goal_id ?? null;
  const northStarId = profileRow?.north_star_goal_id ?? null;
  const goalId = northStarId ?? vantGoalId;
  const dailyOutreachOverride = settings?.daily_outreach_target ?? null;

  const base = { today, assumptions, pipeline, pipelineSource, overdueFollowups, totals, dailyOutreachOverride };
  const sessionRows = sessions ?? [];
  const inRange = (from: string, to: string) => sumProspectingTotals(sessionRows.filter((x) => x.date >= from && x.date <= to));
  const week = inRange(shiftIsoDate(today, -6), today);
  const prevWeek = inRange(shiftIsoDate(today, -13), shiftIsoDate(today, -7));
  const hyps = hypothesesData ?? [];
  // Días de la ventana en que ya se prospectaba: no se exige volumen de antes de empezar.
  const firstSession = sessionRows.reduce<string | null>((min, x) => (!min || x.date < min ? x.date : min), null);
  const windowStart = shiftIsoDate(today, -6);
  const activeDays = firstSession ? daysBetween(firstSession > windowStart ? firstSession : windowStart, today) + 1 : 0;
  const testingIds = new Set(hyps.filter((h) => h.status === "testing").map((h) => h.id));
  const withTarget = (plan: Plan | null, goalSource: PlanContext["goalSource"]): PlanContext => {
    const calculated = plan?.reverse?.ok ? plan.reverse.dailyContacts : null;
    const ref = (v: number | null) => (v === null ? null : v / 100);
    const bottleneck = detectBottleneck({
      current: week,
      previous: prevWeek.contacts > 0 ? prevWeek : null,
      reference: {
        reply: ref(assumptions.reply_rate),
        booking: ref(assumptions.booking_rate),
        show: ref(assumptions.show_rate),
        close: ref(assumptions.close_rate),
      },
      requiredContacts:
        calculated !== null && activeDays > 0 ? calculated * outreachDaysIn(activeDays, assumptions.outreach_days_per_week) : null,
      overdueFollowups,
    });
    const phases =
      plan?.goal.deadline && assumptions.sales_cycle_days !== null
        ? buildPlanPhases({
            today,
            deadline: plan.goal.deadline,
            salesCycleDays: assumptions.sales_cycle_days,
            hasValidatedHypothesis: hyps.some((h) => h.status === "validated"),
            testingHypotheses: testingIds.size,
            attributedContacts: sumProspectingTotals(sessionRows.filter((x) => x.hypothesis_id && testingIds.has(x.hypothesis_id))).contacts,
            minSamplePerHypothesis: METRICS.reply_rate.minSample!,
            dailyContacts: calculated,
            hasPipelineToConvert: pipeline.booked + pipeline.showed > 0,
          })
        : null;
    return {
      ...base,
      bottleneck,
      phases,
      goalSource,
      plan,
      dailyOutreachTarget:
        dailyOutreachOverride !== null
          ? { value: dailyOutreachOverride, source: "manual" }
          : calculated !== null
            ? { value: calculated, source: "calculated" }
            : null,
    };
  };

  if (!goalId) return withTarget(null, null);

  const { data: goal } = await supabase
    .from("goals")
    .select("id, title, unit, baseline_value, target_value, current_value, start_date, deadline")
    .eq("id", goalId)
    .maybeSingle();
  if (!goal) return withTarget(null, null);

  const clients: VantClient[] = (clientsData ?? []).map((c) => ({
    ...c,
    setup_fee: Number(c.setup_fee),
    commission_value: Number(c.commission_value),
    monthly_fee: Number(c.monthly_fee),
    additional_commission: Number(c.additional_commission),
    ad_spend: Number(c.ad_spend),
  }));

  const plan = buildPlan({
    today,
    goal: {
      ...goal,
      baseline_value: goal.baseline_value !== null ? Number(goal.baseline_value) : null,
      target_value: goal.target_value !== null ? Number(goal.target_value) : null,
      current_value: goal.current_value !== null ? Number(goal.current_value) : null,
    },
    isVantRevenueGoal: goal.id === vantGoalId,
    revenueCumulative: computeBillingSummary(clients, today).totalRevenue,
    totals,
    assumptions,
    pipeline,
  });

  return withTarget(plan, northStarId ? "north_star" : "vant_goal");
});
