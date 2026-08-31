import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteGoal } from "@/lib/actions/goals";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateGoalButton } from "./create-button";
import { EditGoalButton } from "./edit-button";

const HORIZON_LABEL: Record<string, string> = {
  largo_plazo: "Largo plazo",
  anual: "Anual",
  trimestral: "Trimestral",
  mensual: "Mensual",
};

export default async function GoalsPage() {
  const supabase = await createClient();
  const [{ data }, { data: areasData }, profile] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "id, title, description, horizon, target_value, current_value, unit, deadline, status, area_id, priority"
      )
      .order("created_at", { ascending: false }),
    supabase.from("areas").select("id, name").order("sort_order", { ascending: true }),
    getCurrentProfile(),
  ]);

  const goals = data ?? [];
  const areas = areasData ?? [];
  const canEdit = profile?.mode === "config";

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Metas</h1>
          <p className="text-sm text-ink-dim mt-1">De la visión a lo concreto: largo plazo, anual, trimestral, mensual.</p>
        </div>
        <CreateGoalButton areas={areas} />
      </div>

      {goals.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Target size={20} />}
            title="Construye algo que valga la pena conseguir."
            description="Define tu primera meta para comenzar."
            action={<CreateGoalButton areas={areas} />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g) => {
            const pct =
              g.target_value && g.current_value !== null
                ? Math.min(100, Math.round((Number(g.current_value) / Number(g.target_value)) * 100))
                : null;
            return (
              <Card key={g.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{g.title}</div>
                    {g.description && (
                      <p className="text-xs text-ink-dim mt-0.5 line-clamp-2">{g.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <Badge tone="neutral">{HORIZON_LABEL[g.horizon] ?? g.horizon}</Badge>
                    {canEdit && (
                      <>
                        <EditGoalButton goal={g} areas={areas} />
                        <DeleteButton
                          action={deleteGoal.bind(null, g.id)}
                          confirmMessage={`¿Eliminar la meta "${g.title}"?`}
                        />
                      </>
                    )}
                  </div>
                </div>
                {pct !== null ? (
                  <div className="flex items-center gap-3">
                    <ProgressBar value={pct} className="flex-1" />
                    <span className="text-xs text-ink-dim tabular-nums">
                      {g.current_value}/{g.target_value} {g.unit ?? ""}
                    </span>
                  </div>
                ) : (
                  g.deadline && <p className="text-[0.7rem] text-ink-dim">Fecha objetivo: {g.deadline}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
