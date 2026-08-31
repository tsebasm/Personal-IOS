"use client";

import { createReview } from "@/lib/actions/reviews";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export function CreateReviewButton() {
  const { open, setOpen, state, formAction, pending } = useModalForm(createReview);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva revisión
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva revisión">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Tipo" htmlFor="review-type">
            <Select id="review-type" name="type" defaultValue="semanal">
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde" htmlFor="review-start">
              <Input id="review-start" name="period_start" type="date" required />
            </Field>
            <Field label="Hasta" htmlFor="review-end">
              <Input id="review-end" name="period_end" type="date" required />
            </Field>
          </div>

          <Field label="Notas" htmlFor="review-note">
            <Textarea id="review-note" name="note" rows={4} maxLength={4000} />
          </Field>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar revisión"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
