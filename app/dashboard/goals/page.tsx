import { Target, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteGoal } from "@/lib/actions/goals";
import { goalProgressPct } from "@/lib/engine/metrics-registry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateGoalButton } from "./create-button";
import { EditGoalButton } from "./edit-button";
import type { GoalFormValues } from "./goal-form";

const HORIZON_LABEL: Record<string, string> = {
  largo_plazo: "Largo plazo",
  anual: "Anual",
  trimestral: "Trimestral",
  mensual: "Mensual",
};

const STATUS_LABEL: Record<string, string> = {
  pausado: "Pausada",
  cumplido: "Cumplida",
  cancelado: "Cancelada",
};

export default async function GoalsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const [{ data }, { data: areasData }, { data: northStarData }] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "id, title, description, area_id, parent_goal_id, horizon, kind, priority, baseline_value, target_value, current_value, unit, start_date, deadline, status"
      )
      .order("created_at", { ascending: false }),
    supabase.from("areas").select("id, name").order("sort_order", { ascending: true }),
    supabase.from("profiles").select("north_star_goal_id").eq("id", profile?.userId ?? "").maybeSingle(),
  ]);

  const goals = (data ?? []) as GoalFormValues[];
  const areas = areasData ?? [];
  const canEdit = profile?.mode === "config";
  const northStarId = northStarData?.north_star_goal_id ?? null;
  const parents = goals.map((g) => ({ id: g.id, title: g.title }));

  // Raíces primero, cada una seguida de sus sub-metas (Goal → Outcome).
  const ids = new Set(goals.map((g) => g.id));
  const roots = goals.filter((g) => !g.parent_goal_id || !ids.has(g.parent_goal_id));
  const childrenOf = (id: string) => goals.filter((g) => g.parent_goal_id === id);
  const ordered: { goal: GoalFormValues; depth: number }[] = [];
  const visit = (g: GoalFormValues, depth: number) => {
    ordered.push({ goal: g, depth });
    if (depth < 4) childrenOf(g.id).forEach((c) => visit(c, depth + 1));
  };
  roots.forEach((r) => visit(r, 0));

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Metas</h1>
          <p className="text-sm text-ink-dim mt-1">Punto A → Punto B, con deadline. Las sub-metas son los resultados que la hacen posible.</p>
        </div>
        <CreateGoalButton areas={areas} parents={parents} />
      </div>

      {goals.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Target size={20} />}
            title="Construye algo que valga la pena conseguir."
            description="Define tu primera meta para comenzar."
            action={<CreateGoalButton areas={areas} parents={parents} />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map(({ goal: g, depth }) => {
            const target = g.target_value !== null ? Number(g.target_value) : null;
            const pct = goalProgressPct(
              g.current_value !== null ? Number(g.current_value) : null,
              target,
              g.baseline_value !== null ? Number(g.baseline_value) : null
            );
            const isNorthStar = g.id === northStarId;
            return (
              <Card key={g.id} className="px-5 py-4" style={{ marginLeft: `${depth * 1.25}rem` }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {isNorthStar && <Star size={14} className="flex-none text-warn" aria-label="Meta principal" />}
                      <span className="truncate">{g.title}</span>
                    </div>
                    {g.description && <p className="text-xs text-ink-dim mt-0.5 line-clamp-2">{g.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    {STATUS_LABEL[g.status] && <Badge tone="neutral">{STATUS_LABEL[g.status]}</Badge>}
                    <Badge tone="neutral">{HORIZON_LABEL[g.horizon] ?? g.horizon}</Badge>
                    {canEdit && (
                      <>
                        <EditGoalButton goal={g} areas={areas} parents={parents} isNorthStar={isNorthStar} />
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
                      {g.current_value ?? 0}/{g.target_value} {g.unit ?? ""}
                    </span>
                  </div>
                ) : null}
                {g.deadline && <p className="text-[0.7rem] text-ink-dim mt-1">Deadline: {g.deadline}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
