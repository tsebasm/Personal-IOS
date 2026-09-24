"use client";

import { createGoal } from "@/lib/actions/goals";
import { Button } from "@/components/ui/button";
import { GoalFormModal } from "./goal-form";

export function CreateGoalButton({
  areas,
  parents,
}: {
  areas: { id: string; name: string }[];
  parents: { id: string; title: string }[];
}) {
  return (
    <GoalFormModal
      action={createGoal}
      title="Nueva meta"
      submitLabel="Crear meta"
      areas={areas}
      parents={parents}
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nueva meta
        </Button>
      )}
    />
  );
}
