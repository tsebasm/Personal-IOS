"use client";

import { Pencil } from "lucide-react";
import { createHabit, updateHabit } from "@/lib/actions/habits";
import type { ActionState } from "@/lib/actions/types";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type HabitFormValues = {
  id: string;
  title: string;
  frequency: string;
  target_per_period: number;
  days_of_week: number[] | null;
  area_id: string | null;
  goal_id: string | null;
  time_of_day: string | null;
};

type Options = { areas: { id: string; name: string }[]; goals: { id: string; title: string }[] };

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function HabitFormModal({
  action,
  title,
  submitLabel,
  trigger,
  initial,
  areas,
  goals,
}: Options & {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  initial?: HabitFormValues;
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const p = initial ? `habit-${initial.id}` : "habit-new";

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="flex flex-col gap-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Nombre" htmlFor={`${p}-title`}>
            <Input id={`${p}-title`} name="title" required maxLength={120} defaultValue={initial?.title} placeholder="Gym" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta que sostiene (SER → TENER)" htmlFor={`${p}-goal`}>
              <Select id={`${p}-goal`} name="goal_id" defaultValue={initial?.goal_id ?? ""}>
                <option value="">Sin meta</option>
                {goals.map((g) => (
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
            <Field label="Frecuencia" htmlFor={`${p}-frequency`}>
              <Select id={`${p}-frequency`} name="frequency" defaultValue={initial?.frequency ?? "diaria"}>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal (N veces por semana)</option>
                <option value="custom">Días específicos</option>
              </Select>
            </Field>
            <Field label="Veces por semana (si es semanal)" htmlFor={`${p}-target`}>
              <Input
                id={`${p}-target`}
                name="target_per_period"
                type="number"
                min="1"
                max="7"
                step="1"
                defaultValue={initial?.target_per_period ?? 1}
              />
            </Field>
            <Field label="Hora" htmlFor={`${p}-time`}>
              <Input id={`${p}-time`} name="time_of_day" type="time" defaultValue={initial?.time_of_day?.slice(0, 5) ?? ""} />
            </Field>
          </div>

          <fieldset>
            <legend className="text-xs text-ink-dim mb-1.5">Días (si son días específicos)</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1 text-sm text-ink">
                  <input type="checkbox" name="days_of_week" value={i} defaultChecked={initial?.days_of_week?.includes(i)} />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>

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

export function CreateHabitButton(options: Options) {
  return (
    <HabitFormModal
      {...options}
      action={createHabit}
      title="Nuevo hábito"
      submitLabel="Crear hábito"
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nuevo hábito
        </Button>
      )}
    />
  );
}

export function EditHabitButton({ habit, ...options }: Options & { habit: HabitFormValues }) {
  return (
    <HabitFormModal
      {...options}
      action={updateHabit}
      title="Editar hábito"
      submitLabel="Guardar cambios"
      initial={habit}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
