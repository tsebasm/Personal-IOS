"use client";

import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/lib/actions/types";

export type GoalFormValues = {
  id: string;
  title: string;
  description: string | null;
  area_id: string | null;
  parent_goal_id: string | null;
  horizon: string;
  kind: string;
  priority: string;
  baseline_value: number | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  start_date: string | null;
  deadline: string | null;
  status: string;
};

type Option = { id: string; name: string };

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  areas: Option[];
  /** Metas candidatas a meta padre (la propia se excluye al editar). */
  parents: { id: string; title: string }[];
  initial?: GoalFormValues;
  isNorthStar?: boolean;
};

/** Formulario único de meta (crear/editar): Punto A → Punto B, deadline, jerarquía y meta principal. */
export function GoalFormModal({ action, title, submitLabel, trigger, areas, parents, initial, isNorthStar }: Props) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const p = initial ? `goal-${initial.id}` : "goal-new";

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
              placeholder="Facturación acumulada VANT"
            />
          </Field>

          <Field label="Descripción" htmlFor={`${p}-description`}>
            <Textarea id={`${p}-description`} name="description" maxLength={2000} defaultValue={initial?.description ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta padre" htmlFor={`${p}-parent`}>
              <Select id={`${p}-parent`} name="parent_goal_id" defaultValue={initial?.parent_goal_id ?? ""}>
                <option value="">Ninguna (meta raíz)</option>
                {parents.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
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

            <Field label="Horizonte" htmlFor={`${p}-horizon`}>
              <Select id={`${p}-horizon`} name="horizon" defaultValue={initial?.horizon ?? "anual"}>
                <option value="largo_plazo">Largo plazo</option>
                <option value="anual">Anual</option>
                <option value="trimestral">Trimestral</option>
                <option value="mensual">Mensual</option>
              </Select>
            </Field>

            <Field label="Tipo" htmlFor={`${p}-kind`}>
              <Select id={`${p}-kind`} name="kind" defaultValue={initial?.kind ?? "metric"}>
                <option value="metric">Métrica (número)</option>
                <option value="milestone">Hito (sí/no)</option>
                <option value="ongoing">Continua</option>
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor={`${p}-priority`}>
              <Select id={`${p}-priority`} name="priority" defaultValue={initial?.priority ?? "media"}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Unidad" htmlFor={`${p}-unit`}>
              <Input id={`${p}-unit`} name="unit" maxLength={40} defaultValue={initial?.unit ?? ""} placeholder="COP, clientes…" />
            </Field>

            <Field label="Punto A (valor inicial)" htmlFor={`${p}-baseline`}>
              <Input
                id={`${p}-baseline`}
                name="baseline_value"
                type="number"
                step="any"
                defaultValue={initial?.baseline_value ?? ""}
              />
            </Field>

            <Field label="Punto B (valor objetivo)" htmlFor={`${p}-target`}>
              <Input id={`${p}-target`} name="target_value" type="number" step="any" defaultValue={initial?.target_value ?? ""} />
            </Field>

            {initial && (
              <Field label="Valor actual" htmlFor={`${p}-current`}>
                <Input
                  id={`${p}-current`}
                  name="current_value"
                  type="number"
                  step="any"
                  defaultValue={initial.current_value ?? ""}
                />
              </Field>
            )}

            {initial && (
              <Field label="Estado" htmlFor={`${p}-status`}>
                <Select id={`${p}-status`} name="status" defaultValue={initial.status}>
                  <option value="activo">Activa</option>
                  <option value="pausado">Pausada</option>
                  <option value="cumplido">Cumplida</option>
                  <option value="cancelado">Cancelada</option>
                </Select>
              </Field>
            )}

            <Field label="Fecha de inicio" htmlFor={`${p}-start`}>
              <Input id={`${p}-start`} name="start_date" type="date" defaultValue={initial?.start_date ?? ""} />
            </Field>

            <Field label="Deadline" htmlFor={`${p}-deadline`}>
              <Input id={`${p}-deadline`} name="deadline" type="date" defaultValue={initial?.deadline ?? ""} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="is_north_star" defaultChecked={isNorthStar} />
            Meta principal (North Star) — la que el sistema prioriza cada día
          </label>

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
