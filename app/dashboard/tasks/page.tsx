import { CheckSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteTask } from "@/lib/actions/tasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateTaskButton } from "./create-button";
import { EditTaskButton } from "./edit-button";

const PRIORITY_TONE: Record<string, "bad" | "warn" | "neutral"> = {
  alta: "bad",
  media: "warn",
  baja: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  inbox: "Inbox",
  next: "Next",
  today: "Hoy",
  in_progress: "En progreso",
  waiting: "Esperando",
  done: "Completada",
  cancelled: "Cancelada",
};

export default async function TasksPage() {
  const supabase = await createClient();
  const [{ data }, { data: areasData }, { data: projectsData }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, priority, status, energy_required, estimated_minutes, deadline, scheduled_date, area_id, project_id"
      )
      .order("created_at", { ascending: false }),
    supabase.from("areas").select("id, name").order("sort_order", { ascending: true }),
    supabase.from("projects").select("id, title").order("created_at", { ascending: false }),
  ]);

  const tasks = data ?? [];
  const areas = areasData ?? [];
  const projects = projectsData ?? [];

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tareas</h1>
          <p className="text-sm text-ink-dim mt-1">Todo lo que necesitas hacer, en un solo lugar.</p>
        </div>
        <CreateTaskButton areas={areas} projects={projects} />
      </div>

      <Card>
        {tasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={20} />}
            title="Aún no tienes tareas"
            description="Captura lo que necesitas hacer para empezar a organizarte."
            action={<CreateTaskButton areas={areas} projects={projects} />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm text-ink truncate">{t.title}</span>
                <div className="flex items-center gap-2.5 flex-none">
                  <Badge tone="neutral">{STATUS_LABEL[t.status] ?? t.status}</Badge>
                  <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"}>{t.priority}</Badge>
                  <EditTaskButton task={t} areas={areas} projects={projects} />
                  <DeleteButton action={deleteTask.bind(null, t.id)} confirmMessage={`¿Eliminar la tarea "${t.title}"?`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
