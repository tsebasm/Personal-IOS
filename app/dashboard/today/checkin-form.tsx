"use client";

import { useActionState } from "react";
import { saveDailyCheckin } from "@/lib/actions/checkin";
import { initialActionState } from "@/lib/actions/types";
import type { DailyCheckin } from "@/lib/data/ser-hacer-tener";

function Scale({ name, label, value }: { name: string; label: string; value: number | null }) {
  return (
    <fieldset className="flex items-center gap-1.5">
      <legend className="sr-only">{label}</legend>
      <span className="text-xs text-ink-dim w-16">{label}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer">
          <input type="radio" name={name} value={n} defaultChecked={value === n} className="peer sr-only" />
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-xs text-ink-dim peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg">
            {n}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Registro del día: energía y enfoque (SER) + "¿produjo progreso?" (cierre del día). */
export function CheckinForm({ date, initial }: { date: string; initial: DailyCheckin | null }) {
  const [state, action, pending] = useActionState(saveDailyCheckin, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="date" value={date} />
      <Scale name="energy" label="Energía" value={initial?.energy ?? null} />
      <Scale name="focus" label="Enfoque" value={initial?.focus ?? null} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-ink-dim w-16">¿Progreso?</span>
        {(
          [
            ["si", "Sí"],
            ["parcial", "Parcial"],
            ["no", "No"],
          ] as const
        ).map(([v, l]) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name="progress" value={v} defaultChecked={initial?.progress === v} className="peer sr-only" />
            <span className="rounded-md border border-border px-2 py-1 text-xs text-ink-dim peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg">
              {l}
            </span>
          </label>
        ))}
      </div>
      <input
        name="note"
        maxLength={1000}
        defaultValue={initial?.note ?? ""}
        placeholder="¿Qué movió (o bloqueó) la meta hoy?"
        className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink"
      />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar día"}
        </button>
        {state.error && <span className="text-xs text-bad">{state.error}</span>}
        {state.ok && <span className="text-xs text-good">Guardado.</span>}
      </div>
    </form>
  );
}
