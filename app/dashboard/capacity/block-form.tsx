"use client";

import { Pencil } from "lucide-react";
import { createCapacityBlock, updateCapacityBlock } from "@/lib/actions/capacity";
import type { ActionState } from "@/lib/actions/types";
import { CAPACITY_KINDS, CAPACITY_KIND_LABEL, type CapacityBlock } from "@/lib/engine/capacity";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function BlockFormModal({
  action,
  title,
  submitLabel,
  trigger,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  initial?: CapacityBlock;
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const p = initial ? `cap-${initial.id}` : "cap-new";

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="flex flex-col gap-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" htmlFor={`${p}-label`}>
              <Input id={`${p}-label`} name="label" required maxLength={80} defaultValue={initial?.label} placeholder="Bus a la U" />
            </Field>
            <Field label="Tipo" htmlFor={`${p}-kind`}>
              <Select id={`${p}-kind`} name="kind" defaultValue={initial?.kind ?? "deep"}>
                {CAPACITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CAPACITY_KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Inicio" htmlFor={`${p}-start`}>
              <Input id={`${p}-start`} name="start_time" type="time" required defaultValue={initial?.start_time.slice(0, 5)} />
            </Field>
            <Field label="Fin (si es antes del inicio, cruza medianoche)" htmlFor={`${p}-end`}>
              <Input id={`${p}-end`} name="end_time" type="time" required defaultValue={initial?.end_time.slice(0, 5)} />
            </Field>
          </div>

          <fieldset>
            <legend className="text-xs text-ink-dim mb-1.5">Días</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1 text-sm text-ink">
                  <input type="checkbox" name="days_of_week" value={i} defaultChecked={initial?.days_of_week.includes(i)} />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vigente desde (opcional)" htmlFor={`${p}-from`}>
              <Input id={`${p}-from`} name="valid_from" type="date" defaultValue={initial?.valid_from ?? ""} />
            </Field>
            <Field label="Vigente hasta (opcional)" htmlFor={`${p}-to`}>
              <Input id={`${p}-to`} name="valid_to" type="date" defaultValue={initial?.valid_to ?? ""} />
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

export function CreateBlockButton() {
  return (
    <BlockFormModal
      action={createCapacityBlock}
      title="Nuevo bloque"
      submitLabel="Crear bloque"
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nuevo bloque
        </Button>
      )}
    />
  );
}

export function EditBlockButton({ block }: { block: CapacityBlock }) {
  return (
    <BlockFormModal
      action={updateCapacityBlock}
      title="Editar bloque"
      submitLabel="Guardar cambios"
      initial={block}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
