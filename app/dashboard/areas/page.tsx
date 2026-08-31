import Link from "next/link";
import { LayoutList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteArea } from "@/lib/actions/areas";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateAreaButton } from "./create-button";
import { EditAreaButton } from "./edit-button";

export default async function AreasPage() {
  const supabase = await createClient();
  const [{ data }, profile] = await Promise.all([
    supabase.from("areas").select("id, name, color").order("sort_order", { ascending: true }),
    getCurrentProfile(),
  ]);

  const areas = data ?? [];
  const canEdit = profile?.mode === "config";

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Áreas</h1>
          <p className="text-sm text-ink-dim mt-1">Los grandes ámbitos de tu vida: negocios, salud, relaciones…</p>
        </div>
        <CreateAreaButton />
      </div>

      <Card>
        {areas.length === 0 ? (
          <EmptyState
            icon={<LayoutList size={20} />}
            title="Sin áreas todavía"
            description="Crea tu primera área para empezar a organizar metas y proyectos."
            action={<CreateAreaButton />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {areas.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                <Link href={`/dashboard/areas/${a.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-none"
                    style={{ backgroundColor: a.color || "var(--ink-dim)" }}
                  />
                  <span className="text-sm text-ink truncate">{a.name}</span>
                </Link>
                {canEdit && (
                  <div className="flex items-center gap-3 flex-none">
                    <EditAreaButton area={a} />
                    <DeleteButton
                      action={deleteArea.bind(null, a.id)}
                      confirmMessage={`¿Eliminar el área "${a.name}"? Metas, proyectos y tareas asociadas quedarán sin área.`}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
