"use client";

import { Pencil } from "lucide-react";
import { updateVantClient } from "@/lib/actions/vant-clients";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Client = {
  id: string;
  name: string;
  start_date: string;
  status: string;
  setup_fee: number;
  commission_type: string;
  commission_value: number;
  monthly_fee: number;
  additional_commission: number;
  ad_spend: number;
};

export function EditVantClientButton({ client }: { client: Client }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateVantClient);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar cliente">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={client.id} />
          <Field label="Nombre" htmlFor="edit-client-name">
            <Input id="edit-client-name" name="name" required maxLength={120} defaultValue={client.name} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de cierre" htmlFor="edit-client-start">
              <Input id="edit-client-start" name="start_date" type="date" defaultValue={client.start_date} />
            </Field>
            <Field label="Estado" htmlFor="edit-client-status">
              <Select id="edit-client-status" name="status" defaultValue={client.status}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </Field>
            <Field label="Setup" htmlFor="edit-client-setup">
              <Input id="edit-client-setup" name="setup_fee" type="number" min="0" step="any" defaultValue={client.setup_fee} />
            </Field>
            <Field label="Fee mensual" htmlFor="edit-client-fee">
              <Input id="edit-client-fee" name="monthly_fee" type="number" min="0" step="any" defaultValue={client.monthly_fee} />
            </Field>
            <Field label="Tipo de comisión" htmlFor="edit-client-commission-type">
              <Select id="edit-client-commission-type" name="commission_type" defaultValue={client.commission_type}>
                <option value="porcentaje">% sobre inversión publicitaria</option>
                <option value="fijo">Valor fijo mensual</option>
              </Select>
            </Field>
            <Field label="Valor de comisión" htmlFor="edit-client-commission-value">
              <Input
                id="edit-client-commission-value"
                name="commission_value"
                type="number"
                min="0"
                step="any"
                defaultValue={client.commission_value}
              />
            </Field>
            <Field label="Comisión adicional" htmlFor="edit-client-additional">
              <Input
                id="edit-client-additional"
                name="additional_commission"
                type="number"
                min="0"
                step="any"
                defaultValue={client.additional_commission}
              />
            </Field>
            <Field label="Inversión publicitaria" htmlFor="edit-client-ad-spend">
              <Input id="edit-client-ad-spend" name="ad_spend" type="number" min="0" step="any" defaultValue={client.ad_spend} />
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
