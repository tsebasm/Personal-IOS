"use client";

import { createCampaign } from "@/lib/actions/campaigns";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function CreateCampaignButton() {
  const { open, setOpen, state, formAction, pending } = useModalForm(createCampaign);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva campaña
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva campaña">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor="campaign-name">
            <Input id="campaign-name" name="name" required maxLength={120} placeholder="Meta Ads — Enero" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio" htmlFor="campaign-start">
              <Input id="campaign-start" name="start_date" type="date" />
            </Field>
            <Field label="Fecha de fin (opcional)" htmlFor="campaign-end">
              <Input id="campaign-end" name="end_date" type="date" />
            </Field>
            <Field label="Estado" htmlFor="campaign-status">
              <Select id="campaign-status" name="status" defaultValue="activa">
                <option value="activa">Activa</option>
                <option value="pausada">Pausada</option>
                <option value="finalizada">Finalizada</option>
              </Select>
            </Field>
            <Field label="Gasto en pauta" htmlFor="campaign-spend">
              <Input id="campaign-spend" name="spend" type="number" min="0" step="any" defaultValue={0} />
            </Field>
            <Field label="Leads" htmlFor="campaign-leads">
              <Input id="campaign-leads" name="leads" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Leads calificados" htmlFor="campaign-qualified">
              <Input id="campaign-qualified" name="qualified_leads" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Formularios completados" htmlFor="campaign-forms">
              <Input id="campaign-forms" name="forms_completed" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Llamadas agendadas" htmlFor="campaign-scheduled">
              <Input id="campaign-scheduled" name="calls_scheduled" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Llamadas asistidas" htmlFor="campaign-attended">
              <Input id="campaign-attended" name="calls_attended" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Llamadas totales acumuladas" htmlFor="campaign-total-calls">
              <Input id="campaign-total-calls" name="calls_total_accumulated" type="number" min="0" step="1" defaultValue={0} />
            </Field>
            <Field label="Meta de llamadas" htmlFor="campaign-goal">
              <Input id="campaign-goal" name="calls_goal" type="number" min="0" step="1" placeholder="30" />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear campaña"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
