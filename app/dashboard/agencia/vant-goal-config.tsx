"use client";

import { useActionState } from "react";
import { Settings2 } from "lucide-react";
import { updateVantGoal } from "@/lib/actions/agencia-settings";
import { initialActionState } from "@/lib/actions/types";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function VantGoalConfig({
  goals,
  selectedGoalId,
}: {
  goals: { id: string; title: string }[];
  selectedGoalId: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateVantGoal, initialActionState);

  return (
    <Card className="mb-6">
      <CardHeader title="Configuración de VANT" icon={<Settings2 size={16} className="text-ink-dim" />} />
      <form action={formAction} className="px-5 pb-4 flex items-end gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label htmlFor="vant-goal" className="text-xs font-medium text-ink-dim">
            Meta de facturación vinculada
          </label>
          <Select id="vant-goal" name="vant_goal_id" defaultValue={selectedGoalId ?? ""}>
            <option value="">Sin meta vinculada</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </form>
      {state.error && <p className="text-xs text-bad px-5 pb-4">{state.error}</p>}
      <p className="text-xs text-ink-dim px-5 pb-4">
        El dashboard de VANT mostrará el progreso de facturación contra esta meta.
      </p>
    </Card>
  );
}
