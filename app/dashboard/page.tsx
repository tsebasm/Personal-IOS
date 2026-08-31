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
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isoDateInTimezone, shiftIsoDate, friendlyDate } from "@/lib/date";
import { computeStreak } from "@/lib/metrics";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";

const PRIORITY_RANK: Record<string, number> = { alta: 0, media: 1, baja: 2 };
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

  const firstName = (profile?.full_name ?? user?.email ?? "Sebastián").split(" ")[0];
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

  const priorityTasks = [...priorityCandidates]
    .sort((a, b) => {
      const aToday = a.scheduled_date === today || (a.deadline && a.deadline <= today) ? 0 : 1;
      const bToday = b.scheduled_date === today || (b.deadline && b.deadline <= today) ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      const rankDiff = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
      if (rankDiff !== 0) return rankDiff;
      return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
    })
    .slice(0, 4);

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
            title="Tareas prioritarias"
            icon={<ListTodo size={16} className="text-ink-dim" />}
            action={
              priorityTasks.length > 0 ? <Badge tone="ink">{priorityTasks.length}</Badge> : undefined
            }
          />
          {priorityTasks.length === 0 ? (
            <EmptyState title="Sin tareas pendientes" description="Todo al día por ahora." />
          ) : (
            <ul className="px-5 pb-3 flex flex-col gap-1">
              {priorityTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-sm text-ink truncate">{t.title}</span>
                  <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"}>
                    {t.scheduled_date === today ? "Hoy" : t.deadline ?? ""}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/tasks"
            className="block px-5 py-3 text-xs font-medium text-ink-dim hover:text-ink border-t border-border"
          >
            Ver todas
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
