"use client";

import { Pencil } from "lucide-react";
import { updateNote } from "@/lib/actions/knowledge";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Note = { id: string; title: string; body?: string | null; category?: string | null };

export function EditNoteButton({ note }: { note: Note }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateNote);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar nota">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={note.id} />
          <Field label="Título" htmlFor="edit-note-title">
            <Input id="edit-note-title" name="title" required maxLength={160} defaultValue={note.title} />
          </Field>

          <Field label="Contenido" htmlFor="edit-note-body">
            <Textarea id="edit-note-body" name="body" rows={5} maxLength={4000} defaultValue={note.body ?? ""} />
          </Field>

          <Field label="Categoría" htmlFor="edit-note-category">
            <Input id="edit-note-category" name="category" maxLength={60} defaultValue={note.category ?? ""} />
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
