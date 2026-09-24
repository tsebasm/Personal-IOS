"use client";

import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/lib/actions/types";
import {
  DEVICES,
  DEVICE_LABEL,
  EXECUTION_MODES,
  EXECUTION_MODE_LABEL,
  TASK_LEVERS,
  TASK_LEVER_LABEL,
} from "@/lib/tasks";

export type TaskFormValues = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  energy_required: string | null;
  estimated_minutes: number | null;
  deadline: string | null;
  scheduled_date: string | null;
  area_id: string | null;
  project_id: string | null;
  goal_id: string | null;
  lever: string | null;
  impact_score: number | null;
  effort: number | null;
  execution_mode: string | null;
  device_required: string | null;
};

export type TaskFormOptions = {
  areas: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  goals: { id: string; title: string }[];
};

type Props = TaskFormOptions & {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  initial?: TaskFormValues;
};

const SCALE = ["1", "2", "3", "4", "5"];

/** Formulario único de tarea (crear/editar). Toda acción importante debería colgar de una meta. */
export function TaskFormModal({ action, title, submitLabel, trigger, initial, areas, projects, goals }: Props) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const p = initial ? `task-${initial.id}` : "task-new";

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="flex flex-col gap-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Nombre" htmlFor={`${p}-title`}>
            <Input
              id={`${p}-title`}
              name="title"
              required
              maxLength={120}
              defaultValue={initial?.title}
              placeholder="Contactar 20 prospectos"
            />
          </Field>

          <Field label="Descripción" htmlFor={`${p}-description`}>
            <Textarea id={`${p}-description`} name="description" maxLength={2000} defaultValue={initial?.description ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta" htmlFor={`${p}-goal`}>
              <Select id={`${p}-goal`} name="goal_id" defaultValue={initial?.goal_id ?? ""}>
                <option value="">Sin meta</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Palanca" htmlFor={`${p}-lever`}>
              <Select id={`${p}-lever`} name="lever" defaultValue={initial?.lever ?? ""}>
                <option value="">Sin especificar</option>
                {TASK_LEVERS.map((l) => (
                  <option key={l} value={l}>
                    {TASK_LEVER_LABEL[l]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Área" htmlFor={`${p}-area`}>
              <Select id={`${p}-area`} name="area_id" defaultValue={initial?.area_id ?? ""}>
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Proyecto" htmlFor={`${p}-project`}>
              <Select id={`${p}-project`} name="project_id" defaultValue={initial?.project_id ?? ""}>
                <option value="">Sin proyecto</option>
                {projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Impacto en la meta (1-5)" htmlFor={`${p}-impact`}>
              <Select id={`${p}-impact`} name="impact_score" defaultValue={initial?.impact_score?.toString() ?? ""}>
                <option value="">Sin estimar</option>
                {SCALE.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Esfuerzo (1-5)" htmlFor={`${p}-effort`}>
              <Select id={`${p}-effort`} name="effort" defaultValue={initial?.effort?.toString() ?? ""}>
                <option value="">Sin estimar</option>
                {SCALE.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Modo de ejecución" htmlFor={`${p}-mode`}>
              <Select id={`${p}-mode`} name="execution_mode" defaultValue={initial?.execution_mode ?? ""}>
                <option value="">Sin especificar</option>
                {EXECUTION_MODES.map((m) => (
                  <option key={m} value={m}>
                    {EXECUTION_MODE_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Dispositivo" htmlFor={`${p}-device`}>
              <Select id={`${p}-device`} name="device_required" defaultValue={initial?.device_required ?? ""}>
                <option value="">Sin especificar</option>
                {DEVICES.map((d) => (
                  <option key={d} value={d}>
                    {DEVICE_LABEL[d]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor={`${p}-priority`}>
              <Select id={`${p}-priority`} name="priority" defaultValue={initial?.priority ?? "media"}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Energía" htmlFor={`${p}-energy`}>
              <Select id={`${p}-energy`} name="energy_required" defaultValue={initial?.energy_required ?? ""}>
                <option value="">Sin especificar</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Duración estimada (min)" htmlFor={`${p}-duration`}>
              <Input
                id={`${p}-duration`}
                name="estimated_minutes"
                type="number"
                min="0"
                step="1"
                defaultValue={initial?.estimated_minutes ?? ""}
              />
            </Field>

            {initial && (
              <Field label="Estado" htmlFor={`${p}-status`}>
                <Select id={`${p}-status`} name="status" defaultValue={initial.status}>
                  <option value="inbox">Inbox</option>
                  <option value="next">Next</option>
                  <option value="today">Hoy</option>
                  <option value="in_progress">En progreso</option>
                  <option value="waiting">Esperando</option>
                  <option value="done">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </Select>
              </Field>
            )}

            <Field label="Fecha límite" htmlFor={`${p}-deadline`}>
              <Input id={`${p}-deadline`} name="deadline" type="date" defaultValue={initial?.deadline ?? ""} />
            </Field>

            <Field label="Programar para" htmlFor={`${p}-scheduled`}>
              <Input id={`${p}-scheduled`} name="scheduled_date" type="date" defaultValue={initial?.scheduled_date ?? ""} />
            </Field>
          </div>

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
