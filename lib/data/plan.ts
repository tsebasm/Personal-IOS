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
import { getCurrentProfile } from "./profile";

export type PlanContext = {
  today: string;
  /** De dónde salió la meta que se planea. */
  goalSource: "north_star" | "vant_goal" | null;
  plan: Plan | null;
  assumptions: FunnelAssumptions;
  pipeline: PipelineSnapshotSettings;
  totals: ProspectingTotals;
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

  const [{ data: profileRow }, { data: settings }, { data: sessions }, { data: clientsData }] = await Promise.all([
    supabase.from("profiles").select("north_star_goal_id").eq("id", profile.userId).maybeSingle(),
    supabase
      .from("agencia_settings")
      .select("vant_goal_id, daily_outreach_target, funnel_assumptions, pipeline_snapshot")
      .maybeSingle(),
    supabase
      .from("prospecting_sessions")
      .select(
        "contacts_count, replies_count, appointments_count, shows_count, proposals_count, followups_count, clients_closed, minutes_spent"
      ),
    supabase
      .from("vant_clients")
      .select(
        "id, name, start_date, status, setup_fee, commission_type, commission_value, monthly_fee, additional_commission, ad_spend, paused_at, cancelled_at"
      ),
  ]);

  const assumptions = parseAssumptions(settings?.funnel_assumptions);
  const pipeline = parsePipelineSnapshot(settings?.pipeline_snapshot);
  const totals = sumProspectingTotals(sessions ?? []);
  const vantGoalId = settings?.vant_goal_id ?? null;
  const northStarId = profileRow?.north_star_goal_id ?? null;
  const goalId = northStarId ?? vantGoalId;
  const dailyOutreachOverride = settings?.daily_outreach_target ?? null;

  const base = { today, assumptions, pipeline, totals, dailyOutreachOverride };
  const withTarget = (plan: Plan | null, goalSource: PlanContext["goalSource"]): PlanContext => {
    const calculated = plan?.reverse?.ok ? plan.reverse.dailyContacts : null;
    return {
      ...base,
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
