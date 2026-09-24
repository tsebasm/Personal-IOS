"use client";

import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/actions/types";

export type ProspectingSession = {
  id: string;
  date: string;
  channel: string;
  contacts_count: number;
  replies_count: number;
  appointments_count: number;
  shows_count: number;
  proposals_count: number;
  followups_count: number;
  clients_closed: number;
  minutes_spent: number | null;
  hypothesis_id: string | null;
  message_variant: string | null;
  offer: string | null;
  notes: string | null;
};

export type HypothesisOption = { id: string; statement: string; status: string };

const COUNTS = [
  { name: "contacts_count", label: "Contactos nuevos" },
  { name: "followups_count", label: "Follow-ups enviados" },
  { name: "replies_count", label: "Respuestas" },
  { name: "appointments_count", label: "Citas agendadas" },
  { name: "shows_count", label: "Citas asistidas" },
  { name: "proposals_count", label: "Propuestas enviadas" },
  { name: "clients_closed", label: "Clientes cerrados" },
] as const;

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  hypotheses: HypothesisOption[];
  initial?: ProspectingSession;
};

/** Formulario único de sesión (crear/editar): embudo completo + atribución a hipótesis. */
export function ProspectingSessionFormModal({ action, title, submitLabel, trigger, hypotheses, initial }: Props) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const p = initial ? `ps-${initial.id}` : "ps-new";
  // Rechazadas solo se ofrecen si esta sesión ya estaba atribuida a una (histórico intacto).
  const options = hypotheses.filter((h) => h.status !== "rejected" || h.id === initial?.hypothesis_id);

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="flex flex-col gap-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" htmlFor={`${p}-date`}>
              <Input id={`${p}-date`} name="date" type="date" defaultValue={initial?.date} />
            </Field>
            <Field label="Medio" htmlFor={`${p}-channel`}>
              <Input
                id={`${p}-channel`}
                name="channel"
                required
                maxLength={80}
                defaultValue={initial?.channel}
                placeholder="Instagram DM, WhatsApp, email, llamada…"
              />
            </Field>
            {COUNTS.map((c) => (
              <Field key={c.name} label={c.label} htmlFor={`${p}-${c.name}`}>
                <Input
                  id={`${p}-${c.name}`}
                  name={c.name}
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={initial?.[c.name] ?? 0}
                />
              </Field>
            ))}
            <Field label="Minutos invertidos" htmlFor={`${p}-minutes`}>
              <Input
                id={`${p}-minutes`}
                name="minutes_spent"
                type="number"
                min="0"
                step="1"
                defaultValue={initial?.minutes_spent ?? ""}
              />
            </Field>
          </div>

          <Field label="Hipótesis que se está probando" htmlFor={`${p}-hypothesis`}>
            <Select id={`${p}-hypothesis`} name="hypothesis_id" defaultValue={initial?.hypothesis_id ?? ""}>
              <option value="">— Sin atribuir —</option>
              {options.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.statement.slice(0, 80)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Variante de mensaje" htmlFor={`${p}-variant`}>
              <Input
                id={`${p}-variant`}
                name="message_variant"
                maxLength={80}
                defaultValue={initial?.message_variant ?? ""}
                placeholder="v4, A, B…"
              />
            </Field>
            <Field label="Oferta utilizada" htmlFor={`${p}-offer`}>
              <Input id={`${p}-offer`} name="offer" maxLength={200} defaultValue={initial?.offer ?? ""} />
            </Field>
          </div>

          <Field label="Notas" htmlFor={`${p}-notes`}>
            <Textarea id={`${p}-notes`} name="notes" maxLength={2000} defaultValue={initial?.notes ?? ""} />
          </Field>

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
