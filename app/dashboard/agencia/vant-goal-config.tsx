"use client";

import { useActionState } from "react";
import { Settings2 } from "lucide-react";
import { updateAgenciaSettings } from "@/lib/actions/agencia-settings";
import { initialActionState } from "@/lib/actions/types";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function VantGoalConfig({
  goals,
  selectedGoalId,
  dailyOutreachTarget,
}: {
  goals: { id: string; title: string }[];
  selectedGoalId: string | null;
  dailyOutreachTarget: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateAgenciaSettings, initialActionState);

  return (
    <Card className="mb-6">
      <CardHeader title="Configuración de VANT" icon={<Settings2 size={16} className="text-ink-dim" />} />
      <form action={formAction} className="px-5 pb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] flex flex-col gap-1">
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
        <div className="w-40 flex flex-col gap-1">
          <label htmlFor="daily-outreach-target" className="text-xs font-medium text-ink-dim">
            Mensajes en frío / día
          </label>
          <Input
            id="daily-outreach-target"
            name="daily_outreach_target"
            type="number"
            min={0}
            step={1}
            placeholder="ej. 20"
            defaultValue={dailyOutreachTarget ?? ""}
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </form>
      {state.error && <p className="text-xs text-bad px-5 pb-4">{state.error}</p>}
      <p className="text-xs text-ink-dim px-5 pb-4">
        El dashboard mostrará el progreso de facturación contra esta meta y tu cumplimiento diario de prospección.
      </p>
    </Card>
  );
}
