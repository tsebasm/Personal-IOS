"use client";

import { useActionState } from "react";
import { setTaskTier } from "@/lib/actions/tasks";
import { initialActionState } from "@/lib/actions/types";

export type TierInfo = {
  tier: string | null;
  tier_suggested: string | null;
  tier_suggested_reason: string | null;
  tier_source: string | null;
  tier_override_reason: string | null;
};

const TONE: Record<string, string> = {
  p0: "bg-ink text-bg",
  p1: "border border-ink text-ink",
  p2: "border border-border text-ink-dim",
};

/**
 * Nivel P0/P1/P2 de una tarea: muestra el efectivo y su origen; permite
 * sobrescribirlo (con razón opcional) o volver a la sugerencia automática.
 */
export function TierControl({ taskId, info }: { taskId: string; info: TierInfo }) {
  const [state, action, pending] = useActionState(setTaskTier, initialActionState);
  const overridden = info.tier_source === "user";
  const label = info.tier ? info.tier.toUpperCase() : "—";
  const title = overridden
    ? `Cambiado por ti${info.tier_override_reason ? `: ${info.tier_override_reason}` : ""} (sugerido: ${info.tier_suggested?.toUpperCase() ?? "—"})`
    : (info.tier_suggested_reason ?? "Sin clasificar todavía");
  return (
    <details className="relative inline-block">
      <summary
        title={title}
        className={`list-none cursor-pointer select-none rounded px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums ${TONE[info.tier ?? ""] ?? "border border-border text-ink-dim"}`}
      >
        {label}
        {overridden && "*"}
      </summary>
      <form action={action} className="absolute z-10 mt-1 w-64 rounded-md border border-border bg-surface p-3 shadow-lg flex flex-col gap-2">
        <input type="hidden" name="id" value={taskId} />
        <p className="text-[0.7rem] text-ink-dim">
          Sugerido: <span className="text-ink">{info.tier_suggested?.toUpperCase() ?? "—"}</span>
          {info.tier_suggested_reason ? ` · ${info.tier_suggested_reason}` : ""}
        </p>
        <select name="tier" defaultValue={overridden ? (info.tier ?? "auto") : "auto"} className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink">
          <option value="auto">Automático (sugerido)</option>
          <option value="p0">P0 — crítico</option>
          <option value="p1">P1 — capacidad</option>
          <option value="p2">P2 — secundario</option>
        </select>
        <input name="tier_reason" placeholder="Razón (opcional)" maxLength={500} className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink" />
        <button disabled={pending} className="rounded-md bg-ink px-2 py-1 text-xs font-medium text-bg disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar nivel"}
        </button>
        {state.error && <p className="text-[0.7rem] text-warn">{state.error}</p>}
      </form>
    </details>
  );
}
