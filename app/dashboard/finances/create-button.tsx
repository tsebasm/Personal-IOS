"use client";

import { createTransaction } from "@/lib/actions/finances";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function CreateTransactionButton() {
  const { open, setOpen, state, formAction, pending } = useModalForm(createTransaction);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nuevo movimiento
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo movimiento">
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor="tx-type">
              <Select id="tx-type" name="type" defaultValue="gasto">
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
                <option value="ahorro">Ahorro</option>
                <option value="inversion">Inversión</option>
              </Select>
            </Field>

            <Field label="Monto" htmlFor="tx-amount">
              <Input id="tx-amount" name="amount" type="number" min="0" step="any" required />
            </Field>

            <Field label="Categoría" htmlFor="tx-category">
              <Input id="tx-category" name="category" maxLength={60} />
            </Field>

            <Field label="Fecha" htmlFor="tx-date">
              <Input id="tx-date" name="date" type="date" />
            </Field>
          </div>

          <Field label="Nota" htmlFor="tx-note">
            <Input id="tx-note" name="note" maxLength={200} />
          </Field>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar movimiento"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
