import { notFound } from "next/navigation";
import { Target, FolderKanban, CheckSquare, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: area } = await supabase
    .from("areas")
    .select("id, name, color")
    .eq("id", id)
    .maybeSingle();

  if (!area) notFound();

  const [{ data: goals }, { data: projects }, { data: tasks }, { data: habits }] = await Promise.all([
    supabase.from("goals").select("id, title").eq("area_id", id).order("created_at", { ascending: false }),
    supabase.from("projects").select("id, title").eq("area_id", id).order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title")
      .eq("area_id", id)
      .not("status", "in", "(done,cancelled)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("habits").select("id, title").eq("area_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="h-3 w-3 rounded-full flex-none" style={{ backgroundColor: area.color || "var(--ink-dim)" }} />
        <h1 className="text-2xl font-semibold text-ink">{area.name}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Metas relacionadas" icon={<Target size={16} className="text-ink-dim" />} />
          {!goals || goals.length === 0 ? (
            <EmptyState title="Sin metas en esta área" />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-1">
              {goals.map((g) => (
                <li key={g.id} className="text-sm text-ink py-1 border-t border-border first:border-t-0">
                  {g.title}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Proyectos relacionados" icon={<FolderKanban size={16} className="text-ink-dim" />} />
          {!projects || projects.length === 0 ? (
            <EmptyState title="Sin proyectos en esta área" />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-1">
              {projects.map((p) => (
                <li key={p.id} className="text-sm text-ink py-1 border-t border-border first:border-t-0">
                  {p.title}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Tareas relacionadas" icon={<CheckSquare size={16} className="text-ink-dim" />} />
          {!tasks || tasks.length === 0 ? (
            <EmptyState title="Sin tareas pendientes en esta área" />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-1">
              {tasks.map((t) => (
                <li key={t.id} className="text-sm text-ink py-1 border-t border-border first:border-t-0">
                  {t.title}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Hábitos relacionados" icon={<Repeat size={16} className="text-ink-dim" />} />
          {!habits || habits.length === 0 ? (
            <EmptyState title="Sin hábitos en esta área" />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-1">
              {habits.map((h) => (
                <li key={h.id} className="text-sm text-ink py-1 border-t border-border first:border-t-0">
                  {h.title}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
