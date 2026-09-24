"use client";

import { Pencil } from "lucide-react";
import { createExperiment, updateExperiment } from "@/lib/actions/experiments";
import type { ActionState } from "@/lib/actions/types";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type Experiment = {
  id: string;
  name: string;
  hypothesis_id: string | null;
  metric_key: string;
  variants: string[];
  sample_target: number;
  started_on: string;
  ended_on: string | null;
  status: "running" | "finished";
  decision: "keep" | "change" | "inconclusive" | null;
  learning: string | null;
};

export const METRIC_LABEL: Record<string, string> = {
  reply_rate: "Tasa de respuesta",
  booking_rate: "Tasa de agendamiento",
  show_rate: "Tasa de asistencia",
  close_rate: "Tasa de cierre",
};

type HypothesisOption = { id: string; statement: string };

function ExperimentFormModal({
  action,
  title,
  submitLabel,
  trigger,
  initial,
  hypotheses,
  today,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  initial?: Experiment;
  hypotheses: HypothesisOption[];
  today: string;
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const p = initial ? `exp-${initial.id}` : "exp-new";
  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="flex flex-col gap-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Nombre" htmlFor={`${p}-name`}>
            <Input id={`${p}-name`} name="name" required maxLength={120} defaultValue={initial?.name} placeholder="Mensaje v4 vs v5" />
          </Field>
          <Field label="Hipótesis que prueba" htmlFor={`${p}-hyp`}>
            <Select id={`${p}-hyp`} name="hypothesis_id" defaultValue={initial?.hypothesis_id ?? ""}>
              <option value="">— Sin hipótesis —</option>
              {hypotheses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.statement.slice(0, 80)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Métrica" htmlFor={`${p}-metric`}>
              <Select id={`${p}-metric`} name="metric_key" defaultValue={initial?.metric_key ?? "reply_rate"}>
                {Object.entries(METRIC_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Muestra por variante" htmlFor={`${p}-sample`}>
              <Input id={`${p}-sample`} name="sample_target" type="number" min="1" step="1" required defaultValue={initial?.sample_target ?? 100} />
            </Field>
            <Field label="Variantes (separadas por coma)" htmlFor={`${p}-variants`}>
              <Input id={`${p}-variants`} name="variants" required defaultValue={initial?.variants.join(", ") ?? "A, B"} />
            </Field>
            <Field label="Estado" htmlFor={`${p}-status`}>
              <Select id={`${p}-status`} name="status" defaultValue={initial?.status ?? "running"}>
                <option value="running">En curso</option>
                <option value="finished">Terminado</option>
              </Select>
            </Field>
            <Field label="Inicio" htmlFor={`${p}-start`}>
              <Input id={`${p}-start`} name="started_on" type="date" required defaultValue={initial?.started_on ?? today} />
            </Field>
            <Field label="Fin" htmlFor={`${p}-end`}>
              <Input id={`${p}-end`} name="ended_on" type="date" defaultValue={initial?.ended_on ?? ""} />
            </Field>
            <Field label="Decisión (al terminar)" htmlFor={`${p}-decision`}>
              <Select id={`${p}-decision`} name="decision" defaultValue={initial?.decision ?? ""}>
                <option value="">—</option>
                <option value="keep">Mantener</option>
                <option value="change">Cambiar</option>
                <option value="inconclusive">No concluyente</option>
              </Select>
            </Field>
          </div>
          <Field label="Aprendizaje (se guarda en la memoria al terminar)" htmlFor={`${p}-learning`}>
            <Textarea id={`${p}-learning`} name="learning" maxLength={4000} defaultValue={initial?.learning ?? ""} />
          </Field>
          {state.error && <p className="text-xs text-bad">{state.error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function CreateExperimentButton(props: { hypotheses: HypothesisOption[]; today: string }) {
  return (
    <ExperimentFormModal
      {...props}
      action={createExperiment}
      title="Nuevo experimento"
      submitLabel="Crear experimento"
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nuevo experimento
        </Button>
      )}
    />
  );
}

export function EditExperimentButton(props: { experiment: Experiment; hypotheses: HypothesisOption[]; today: string }) {
  return (
    <ExperimentFormModal
      hypotheses={props.hypotheses}
      today={props.today}
      initial={props.experiment}
      action={updateExperiment}
      title="Editar experimento"
      submitLabel="Guardar cambios"
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
