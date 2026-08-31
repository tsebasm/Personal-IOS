"use client";

import { Pencil } from "lucide-react";
import { updateGoal } from "@/lib/actions/goals";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  horizon: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  deadline: string | null;
  status: string;
  area_id?: string | null;
  priority?: string;
};

export function EditGoalButton({ goal, areas }: { goal: Goal; areas: { id: string; name: string }[] }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateGoal);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar meta">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={goal.id} />
          <Field label="Nombre" htmlFor="edit-goal-title">
            <Input id="edit-goal-title" name="title" required maxLength={120} defaultValue={goal.title} />
          </Field>

          <Field label="Descripción" htmlFor="edit-goal-description">
            <Textarea id="edit-goal-description" name="description" maxLength={2000} defaultValue={goal.description ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="edit-goal-area">
              <Select id="edit-goal-area" name="area_id" defaultValue={goal.area_id ?? ""}>
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Horizonte" htmlFor="edit-goal-horizon">
              <Select id="edit-goal-horizon" name="horizon" defaultValue={goal.horizon}>
                <option value="largo_plazo">Largo plazo</option>
                <option value="anual">Anual</option>
                <option value="trimestral">Trimestral</option>
                <option value="mensual">Mensual</option>
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor="edit-goal-priority">
              <Select id="edit-goal-priority" name="priority" defaultValue={goal.priority ?? "media"}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Estado" htmlFor="edit-goal-status">
              <Select id="edit-goal-status" name="status" defaultValue={goal.status}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cumplido">Cumplido</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </Field>

            <Field label="Fecha objetivo" htmlFor="edit-goal-deadline">
              <Input id="edit-goal-deadline" name="deadline" type="date" defaultValue={goal.deadline ?? ""} />
            </Field>

            <Field label="Valor objetivo" htmlFor="edit-goal-target">
              <Input id="edit-goal-target" name="target_value" type="number" min="0" step="any" defaultValue={goal.target_value ?? ""} />
            </Field>

            <Field label="Valor actual" htmlFor="edit-goal-current">
              <Input id="edit-goal-current" name="current_value" type="number" min="0" step="any" defaultValue={goal.current_value ?? ""} />
            </Field>

            <Field label="Unidad" htmlFor="edit-goal-unit">
              <Input id="edit-goal-unit" name="unit" maxLength={40} defaultValue={goal.unit ?? ""} />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
