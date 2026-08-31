"use client";

import { Pencil } from "lucide-react";
import { updateCampaign } from "@/lib/actions/campaigns";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Campaign = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  spend: number;
  leads: number;
  qualified_leads: number;
  forms_completed: number;
  calls_scheduled: number;
  calls_attended: number;
  calls_total_accumulated: number;
  calls_goal: number | null;
};

export function EditCampaignButton({ campaign }: { campaign: Campaign }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateCampaign);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar campaña">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={campaign.id} />
          <Field label="Nombre" htmlFor="edit-campaign-name">
            <Input id="edit-campaign-name" name="name" required maxLength={120} defaultValue={campaign.name} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio" htmlFor="edit-campaign-start">
              <Input id="edit-campaign-start" name="start_date" type="date" defaultValue={campaign.start_date} />
            </Field>
            <Field label="Fecha de fin" htmlFor="edit-campaign-end">
              <Input id="edit-campaign-end" name="end_date" type="date" defaultValue={campaign.end_date ?? ""} />
            </Field>
            <Field label="Estado" htmlFor="edit-campaign-status">
              <Select id="edit-campaign-status" name="status" defaultValue={campaign.status}>
                <option value="activa">Activa</option>
                <option value="pausada">Pausada</option>
                <option value="finalizada">Finalizada</option>
              </Select>
            </Field>
            <Field label="Gasto en pauta" htmlFor="edit-campaign-spend">
              <Input id="edit-campaign-spend" name="spend" type="number" min="0" step="any" defaultValue={campaign.spend} />
            </Field>
            <Field label="Leads" htmlFor="edit-campaign-leads">
              <Input id="edit-campaign-leads" name="leads" type="number" min="0" step="1" defaultValue={campaign.leads} />
            </Field>
            <Field label="Leads calificados" htmlFor="edit-campaign-qualified">
              <Input
                id="edit-campaign-qualified"
                name="qualified_leads"
                type="number"
                min="0"
                step="1"
                defaultValue={campaign.qualified_leads}
              />
            </Field>
            <Field label="Formularios completados" htmlFor="edit-campaign-forms">
              <Input
                id="edit-campaign-forms"
                name="forms_completed"
                type="number"
                min="0"
                step="1"
                defaultValue={campaign.forms_completed}
              />
            </Field>
            <Field label="Llamadas agendadas" htmlFor="edit-campaign-scheduled">
              <Input
                id="edit-campaign-scheduled"
                name="calls_scheduled"
                type="number"
                min="0"
                step="1"
                defaultValue={campaign.calls_scheduled}
              />
            </Field>
            <Field label="Llamadas asistidas" htmlFor="edit-campaign-attended">
              <Input
                id="edit-campaign-attended"
                name="calls_attended"
                type="number"
                min="0"
                step="1"
                defaultValue={campaign.calls_attended}
              />
            </Field>
            <Field label="Llamadas totales acumuladas" htmlFor="edit-campaign-total-calls">
              <Input
                id="edit-campaign-total-calls"
                name="calls_total_accumulated"
                type="number"
                min="0"
                step="1"
                defaultValue={campaign.calls_total_accumulated}
              />
            </Field>
            <Field label="Meta de llamadas" htmlFor="edit-campaign-goal">
              <Input
                id="edit-campaign-goal"
                name="calls_goal"
                type="number"
                min="0"
                step="1"
                defaultValue={campaign.calls_goal ?? ""}
              />
            </Field>
          </div>

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
