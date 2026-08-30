import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/topbar";

async function countRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string
) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const [areas, goals, projects, tasks, habits] = await Promise.all([
    countRows(supabase, "areas"),
    countRows(supabase, "goals"),
    countRows(supabase, "projects"),
    countRows(supabase, "tasks"),
    countRows(supabase, "habits"),
  ]);

  const stats = [
    { label: "Áreas", value: areas },
    { label: "Metas", value: goals },
    { label: "Proyectos", value: projects },
    { label: "Tareas", value: tasks },
    { label: "Hábitos", value: habits },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Topbar name={profile?.full_name ?? user?.email ?? "Sebastián"} />

      <main className="flex-1 px-6 md:px-8 py-6 max-w-5xl w-full">
        <div className="rounded-card border border-border bg-surface shadow-card p-5 mb-6">
          <div className="text-xs uppercase tracking-[0.08em] text-accent font-semibold mb-1">
            Fase 1 · Arquitectura + Supabase + Auth + Base de datos
          </div>
          <h2 className="font-display text-lg font-semibold text-ink mb-1">
            La cimentación ya es real
          </h2>
          <p className="text-sm text-ink-dim max-w-2xl">
            Esta cuenta y estos datos viven en tu propio proyecto de Supabase (Postgres +
            Auth + Row Level Security) — no en un documento embebido. Todavía no hay
            interfaz para crear áreas, metas, proyectos o tareas: eso es la Fase 2 en
            adelante. Lo que ves abajo son conteos reales de tu base de datos, hoy en cero
            porque las tablas existen pero aún no se ha creado nada en ellas.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-card border border-border bg-surface shadow-card px-4 py-4"
            >
              <div className="text-2xl font-display font-semibold text-ink tabular-nums">
                {s.value}
              </div>
              <div className="text-xs text-ink-dim mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-card border border-dashed border-border bg-surface-2 px-5 py-4 text-sm text-ink-dim">
          Siguiente paso (Fase 2): crear Áreas y Metas desde la interfaz, con jerarquía
          anual → trimestral → mensual, y conectarlas a Proyectos.
        </div>
      </main>
    </div>
  );
}
