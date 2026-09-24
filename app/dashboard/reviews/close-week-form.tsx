"use client";

import { useActionState } from "react";
import { closeWeek } from "@/lib/actions/weekly-review";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/** Análisis + ajustes del cierre semanal; el snapshot numérico lo calcula el servidor. */
export function CloseWeekForm({ initialAnalysis, initialAdjustments }: { initialAnalysis: string; initialAdjustments: string }) {
  const [state, action, pending] = useActionState(closeWeek, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Análisis — ¿qué aprendiste? (distingue dato de hipótesis)" htmlFor="week-analysis">
        <Textarea id="week-analysis" name="analysis" maxLength={4000} defaultValue={initialAnalysis} />
      </Field>
      <Field label="Ajustes para la próxima semana" htmlFor="week-adjustments">
        <Textarea
          id="week-adjustments"
          name="adjustments"
          maxLength={4000}
          required
          defaultValue={initialAdjustments}
          placeholder="Ej.: probar mensaje v5 con 100 contactos; bloquear 2 h diarias de prospección."
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Cerrar semana"}
        </Button>
        {state.error && <span className="text-xs text-bad">{state.error}</span>}
        {state.ok && <span className="text-xs text-good">Semana guardada con su snapshot.</span>}
      </div>
    </form>
  );
}
