import { Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteHabit } from "@/lib/actions/habits";
import { isoDateInTimezone, shiftIsoDate } from "@/lib/date";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateHabitButton, EditHabitButton, type HabitFormValues } from "./habit-form";
import { computeHabitCompliance } from "@/lib/engine/habits";
import { HabitLogDot } from "./log-toggle";

const FREQUENCY_LABEL: Record<string, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  custom: "Días específicos",
};

export default async function HabitsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "America/Bogota";
  const today = isoDateInTimezone(timezone);
  const HISTORY_DAYS = 30;
  const logStart = shiftIsoDate(today, -(HISTORY_DAYS - 1));

  const [{ data: habitsData }, { data: logsData }, { data: areasData }, { data: goalsData }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, title, frequency, target_per_period, days_of_week, area_id, goal_id, time_of_day")
      .order("created_at", { ascending: false }),
    supabase.from("habit_logs").select("habit_id, date, done").gte("date", logStart).lte("date", today),
    supabase.from("areas").select("id, name").order("sort_order", { ascending: true }),
    supabase.from("goals").select("id, title").order("created_at", { ascending: false }),
  ]);

  const habits = (habitsData ?? []) as HabitFormValues[];
  const areas = areasData ?? [];
  const goals = goalsData ?? [];
  const goalTitle = new Map(goals.map((g) => [g.id, g.title]));
  const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const canEdit = profile?.mode === "config";
  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logsData ?? []) {
    if (!log.done) continue;
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.date);
  }

  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => shiftIsoDate(today, -(HISTORY_DAYS - 1) + i));

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Hábitos</h1>
          <p className="text-sm text-ink-dim mt-1">SER: constancia medida según la frecuencia real de cada hábito (últimos 28 días).</p>
        </div>
        <CreateHabitButton areas={areas} goals={goals} />
      </div>

      {habits.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Repeat size={20} />}
            title="Sin hábitos todavía"
            description="Define un hábito para empezar a construir una racha."
            action={<CreateHabitButton areas={areas} goals={goals} />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {habits.map((h) => {
            const doneDates = logsByHabit.get(h.id) ?? new Set<string>();
            const c = computeHabitCompliance(h, doneDates, today, 28);
            const freq =
              h.frequency === "semanal"
                ? `${h.target_per_period}× por semana`
                : h.frequency === "custom"
                  ? (h.days_of_week ?? []).map((d) => WEEKDAYS[d]).join(" ")
                  : FREQUENCY_LABEL.diaria;
            return (
              <Card key={h.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-medium text-ink">{h.title}</div>
                    <div className="text-xs text-ink-dim">
                      {freq}
                      {h.goal_id && goalTitle.get(h.goal_id) ? ` · sostiene: ${goalTitle.get(h.goal_id)}` : ""}
                      {c.thisWeek ? ` · esta semana ${c.thisWeek.done}/${c.thisWeek.target}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-ink tabular-nums">{c.pct === null ? "—" : `${c.pct}%`}</div>
                      <div className="text-[0.68rem] text-ink-dim tabular-nums">
                        racha {c.streak} {c.streakUnit}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2.5">
                        <EditHabitButton habit={h} areas={areas} goals={goals} />
                        <DeleteButton
                          action={deleteHabit.bind(null, h.id)}
                          confirmMessage={`¿Eliminar el hábito "${h.title}"? Se perderá su historial de registros.`}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {history.map((d) => (
                    <HabitLogDot key={d} date={d} done={doneDates.has(d)} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
