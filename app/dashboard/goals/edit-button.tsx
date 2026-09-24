"use client";

import { Pencil } from "lucide-react";
import { updateGoal } from "@/lib/actions/goals";
import { GoalFormModal, type GoalFormValues } from "./goal-form";

export function EditGoalButton({
  goal,
  areas,
  parents,
  isNorthStar,
}: {
  goal: GoalFormValues;
  areas: { id: string; name: string }[];
  parents: { id: string; title: string }[];
  isNorthStar: boolean;
}) {
  return (
    <GoalFormModal
      action={updateGoal}
      title="Editar meta"
      submitLabel="Guardar cambios"
      initial={goal}
      areas={areas}
      parents={parents.filter((p) => p.id !== goal.id)}
      isNorthStar={isNorthStar}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
