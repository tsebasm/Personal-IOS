"use client";

import { useActionState, useState } from "react";
import { logTime } from "@/lib/actions/time-entries";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { TIME_CATEGORIES, TIME_CATEGORY_LABEL, type TimeCategory } from "@/lib/engine/allocation";

const PRESETS = [15, 30, 60, 90];

/**
 * Captura rápida de tiempo, pensada para el celular: categoría + minutos y
 * listo. Sin modal, sin campos obligatorios de más.
 */
export function QuickTimeLog({ today }: { today: string }) {
  const [category, setCategory] = useState<TimeCategory | "">("");
  const [minutes, setMinutes] = useState("");
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await logTime(prev, fd);
    if (res.ok) {
      setMinutes("");
      setCategory("");
    }
    return res;
  }, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="date" value={today} />
      <input type="hidden" name="category" value={category} />
      <div className="flex flex-wrap gap-1.5">
        {TIME_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              category === c ? "border-ink bg-ink text-bg" : "border-border text-ink hover:bg-surface-2"
            }`}
          >
            {TIME_CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(String(m))}
            className={`rounded-md border px-2 py-1 text-xs tabular-nums ${
              minutes === String(m) ? "border-ink text-ink font-medium" : "border-border text-ink-dim hover:text-ink"
            }`}
          >
            {m}m
          </button>
        ))}
        <input
          name="minutes"
          type="number"
          min="1"
          max="1440"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="min"
          aria-label="Minutos"
          className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={pending || !category || !minutes}
          className="ml-auto rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Registrar"}
        </button>
      </div>
      {state.error && <p className="text-xs text-bad">{state.error}</p>}
      {state.ok && <p className="text-xs text-good">Registrado.</p>}
    </form>
  );
}
