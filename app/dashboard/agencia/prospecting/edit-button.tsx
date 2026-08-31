"use client";

import { Pencil } from "lucide-react";
import { updateProspectingSession } from "@/lib/actions/prospecting";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Session = {
  id: string;
  date: string;
  channel: string;
  contacts_count: number;
  replies_count: number;
  appointments_count: number;
  clients_closed: number;
  offer: string | null;
  notes: string | null;
};

export function EditProspectingButton({ session }: { session: Session }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateProspectingSession);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar sesión">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={session.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" htmlFor="edit-prospecting-date">
              <Input id="edit-prospecting-date" name="date" type="date" defaultValue={session.date} />
            </Field>
            <Field label="Medio" htmlFor="edit-prospecting-channel">
              <Input id="edit-prospecting-channel" name="channel" required maxLength={80} defaultValue={session.channel} />
            </Field>
            <Field label="Contactos" htmlFor="edit-prospecting-contacts">
              <Input
                id="edit-prospecting-contacts"
                name="contacts_count"
                type="number"
                min="0"
                step="1"
                defaultValue={session.contacts_count}
              />
            </Field>
            <Field label="Respuestas" htmlFor="edit-prospecting-replies">
              <Input
                id="edit-prospecting-replies"
                name="replies_count"
                type="number"
                min="0"
                step="1"
                defaultValue={session.replies_count}
              />
            </Field>
            <Field label="Citas agendadas" htmlFor="edit-prospecting-appointments">
              <Input
                id="edit-prospecting-appointments"
                name="appointments_count"
                type="number"
                min="0"
                step="1"
                defaultValue={session.appointments_count}
              />
            </Field>
            <Field label="Clientes cerrados" htmlFor="edit-prospecting-closed">
              <Input
                id="edit-prospecting-closed"
                name="clients_closed"
                type="number"
                min="0"
                step="1"
                defaultValue={session.clients_closed}
              />
            </Field>
          </div>

          <Field label="Oferta utilizada" htmlFor="edit-prospecting-offer">
            <Input id="edit-prospecting-offer" name="offer" maxLength={200} defaultValue={session.offer ?? ""} />
          </Field>

          <Field label="Notas" htmlFor="edit-prospecting-notes">
            <Textarea id="edit-prospecting-notes" name="notes" maxLength={2000} defaultValue={session.notes ?? ""} />
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
