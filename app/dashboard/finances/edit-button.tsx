"use client";

import { Pencil } from "lucide-react";
import { updateTransaction } from "@/lib/actions/finances";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  category: string | null;
  date: string;
  note: string | null;
};

export function EditTransactionButton({ transaction }: { transaction: Transaction }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateTransaction);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar movimiento">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={transaction.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor="edit-tx-type">
              <Select id="edit-tx-type" name="type" defaultValue={transaction.type}>
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
                <option value="ahorro">Ahorro</option>
                <option value="inversion">Inversión</option>
              </Select>
            </Field>

            <Field label="Monto" htmlFor="edit-tx-amount">
              <Input id="edit-tx-amount" name="amount" type="number" min="0" step="any" required defaultValue={transaction.amount} />
            </Field>

            <Field label="Categoría" htmlFor="edit-tx-category">
              <Input id="edit-tx-category" name="category" maxLength={60} defaultValue={transaction.category ?? ""} />
            </Field>

            <Field label="Fecha" htmlFor="edit-tx-date">
              <Input id="edit-tx-date" name="date" type="date" defaultValue={transaction.date} />
            </Field>
          </div>

          <Field label="Nota" htmlFor="edit-tx-note">
            <Input id="edit-tx-note" name="note" maxLength={200} defaultValue={transaction.note ?? ""} />
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
