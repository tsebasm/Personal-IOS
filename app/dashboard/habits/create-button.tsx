"use client";

import { createHabit } from "@/lib/actions/habits";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function CreateHabitButton({ areas }: { areas: { id: string; name: string }[] }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(createHabit);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nuevo hábito
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo hábito">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor="habit-title">
            <Input id="habit-title" name="title" required maxLength={120} placeholder="Entrenar" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="habit-area">
              <Select id="habit-area" name="area_id" defaultValue="">
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Frecuencia" htmlFor="habit-frequency">
              <Select id="habit-frequency" name="frequency" defaultValue="diaria">
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="custom">Personalizada</option>
              </Select>
            </Field>

            <Field label="Objetivo por periodo" htmlFor="habit-target">
              <Input id="habit-target" name="target_per_period" type="number" min="1" step="1" defaultValue={1} />
            </Field>

            <Field label="Hora" htmlFor="habit-time">
              <Input id="habit-time" name="time_of_day" type="time" />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear hábito"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
