"use client";

import { createNote } from "@/lib/actions/knowledge";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateNoteButton() {
  const { open, setOpen, state, formAction, pending } = useModalForm(createNote);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva nota
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva nota">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Título" htmlFor="note-title">
            <Input id="note-title" name="title" required maxLength={160} />
          </Field>

          <Field label="Contenido" htmlFor="note-body">
            <Textarea id="note-body" name="body" rows={5} maxLength={4000} />
          </Field>

          <Field label="Categoría" htmlFor="note-category">
            <Input id="note-category" name="category" maxLength={60} placeholder="Concepto, idea, decisión…" />
          </Field>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar nota"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
