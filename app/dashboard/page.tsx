import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  ListTodo,
  FolderKanban,
  Repeat,
  BarChart2,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isoDateInTimezone, shiftIsoDate, friendlyDate } from "@/lib/date";
import { computeStreak } from "@/lib/metrics";
import {
  computeProspectingRates,
  sumProspectingTotals,
  nextVantMilestone,
  daysBetween,
  type VantMilestoneGoal,
} from "@/lib/agencia/metrics";
import { computeBillingSummary, type VantClient } from "@/lib/agencia/billing";
import { goalProgressPct } from "@/lib/engine/metrics-registry";
import { money, pct } from "@/lib/format";
import { loadPlanContext } from "@/lib/data/plan";
import { loadTodayContext } from "@/lib/data/today";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";


const PRIORITY_TONE: Record<string, "bad" | "warn" | "neutral"> = {
  alta: "bad",
  media: "warn",
  baja: "neutral",
};
const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type TaskRow = {
  id: string;
  title: string;
  priority: string;
  status: string;
  deadline: string | null;
  scheduled_date: string | null;
  project_id: string | null;
  estimated_minutes: number | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, timezone")
    .eq("id", user!.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? "America/Bogota";
  const today = isoDateInTimezone(timezone);
  const weekStart = shiftIsoDate(today, -6);
  const habitLogStart = shiftIsoDate(today, -35);
  const calendarWindowStart = `${shiftIsoDate(today, -1)}T00:00:00.000Z`;
  const calendarWindowEnd = `${shiftIsoDate(today, 2)}T00:00:00.000Z`;

  let loadError = false;
  let tasksToday: TaskRow[] = [];
  let priorityCandidates: TaskRow[] = [];
  let weekTasks: { scheduled_date: string; status: string }[] = [];
  let activeProjects: {
    id: string;
    title: string;
    description: string | null;
    deadline: string | null;
  }[] = [];
  let habits: { id: string; title: string }[] = [];
  let habitLogs: { habit_id: string; date: string; done: boolean }[] = [];
  let calendarEvents: { id: string; title: string; starts_at: string }[] = [];
  let projectTaskStats: { project_id: string | null; status: string }[] = [];

  try {
    const [
      { data: tasksTodayData, error: e1 },
      { data: priorityData, error: e2 },
      { data: weekData, error: e3 },
      { data: projectsData, error: e4 },
      { data: habitsData, error: e5 },
      { data: habitLogsData, error: e6 },
      { data: calendarData, error: e7 },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, priority, status, deadline, scheduled_date, project_id, estimated_minutes")
        .eq("scheduled_date", today),
      supabase
        .from("tasks")
        .select("id, title, priority, status, deadline, scheduled_date, project_id, estimated_minutes")
        .not("status", "in", "(done,cancelled)")
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(30),
      supabase
        .from("tasks")
        .select("scheduled_date, status")
        .gte("scheduled_date", weekStart)
        .lte("scheduled_date", today),
      supabase
        .from("projects")
        .select("id, title, description, deadline")
        .eq("status", "activo")
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(4),
      supabase.from("habits").select("id, title").eq("is_active", true).order("created_at"),
      supabase
        .from("habit_logs")
        .select("habit_id, date, done")
        .gte("date", habitLogStart)
        .lte("date", today),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at")
        .gte("starts_at", calendarWindowStart)
        .lt("starts_at", calendarWindowEnd)
        .order("starts_at"),
    ]);

    const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7;
    if (firstError) throw firstError;

    tasksToday = tasksTodayData ?? [];
    priorityCandidates = priorityData ?? [];
    weekTasks = weekData ?? [];
    activeProjects = projectsData ?? [];
    habits = habitsData ?? [];
    habitLogs = habitLogsData ?? [];
    calendarEvents = (calendarData ?? []).filter(
      (ev) => isoDateInTimezone(timezone, new Date(ev.starts_at)) === today
    );

    if (activeProjects.length > 0) {
      const { data: statsData, error: e8 } = await supabase
        .from("tasks")
        .select("project_id, status")
        .in("project_id", activeProjects.map((p) => p.id));
      if (e8) throw e8;
      projectTaskStats = statsData ?? [];
    }
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <Card className="max-w-sm w-full px-6 py-8 text-center">
          <p className="text-sm font-medium text-ink mb-1">No pudimos cargar tus datos.</p>
          <p className="text-xs text-ink-dim mb-4">Revisa tu conexión e inténtalo de nuevo.</p>
          <Link
            href="/dashboard"
            className="inline-flex text-sm font-medium text-ink underline underline-offset-2"
          >
            Reintentar
          </Link>
        </Card>
      </main>
    );
  }

  let vantData: {
    goalTitle: string | null;
    goalDeadline: string | null;
    targetValue: number | null;
    baselineValue: number | null;
    revenue: number;
    milestone: VantMilestoneGoal | null;
    dailyTarget: { value: number; source: "manual" | "calculated" } | null;
    contactsToday: number;
    rates: ReturnType<typeof computeProspectingRates>;
  } | null = null;

  try {
    const thirtyDaysAgo = shiftIsoDate(today, -30);
    const [{ data: settings }, { data: goalsData }, { data: sessionsData }, { data: clientsData }] =
      await Promise.all([
        supabase.from("agencia_settings").select("vant_goal_id").maybeSingle(),
        supabase.from("goals").select("id, title, parent_goal_id, status, deadline, target_value, baseline_value"),
        supabase
          .from("prospecting_sessions")
          .select("date, contacts_count, replies_count, appointments_count, clients_closed")
          .gte("date", thirtyDaysAgo)
          .lte("date", today),
        supabase
          .from("vant_clients")
          .select(
            "id, name, start_date, status, setup_fee, commission_type, commission_value, monthly_fee, additional_commission, ad_spend, paused_at, cancelled_at"
          ),
      ]);

    const vantGoalId = settings?.vant_goal_id ?? null;
    if (vantGoalId) {
      const goalsList = goalsData ?? [];
      const vantGoal = goalsList.find((g) => g.id === vantGoalId) ?? null;
      const sessions = sessionsData ?? [];
      const clients: VantClient[] = (clientsData ?? []).map((c) => ({
        ...c,
        setup_fee: Number(c.setup_fee),
        commission_value: Number(c.commission_value),
        monthly_fee: Number(c.monthly_fee),
        additional_commission: Number(c.additional_commission),
        ad_spend: Number(c.ad_spend),
      }));

      vantData = {
        goalTitle: vantGoal?.title ?? null,
        goalDeadline: vantGoal?.deadline ?? null,
        targetValue: vantGoal?.target_value ?? null,
        baselineValue: vantGoal?.baseline_value ?? null,
        // La meta de VANT se mide en facturación acumulada (metrics-registry: revenue_cumulative),
        // la misma definición que usa /dashboard/agencia.
        revenue: computeBillingSummary(clients, today).totalRevenue,
        milestone: nextVantMilestone(goalsList, vantGoalId),
        // Override manual de Agencia si existe; si no, la cuota que calcula el plan (Fase 2).
        dailyTarget: (await loadPlanContext())?.dailyOutreachTarget ?? null,
        contactsToday: sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.contacts_count, 0),
        rates: computeProspectingRates(sumProspectingTotals(sessions)),
      };
    }
  } catch {
    vantData = null;
  }

  const firstName = (profile?.full_name ?? user?.email?.split("@")[0] ?? "").split(" ")[0];
  const fecha = friendlyDate(timezone);

  const completedToday = tasksToday.filter((t) => t.status === "done").length;
  const totalToday = tasksToday.length;
  const productivityPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : null;
  const focusMinutes = tasksToday
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);
  const focusHours = Math.floor(focusMinutes / 60);
  const focusRestMinutes = focusMinutes % 60;

  const habitLogsByHabit = new Map<string, Set<string>>();
  for (const log of habitLogs) {
    if (!log.done) continue;
    if (!habitLogsByHabit.has(log.habit_id)) habitLogsByHabit.set(log.habit_id, new Set());
    habitLogsByHabit.get(log.habit_id)!.add(log.date);
  }
  const habitStreaks = habits.map((h) => computeStreak(habitLogsByHabit.get(h.id) ?? new Set(), today));
  const bestStreak = habitStreaks.length > 0 ? Math.max(...habitStreaks) : null;

  const hasAnyData =
    priorityCandidates.length > 0 ||
    activeProjects.length > 0 ||
    habits.length > 0 ||
    calendarEvents.length > 0 ||
    weekTasks.length > 0;

  // Mismo motor que /dashboard/today (lib/engine/priority.ts): una sola lógica de prioridad.
  const priorityTasks = (await loadTodayContext())?.ranking.top ?? [];

  const weekDays = Array.from({ length: 7 }, (_, i) => shiftIsoDate(weekStart, i));
  const weeklyProgress = weekDays.map((day) => {
    const dayTasks = weekTasks.filter((t) => t.scheduled_date === day);
    const done = dayTasks.filter((t) => t.status === "done").length;
    const pct = dayTasks.length > 0 ? Math.round((done / dayTasks.length) * 100) : 0;
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    return { day, label: WEEKDAY_SHORT[weekday], pct, hasTasks: dayTasks.length > 0 };
  });

  const projectProgress = new Map<string, { total: number; done: number }>();
  for (const t of projectTaskStats) {
    if (!t.project_id) continue;
    const entry = projectProgress.get(t.project_id) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (t.status === "done") entry.done += 1;
    projectProgress.set(t.project_id, entry);
  }

  type AgendaItem = { id: string; title: string; time: string | null; tone: "ink" | "bad" | "warn" | "neutral" };
  const agendaItems: AgendaItem[] = [
    ...calendarEvents.map((ev) => ({
      id: ev.id,
      title: ev.title,
      time: new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(
        new Date(ev.starts_at)
      ),
      tone: "ink" as const,
    })),
    ...tasksToday
      .filter((t) => t.status !== "done" && t.status !== "cancelled")
      .map((t) => ({
        id: t.id,
        title: t.title,
        time: null,
        tone: PRIORITY_TONE[t.priority] ?? "neutral",
      })),
  ];

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-6xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Buenos días, {firstName} 👋</h1>
        <p className="text-sm text-ink-dim mt-1 capitalize">{fecha} · Enfócate en lo que realmente importa hoy.</p>
      </div>

      {!hasAnyData ? (
        <Card className="px-6 py-10 text-center mb-6">
          <p className="text-sm font-medium text-ink">
            Comienza a usar Personal OS para generar tus primeras métricas.
          </p>
          <p className="text-xs text-ink-dim mt-1">
            Crea una tarea, un proyecto o un hábito y este panel empezará a llenarse.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            icon={<TrendingUp size={16} />}
            label="Productividad diaria"
            value={productivityPct !== null ? `${productivityPct}%` : "—"}
            hint={productivityPct === null ? "Sin tareas hoy" : undefined}
          />
          <MetricCard
            icon={<CheckCircle2 size={16} />}
            label="Tareas completadas"
            value={`${completedToday} / ${totalToday}`}
            hint={totalToday === 0 ? "Sin tareas hoy" : undefined}
          />
          <MetricCard
            icon={<Clock size={16} />}
            label="Tiempo enfocado"
            value={focusMinutes > 0 ? `${focusHours}h ${focusRestMinutes}m` : "—"}
            hint={focusMinutes === 0 ? "Aún no hay registros" : undefined}
          />
          <MetricCard
            icon={<Flame size={16} />}
            label="Racha de hábitos"
            value={bestStreak !== null ? `${bestStreak} días` : "—"}
            hint={habits.length === 0 ? "Sin hábitos activos" : undefined}
          />
        </div>
      )}

      {vantData && (
        <Card className="mb-6">
          <CardHeader
            title={vantData.goalDeadline ? `VANT — meta al ${vantData.goalDeadline}` : "VANT"}
            icon={<Target size={16} className="text-ink-dim" />}
          />
          <div className="px-5 pb-5">
            {vantData.targetValue ? (
              <>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs text-ink-dim truncate">{vantData.goalTitle ?? "Facturación acumulada"}</span>
                  <span className="text-sm font-semibold text-ink tabular-nums flex-none">
                    {money(vantData.revenue)} / {money(vantData.targetValue)}
                  </span>
                </div>
                <ProgressBar
                  value={goalProgressPct(vantData.revenue, vantData.targetValue, vantData.baselineValue) ?? 0}
                  className="mb-4"
                />
              </>
            ) : (
              <p className="text-xs text-ink-dim mb-4">
                Vincula una meta de facturación en{" "}
                <Link href="/dashboard/agencia" className="underline underline-offset-2 hover:text-ink">
                  Agencia
                </Link>{" "}
                para ver el progreso aquí.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-ink-dim mb-1">Próximo hito</div>
                {vantData.milestone ? (
                  <>
                    <div className="text-sm font-medium text-ink truncate">{vantData.milestone.title}</div>
                    <div className="text-xs text-ink-dim mt-0.5">
                      {(() => {
                        const d = daysBetween(today, vantData.milestone!.deadline!);
                        return d < 0 ? `Vencido hace ${-d} días` : d === 0 ? "Vence hoy" : `Vence en ${d} días`;
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-ink-dim">Sin sub-metas activas</div>
                )}
              </div>

              <div>
                <div className="text-xs text-ink-dim mb-1">
                  Contactos en frío hoy{vantData.dailyTarget?.source === "calculated" ? " (cuota calculada)" : ""}
                </div>
                {vantData.dailyTarget ? (
                  <>
                    <div className="text-sm font-semibold text-ink tabular-nums">
                      {vantData.contactsToday} / {vantData.dailyTarget.value}
                    </div>
                    <ProgressBar
                      value={Math.min(100, Math.round((vantData.contactsToday / vantData.dailyTarget.value) * 100))}
                      className="mt-1.5"
                    />
                  </>
                ) : (
                  <Link
                    href="/dashboard/plan"
                    className="text-xs text-ink-dim underline underline-offset-2 hover:text-ink"
                  >
                    Completa el plan para calcular la cuota
                  </Link>
                )}
              </div>

              <div>
                <div className="text-xs text-ink-dim mb-1">Tasas (últimos 30 días)</div>
                <div className="text-sm text-ink tabular-nums">
                  {pct(vantData.rates.replyRate)} respuesta · {pct(vantData.rates.schedulingRate)} agendamiento
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/agencia/prospecting"
              className="inline-block mt-4 text-xs font-medium text-ink-dim hover:text-ink"
            >
              Registrar prospección de hoy →
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 lg:row-span-2">
          <CardHeader title="Agenda de hoy" icon={<Calendar size={16} className="text-ink-dim" />} />
          {agendaItems.length === 0 ? (
            <EmptyState title="Nada programado para hoy" description="Agenda tareas o eventos para verlos aquí." />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-1">
              {agendaItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2 border-t border-border first:border-t-0"
                >
                  <span className="text-sm text-ink truncate">{item.title}</span>
                  {item.time ? (
                    <Badge tone="neutral" className="font-mono">
                      {item.time}
                    </Badge>
                  ) : (
                    <Badge tone={item.tone}>Hoy</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Prioridades de hoy"
            icon={<ListTodo size={16} className="text-ink-dim" />}
            action={
              priorityTasks.length > 0 ? <Badge tone="ink">{priorityTasks.length}</Badge> : undefined
            }
          />
          {priorityTasks.length === 0 ? (
            <EmptyState title="Sin tareas pendientes" description="Todo al día por ahora." />
          ) : (
            <ul className="px-5 pb-3 flex flex-col gap-1">
              {priorityTasks.map((s, i) => (
                <li key={s.item.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-sm text-ink truncate">
                    {i + 1}. {s.item.title}
                  </span>
                  <Badge tone={PRIORITY_TONE[s.item.priority] ?? "neutral"}>score {s.score}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/today"
            className="block px-5 py-3 text-xs font-medium text-ink-dim hover:text-ink border-t border-border"
          >
            Ver por qué, en Hoy
          </Link>
        </Card>

        <Card>
          <CardHeader title="Proyectos activos" icon={<FolderKanban size={16} className="text-ink-dim" />} />
          {activeProjects.length === 0 ? (
            <EmptyState
              title="Aún no tienes proyectos activos"
              description="Crea un proyecto para convertir tus metas en trabajo concreto."
              action={<LinkButton href="/dashboard/projects">+ Nuevo proyecto</LinkButton>}
            />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-3">
              {activeProjects.map((p) => {
                const stats = projectProgress.get(p.id);
                const pct = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                return (
                  <li key={p.id}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-ink truncate">{p.title}</span>
                      <span className="text-xs text-ink-dim tabular-nums">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Hábitos" icon={<Repeat size={16} className="text-ink-dim" />} />
          {habits.length === 0 ? (
            <EmptyState
              title="Sin hábitos todavía"
              description="Define un hábito para empezar a construir una racha."
              action={<LinkButton href="/dashboard/habits">+ Nuevo hábito</LinkButton>}
            />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-2">
              {habits.map((h, i) => {
                const done = habitLogsByHabit.get(h.id)?.has(today) ?? false;
                return (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink truncate">{h.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-dim tabular-nums">{habitStreaks[i]}d</span>
                      <span
                        className={`h-2 w-2 rounded-full ${done ? "bg-good" : "bg-surface-2 border border-border"}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Progreso semanal" icon={<BarChart2 size={16} className="text-ink-dim" />} />
          <div className="px-5 pb-5 flex items-end justify-between gap-2 h-24">
            {weeklyProgress.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-sm ${d.hasTasks ? "bg-ink" : "bg-surface-2"}`}
                    style={{ height: `${Math.max(d.pct, d.hasTasks ? 6 : 4)}%` }}
                  />
                </div>
                <span className="text-[0.65rem] text-ink-dim">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="px-4 py-4">
      <div className="flex items-center gap-1.5 text-ink-dim mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-ink tabular-nums">{value}</div>
      {hint && <div className="text-[0.7rem] text-ink-dim mt-1">{hint}</div>}
    </Card>
  );
}
