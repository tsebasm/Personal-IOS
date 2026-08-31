import { FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteProject } from "@/lib/actions/projects";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateProjectButton } from "./create-button";
import { EditProjectButton } from "./edit-button";

const STATUS_TONE: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  activo: "good",
  planeado: "neutral",
  pausado: "warn",
  completado: "good",
  cancelado: "bad",
};

const STATUS_LABEL: Record<string, string> = {
  activo: "Activo",
  planeado: "Planeado",
  pausado: "En pausa",
  completado: "Completado",
  cancelado: "Cancelado",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [{ data: projectsData }, { data: areasData }, { data: goalsData }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, description, status, deadline, area_id, goal_id, priority")
      .order("created_at", { ascending: false }),
    supabase.from("areas").select("id, name").order("sort_order", { ascending: true }),
    supabase.from("goals").select("id, title").order("created_at", { ascending: false }),
  ]);

  const projects = projectsData ?? [];
  const areas = areasData ?? [];
  const goals = goalsData ?? [];

  const { data: taskStats } =
    projects.length > 0
      ? await supabase
          .from("tasks")
          .select("project_id, status")
          .in("project_id", projects.map((p) => p.id))
      : { data: [] as { project_id: string | null; status: string }[] };

  const progressByProject = new Map<string, { total: number; done: number }>();
  for (const t of taskStats ?? []) {
    if (!t.project_id) continue;
    const entry = progressByProject.get(t.project_id) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (t.status === "done") entry.done += 1;
    progressByProject.set(t.project_id, entry);
  }

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Proyectos</h1>
          <p className="text-sm text-ink-dim mt-1">Convierte tus metas en trabajo concreto.</p>
        </div>
        <CreateProjectButton areas={areas} goals={goals} />
      </div>

      {projects.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<FolderKanban size={20} />}
            title="Aún no tienes proyectos"
            description="Crea tu primer proyecto para empezar a mover una meta hacia adelante."
            action={<CreateProjectButton areas={areas} goals={goals} />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => {
            const stats = progressByProject.get(p.id);
            const pct = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            return (
              <Card key={p.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{p.title}</div>
                    {p.description && (
                      <p className="text-xs text-ink-dim mt-0.5 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                    <EditProjectButton project={p} areas={areas} goals={goals} />
                    <DeleteButton
                      action={deleteProject.bind(null, p.id)}
                      confirmMessage={`¿Eliminar el proyecto "${p.title}"? Sus tareas quedarán sin proyecto.`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={pct} className="flex-1" />
                  <span className="text-xs text-ink-dim tabular-nums">{pct}%</span>
                </div>
                {p.deadline && (
                  <p className="text-[0.7rem] text-ink-dim mt-2">Deadline: {p.deadline}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
