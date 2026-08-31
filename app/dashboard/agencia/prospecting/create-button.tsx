"use client";

import { createProspectingSession } from "@/lib/actions/prospecting";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateProspectingButton() {
  const { open, setOpen, state, formAction, pending } = useModalForm(createProspectingSession);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva sesión
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva sesión de prospección">
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" htmlFor="prospecting-date">
              <Input id="prospecting-date" name="date" type="date" />
            </Field>
            <Field label="Medio" htmlFor="prospecting-channel">
              <Input id="prospecting-channel" name="channel" required maxLength={80} placeholder="LinkedIn, WhatsApp, Cold call…" />
            </Field>
            <Field label="Contactos" htmlFor="prospecting-contacts">
              <Input id="prospecting-contacts" name="contacts_count" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Respuestas" htmlFor="prospecting-replies">
              <Input id="prospecting-replies" name="replies_count" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Citas agendadas" htmlFor="prospecting-appointments">
              <Input id="prospecting-appointments" name="appointments_count" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Clientes cerrados" htmlFor="prospecting-closed">
              <Input id="prospecting-closed" name="clients_closed" type="number" min="0" step="1" defaultValue={0} />
            </Field>
          </div>

          <Field label="Oferta utilizada" htmlFor="prospecting-offer">
            <Input id="prospecting-offer" name="offer" maxLength={200} />
          </Field>

          <Field label="Notas" htmlFor="prospecting-notes">
            <Textarea id="prospecting-notes" name="notes" maxLength={2000} />
          </Field>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar sesión"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
