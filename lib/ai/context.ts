import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Todo lo que el asistente puede ver de este usuario, tal cual está en
 * Supabase — sin interpretar, sin rellenar huecos. `buildContextPrompt`
 * decide después qué decir cuando una sección viene vacía.
 */
export type MasterContext = {
  profile: { fullName: string | null; timezone: string };
  vision: { statement: string | null; principles: unknown; core_values: unknown; avoid: unknown } | null;
  areas: { id: string; name: string }[];
  goals: {
    id: string;
    title: string;
    description: string | null;
    area_id: string | null;
    parent_goal_id: string | null;
    horizon: string;
    kind: string;
    unit: string | null;
    target_value: number | null;
    current_value: number | null;
    deadline: string | null;
    priority: string;
    status: string;
  }[];
  agencia: {
    vantGoalId: string | null;
    campaigns: {
      name: string;
      status: string;
      spend: number;
      leads: number;
      qualified_leads: number;
      calls_scheduled: number;
      calls_attended: number;
      calls_goal: number | null;
    }[];
    prospectingSessions: {
      date: string;
      channel: string;
      contacts_count: number;
      replies_count: number;
      appointments_count: number;
      clients_closed: number;
    }[];
    clients: { name: string; status: string; monthly_fee: number }[];
  };
  habits: { title: string; frequency: string; is_active: boolean }[];
  tasksToday: { title: string; status: string; priority: string }[];
  recentReviews: { type: string; period_start: string; period_end: string }[];
};

/**
 * Lee el estado real del usuario en Supabase — nada más. No llama a la IA,
 * no infiere nada; eso pasa después, en el prompt (lib/ai/prompt.ts), donde
 * cada afirmación del modelo tiene que poder señalar a algo de aquí.
 */
export async function buildMasterContext(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  fullName: string | null
): Promise<MasterContext> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD

  const [
    visionRes,
    areasRes,
    goalsRes,
    agenciaSettingsRes,
    campaignsRes,
    prospectingRes,
    clientsRes,
    habitsRes,
    tasksTodayRes,
    reviewsRes,
  ] = await Promise.all([
    supabase.from("vision").select("statement, principles, core_values, avoid").eq("user_id", userId).maybeSingle(),
    supabase.from("areas").select("id, name").order("sort_order", { ascending: true }),
    supabase
      .from("goals")
      .select(
        "id, title, description, area_id, parent_goal_id, horizon, kind, unit, target_value, current_value, deadline, priority, status"
      )
      .neq("status", "cancelado")
      .order("deadline", { ascending: true, nullsFirst: false }),
    supabase.from("agencia_settings").select("vant_goal_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("campaigns")
      .select("name, status, spend, leads, qualified_leads, calls_scheduled, calls_attended, calls_goal")
      .order("start_date", { ascending: false })
      .limit(10),
    supabase
      .from("prospecting_sessions")
      .select("date, channel, contacts_count, replies_count, appointments_count, clients_closed")
      .order("date", { ascending: false })
      .limit(10),
    supabase.from("vant_clients").select("name, status, monthly_fee"),
    supabase.from("habits").select("title, frequency, is_active").eq("is_active", true),
    supabase.from("tasks").select("title, status, priority").eq("scheduled_date", today).neq("status", "cancelled"),
    supabase
      .from("reviews")
      .select("type, period_start, period_end")
      .order("period_start", { ascending: false })
      .limit(5),
  ]);

  return {
    profile: { fullName, timezone },
    vision: visionRes.data ?? null,
    areas: areasRes.data ?? [],
    goals: goalsRes.data ?? [],
    agencia: {
      vantGoalId: agenciaSettingsRes.data?.vant_goal_id ?? null,
      campaigns: campaignsRes.data ?? [],
      prospectingSessions: prospectingRes.data ?? [],
      clients: clientsRes.data ?? [],
    },
    habits: habitsRes.data ?? [],
    tasksToday: tasksTodayRes.data ?? [],
    recentReviews: reviewsRes.data ?? [],
  };
}
