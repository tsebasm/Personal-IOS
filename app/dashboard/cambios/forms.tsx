"use client";

import { useActionState } from "react";
import { applySet, proposeGoalChange, reproposeSet, reviewAll } from "@/lib/actions/change-sets";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function Feedback({ state, ok }: { state: ActionState; ok?: string }) {
  if (state.error) return <p className="text-xs text-warn">{state.error}</p>;
  if (state.ok && ok) return <p className="text-xs text-good">{ok}</p>;
  return null;
}

/** Botones de la revisión humana. Solo el usuario llega aquí (actor 'user'). */
export function SetActions({ id, status, kind }: { id: string; status: string; kind: string }) {
  const [reviewState, review, reviewing] = useActionState(reviewAll, initialActionState);
  const [applyState, apply, applying] = useActionState(applySet, initialActionState);
  const [reState, repropose, reproposing] = useActionState(reproposeSet, initialActionState);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        {status === "proposed" && (
          <>
            <form action={review}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="verdict" value="approve" />
              <Button size="sm" disabled={reviewing}>Aprobar</Button>
            </form>
            <form action={review}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="verdict" value="reject" />
              <Button size="sm" variant="secondary" disabled={reviewing}>Rechazar</Button>
            </form>
          </>
        )}
        {(status === "approved" || status === "partially_approved") && (
          <form action={apply}>
            <input type="hidden" name="id" value={id} />
            <Button size="sm" disabled={applying}>{applying ? "Aplicando…" : "Aplicar"}</Button>
          </form>
        )}
        {status === "failed" && (
          <form action={repropose}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="kind" value={kind} />
            <Button size="sm" variant="secondary" disabled={reproposing}>Volver a revisión</Button>
          </form>
        )}
      </div>
      <Feedback state={reviewState} />
      <Feedback state={applyState} ok="Aplicado." />
      <Feedback state={reState} />
    </div>
  );
}

export function GoalChangeForm({ goalId, defaults }: { goalId: string; defaults: { title: string; unit: string; currency: string; deadline: string } }) {
  const [state, action, pending] = useActionState(proposeGoalChange, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="goal_id" value={goalId} />
      <Field label="Nueva meta" htmlFor="gc-title">
        <Input id="gc-title" name="title" defaultValue={defaults.title} required />
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Objetivo" htmlFor="gc-target">
          <Input id="gc-target" name="target_value" type="number" step="any" min="0" required />
        </Field>
        <Field label="Unidad" htmlFor="gc-unit">
          <Input id="gc-unit" name="unit" defaultValue={defaults.unit} required />
        </Field>
        <Field label="Moneda (si es dinero)" htmlFor="gc-currency">
          <Input id="gc-currency" name="currency" defaultValue={defaults.currency} maxLength={3} placeholder="USD" />
        </Field>
        <Field label="Fecha límite" htmlFor="gc-deadline">
          <Input id="gc-deadline" name="deadline" type="date" defaultValue={defaults.deadline} required />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-ink-dim">
        <input type="checkbox" name="measure_received" defaultChecked />
        Medir el progreso con el dinero efectivamente recibido (revenue_receipts)
      </label>
      <Field label="Problema: ¿por qué cambia la meta?" htmlFor="gc-problem">
        <Textarea id="gc-problem" name="problem" rows={2} required />
      </Field>
      <Field label="Razón (queda en el registro de decisiones)" htmlFor="gc-reason">
        <Textarea id="gc-reason" name="reason" rows={2} required />
      </Field>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={pending}>{pending ? "Proponiendo…" : "Proponer cambio de meta"}</Button>
        <Feedback state={state} ok="Propuesto. Revísalo abajo: nada cambia hasta que lo apruebes y lo apliques." />
      </div>
    </form>
  );
}
