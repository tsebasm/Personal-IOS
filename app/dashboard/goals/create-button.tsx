"use client";

import { createGoal } from "@/lib/actions/goals";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export function CreateGoalButton({ areas }: { areas: { id: string; name: string }[] }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(createGoal);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva meta
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva meta">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor="goal-title">
            <Input id="goal-title" name="title" required maxLength={120} placeholder="Generar 20M COP" />
          </Field>

          <Field label="Descripción" htmlFor="goal-description">
            <Textarea id="goal-description" name="description" maxLength={2000} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="goal-area">
              <Select id="goal-area" name="area_id" defaultValue="">
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Horizonte" htmlFor="goal-horizon">
              <Select id="goal-horizon" name="horizon" defaultValue="anual">
                <option value="largo_plazo">Largo plazo</option>
                <option value="anual">Anual</option>
                <option value="trimestral">Trimestral</option>
                <option value="mensual">Mensual</option>
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor="goal-priority">
              <Select id="goal-priority" name="priority" defaultValue="media">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Fecha objetivo" htmlFor="goal-deadline">
              <Input id="goal-deadline" name="deadline" type="date" />
            </Field>

            <Field label="Valor objetivo" htmlFor="goal-target">
              <Input id="goal-target" name="target_value" type="number" min="0" step="any" />
            </Field>

            <Field label="Unidad" htmlFor="goal-unit">
              <Input id="goal-unit" name="unit" maxLength={40} placeholder="COP, kg, %…" />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear meta"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
