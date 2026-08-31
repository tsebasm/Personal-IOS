"use client";

import { Pencil } from "lucide-react";
import { updateReview } from "@/lib/actions/reviews";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Review = { id: string; type: string; period_start: string; period_end: string; note?: string };

export function EditReviewButton({ review }: { review: Review }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateReview);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar revisión">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={review.id} />
          <Field label="Tipo" htmlFor="edit-review-type">
            <Select id="edit-review-type" name="type" defaultValue={review.type}>
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio" htmlFor="edit-review-start">
              <Input id="edit-review-start" name="period_start" type="date" required defaultValue={review.period_start} />
            </Field>
            <Field label="Fin" htmlFor="edit-review-end">
              <Input id="edit-review-end" name="period_end" type="date" required defaultValue={review.period_end} />
            </Field>
          </div>

          <Field label="Notas" htmlFor="edit-review-note">
            <Textarea id="edit-review-note" name="note" maxLength={4000} defaultValue={review.note ?? ""} />
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
