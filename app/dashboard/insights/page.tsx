import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function InsightsPage() {
  const supabase = await createClient();

  const [tasksDoneRes, tasksTotalRes, habitsActiveRes, projectsActiveRes] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "done"),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("habits").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "activo"),
  ]);

  const tasksDone = tasksDoneRes.count ?? 0;
  const tasksTotal = tasksTotalRes.count ?? 0;
  const habitsActive = habitsActiveRes.count ?? 0;
  const projectsActive = projectsActiveRes.count ?? 0;

  const hasData = tasksTotal > 0 || habitsActive > 0 || projectsActive > 0;

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Insights</h1>
        <p className="text-sm text-ink-dim mt-1">Tendencias de tu sistema personal a lo largo del tiempo.</p>
      </div>

      {!hasData ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Sparkles size={20} />}
            title="Aún no hay suficientes datos"
            description="A medida que completes tareas, proyectos y hábitos, aquí verás tus tendencias."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="px-4 py-4">
            <div className="text-xs text-ink-dim mb-1">Tareas completadas</div>
            <div className="text-2xl font-semibold text-ink tabular-nums">
              {tasksDone} / {tasksTotal}
            </div>
          </Card>
          <Card className="px-4 py-4">
            <div className="text-xs text-ink-dim mb-1">Hábitos activos</div>
            <div className="text-2xl font-semibold text-ink tabular-nums">{habitsActive}</div>
          </Card>
          <Card className="px-4 py-4">
            <div className="text-xs text-ink-dim mb-1">Proyectos activos</div>
            <div className="text-2xl font-semibold text-ink tabular-nums">{projectsActive}</div>
          </Card>
        </div>
      )}
    </main>
  );
}
