"use client";

import { Pencil } from "lucide-react";
import { updateHabit } from "@/lib/actions/habits";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Habit = {
  id: string;
  title: string;
  frequency: string;
  target_per_period: number;
  area_id?: string | null;
  time_of_day?: string | null;
};

export function EditHabitButton({ habit, areas }: { habit: Habit; areas: { id: string; name: string }[] }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateHabit);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar hábito">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={habit.id} />
          <Field label="Nombre" htmlFor="edit-habit-title">
            <Input id="edit-habit-title" name="title" required maxLength={120} defaultValue={habit.title} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="edit-habit-area">
              <Select id="edit-habit-area" name="area_id" defaultValue={habit.area_id ?? ""}>
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Frecuencia" htmlFor="edit-habit-frequency">
              <Select id="edit-habit-frequency" name="frequency" defaultValue={habit.frequency}>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="custom">Personalizada</option>
              </Select>
            </Field>

            <Field label="Objetivo por periodo" htmlFor="edit-habit-target">
              <Input
                id="edit-habit-target"
                name="target_per_period"
                type="number"
                min="1"
                step="1"
                defaultValue={habit.target_per_period}
              />
            </Field>

            <Field label="Hora" htmlFor="edit-habit-time">
              <Input id="edit-habit-time" name="time_of_day" type="time" defaultValue={habit.time_of_day ?? ""} />
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
