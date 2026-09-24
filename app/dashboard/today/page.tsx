import { Sun, Repeat, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isoDateInTimezone, friendlyDate } from "@/lib/date";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { HabitTodayToggle } from "./habit-toggle";

type TaskRow = {
  id: string;
  title: string;
  priority: string;
  status: string;
};

export default async function TodayPage() {
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
  const firstName = (profile?.full_name ?? user?.email?.split("@")[0] ?? "").split(" ")[0];

  const [{ data: tasksData }, { data: habitsData }, { data: logsData }, { data: eventsData }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, priority, status")
        .eq("scheduled_date", today)
        .not("status", "in", "(cancelled)"),
      supabase.from("habits").select("id, title").eq("is_active", true),
      supabase.from("habit_logs").select("habit_id, done").eq("date", today),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at")
        .gte("starts_at", `${today}T00:00:00.000Z`)
        .lt("starts_at", `${today}T23:59:59.999Z`)
        .order("starts_at"),
    ]);

  const tasks: TaskRow[] = tasksData ?? [];
  const habits = habitsData ?? [];
  const doneHabitIds = new Set((logsData ?? []).filter((l) => l.done).map((l) => l.habit_id));
  const events = eventsData ?? [];

  const mustDo = tasks.filter((t) => t.priority === "alta").slice(0, 3);
  const shouldDo = tasks.filter((t) => t.priority === "media").slice(0, 3);
  const ifTime = tasks.filter((t) => t.priority === "baja").slice(0, 3);

  const isEmpty = tasks.length === 0 && habits.length === 0 && events.length === 0;

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Hoy</h1>
        <p className="text-sm text-ink-dim mt-1 capitalize">Buenos días, {firstName} · {friendlyDate(timezone)}</p>
      </div>

      {isEmpty ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Sun size={20} />}
            title="Nada programado para hoy"
            description="Programa una tarea para hoy y aparecerá aquí, organizada por lo que más importa."
            action={<LinkButton href="/dashboard/tasks">+ Nueva tarea</LinkButton>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <TaskBucket title="Must do" tasks={mustDo} tone="bad" />
          <TaskBucket title="Should do" tasks={shouldDo} tone="warn" />
          {ifTime.length > 0 && <TaskBucket title="If time" tasks={ifTime} tone="neutral" />}

          <Card>
            <CardHeader title="Hábitos" icon={<Repeat size={16} className="text-ink-dim" />} />
            {habits.length === 0 ? (
              <EmptyState title="Sin hábitos activos" />
            ) : (
              <ul className="px-5 pb-4 flex flex-col gap-2">
                {habits.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink">{h.title}</span>
                    <HabitTodayToggle habitId={h.id} date={today} done={doneHabitIds.has(h.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Agenda" icon={<Calendar size={16} className="text-ink-dim" />} />
            {events.length === 0 ? (
              <EmptyState title="Sin eventos programados" />
            ) : (
              <ul className="px-5 pb-4 flex flex-col gap-1">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-border first:border-t-0">
                    <span className="text-sm text-ink">{ev.title}</span>
                    <Badge tone="neutral" className="font-mono">
                      {new Intl.DateTimeFormat("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: timezone,
                      }).format(new Date(ev.starts_at))}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </main>
  );
}

function TaskBucket({
  title,
  tasks,
  tone,
}: {
  title: string;
  tasks: TaskRow[];
  tone: "bad" | "warn" | "neutral";
}) {
  if (tasks.length === 0) return null;
  return (
    <Card>
      <CardHeader title={title} action={<Badge tone={tone}>{tasks.length}</Badge>} />
      <ul className="px-5 pb-4 flex flex-col gap-1">
        {tasks.map((t) => (
          <li key={t.id} className="text-sm text-ink py-1 border-t border-border first:border-t-0">
            {t.title}
          </li>
        ))}
      </ul>
    </Card>
  );
}
