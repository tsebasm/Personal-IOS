"use client";

import { Pencil } from "lucide-react";
import { updateArea } from "@/lib/actions/areas";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function EditAreaButton({ area }: { area: { id: string; name: string; color: string | null } }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateArea);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Editar"
        className="text-ink-dim hover:text-ink"
      >
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar área">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={area.id} />
          <Field label="Nombre" htmlFor="edit-area-name">
            <Input id="edit-area-name" name="name" required maxLength={80} defaultValue={area.name} />
          </Field>
          <Field label="Color" htmlFor="edit-area-color">
            <Input id="edit-area-color" name="color" maxLength={20} defaultValue={area.color ?? ""} placeholder="#16161A" />
          </Field>

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
