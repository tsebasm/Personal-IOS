"use client";

import { createVantClient } from "@/lib/actions/vant-clients";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function CreateVantClientButton() {
  const { open, setOpen, state, formAction, pending } = useModalForm(createVantClient);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nuevo cliente
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente VANT">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor="client-name">
            <Input id="client-name" name="name" required maxLength={120} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de cierre" htmlFor="client-start">
              <Input id="client-start" name="start_date" type="date" />
            </Field>
            <Field label="Estado" htmlFor="client-status">
              <Select id="client-status" name="status" defaultValue="activo">
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </Field>
            <Field label="Setup" htmlFor="client-setup">
              <Input id="client-setup" name="setup_fee" type="number" min="0" step="any" defaultValue={0} />
            </Field>
            <Field label="Fee mensual" htmlFor="client-fee">
              <Input id="client-fee" name="monthly_fee" type="number" min="0" step="any" defaultValue={0} />
            </Field>
            <Field label="Tipo de comisión" htmlFor="client-commission-type">
              <Select id="client-commission-type" name="commission_type" defaultValue="porcentaje">
                <option value="porcentaje">% sobre inversión publicitaria</option>
                <option value="fijo">Valor fijo mensual</option>
              </Select>
            </Field>
            <Field label="Valor de comisión" htmlFor="client-commission-value">
              <Input id="client-commission-value" name="commission_value" type="number" min="0" step="any" defaultValue={0} />
            </Field>
            <Field label="Comisión adicional" htmlFor="client-additional">
              <Input id="client-additional" name="additional_commission" type="number" min="0" step="any" defaultValue={0} />
            </Field>
            <Field label="Inversión publicitaria" htmlFor="client-ad-spend">
              <Input id="client-ad-spend" name="ad_spend" type="number" min="0" step="any" defaultValue={500000} />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
