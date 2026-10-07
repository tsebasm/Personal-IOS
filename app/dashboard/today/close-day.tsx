"use client";

import { useActionState } from "react";
import { closeDay } from "@/lib/actions/day";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function Scale({ name, label, value }: { name: string; label: string; value: number | null }) {
  return (
    <fieldset className="flex items-center gap-1.5">
      <legend className="sr-only">{label}</legend>
      <span className="text-xs text-ink-dim w-16">{label}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer">
          <input type="radio" name={name} value={n} defaultChecked={value === n} className="peer sr-only" />
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-xs text-ink-dim peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg">
            {n}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Cierre del día (§35). Lo numérico lo calcula el sistema; aquí solo lo que ocurrió y lo aprendido. */
export function CloseDayForm({ defaults }: { defaults: { energy: number | null; focus: number | null } }) {
  const [state, action, pending] = useActionState(closeDay, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-xs text-ink-dim">El sistema guarda P0/P1/P2, el score, las métricas (objetivo vs real) y el tiempo registrado. Una vez cerrado, el día no se edita.</p>
      <Field label="Misión de hoy (opcional)" htmlFor="cd-mission">
        <Input id="cd-mission" name="mission" maxLength={300} placeholder="Se usa tu primer P0 si la dejas vacía" />
      </Field>
      <div className="flex flex-col gap-1.5">
        <Scale name="energy" label="Energía" value={defaults.energy} />
        <Scale name="focus" label="Enfoque" value={defaults.focus} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Problemas (uno por línea)" htmlFor="cd-problems">
          <Textarea id="cd-problems" name="problems" rows={2} />
        </Field>
        <Field label="Bloqueos" htmlFor="cd-blockers">
          <Textarea id="cd-blockers" name="blockers" rows={2} />
        </Field>
        <Field label="Aprendizajes" htmlFor="cd-learnings">
          <Textarea id="cd-learnings" name="learnings" rows={2} />
        </Field>
        <Field label="Mañana" htmlFor="cd-tomorrow">
          <Textarea id="cd-tomorrow" name="tomorrow" rows={2} />
        </Field>
      </div>
      <Field label="Notas" htmlFor="cd-notes">
        <Textarea id="cd-notes" name="notes" rows={2} />
      </Field>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={pending}>{pending ? "Cerrando…" : "Cerrar el día"}</Button>
        {state.error && <p className="text-xs text-warn">{state.error}</p>}
        {state.ok && <p className="text-xs text-good">Día cerrado.</p>}
      </div>
    </form>
  );
}
