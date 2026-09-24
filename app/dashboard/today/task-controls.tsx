"use client";

import { useState, useTransition } from "react";
import { resolveMissedTask, setTaskDone } from "@/lib/actions/tasks";
import { MISS_DECISIONS, MISS_DECISION_LABEL, MISS_REASONS, MISS_REASON_LABEL, type MissDecision } from "@/lib/adaptive";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function TaskDoneToggle({ taskId, done }: { taskId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      title={done ? "Reabrir" : "Marcar como hecha"}
      aria-pressed={done}
      disabled={pending}
      onClick={() => startTransition(() => void setTaskDone(taskId, !done))}
      className={`mt-0.5 h-4 w-4 rounded flex-none transition-colors disabled:opacity-50 ${
        done ? "bg-good" : "bg-surface-2 border border-border hover:border-ink-dim"
      }`}
    />
  );
}

/** Modo adaptativo: por qué no se hizo + qué hacer. Nada se arrastra en silencio. */
export function ResolveMissedButton({ taskId, title, today }: { taskId: string; title: string; today: string }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(resolveMissedTask);
  const [decision, setDecision] = useState<MissDecision | "">("");

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Decidir
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="¿Qué pasó con esta tarea?">
        <form action={formAction} className="flex flex-col gap-3">
          <p className="text-sm text-ink">{title}</p>
          <input type="hidden" name="id" value={taskId} />
          <input type="hidden" name="today" value={today} />

          <Field label="¿Por qué no se completó?" htmlFor={`miss-reason-${taskId}`}>
            <Select id={`miss-reason-${taskId}`} name="reason" defaultValue="" required>
              <option value="" disabled>
                Elige un motivo
              </option>
              {MISS_REASONS.map((r) => (
                <option key={r} value={r}>
                  {MISS_REASON_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="¿Qué hacemos?" htmlFor={`miss-decision-${taskId}`}>
            <Select
              id={`miss-decision-${taskId}`}
              name="decision"
              value={decision}
              onChange={(e) => setDecision(e.target.value as MissDecision)}
              required
            >
              <option value="" disabled>
                Elige una decisión
              </option>
              {MISS_DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {MISS_DECISION_LABEL[d]}
                </option>
              ))}
            </Select>
          </Field>

          {decision === "reschedule" && (
            <Field label="Nueva fecha" htmlFor={`miss-date-${taskId}`}>
              <Input id={`miss-date-${taskId}`} name="reschedule_to" type="date" min={today} required />
            </Field>
          )}
          {decision === "reprioritize" && (
            <Field label="Nueva prioridad" htmlFor={`miss-priority-${taskId}`}>
              <Select id={`miss-priority-${taskId}`} name="new_priority" defaultValue="media">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>
          )}
          {decision === "break_down" && (
            <Field label="Pasos (uno por línea, máx. 5)" htmlFor={`miss-steps-${taskId}`}>
              <Textarea id={`miss-steps-${taskId}`} name="steps" maxLength={2000} required />
            </Field>
          )}

          {state.error && <p className="text-xs text-bad">{state.error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Aplicar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
