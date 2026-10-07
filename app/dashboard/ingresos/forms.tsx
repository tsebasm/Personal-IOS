"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordFxRate, recordReceipt, reverseReceipt } from "@/lib/actions/revenue";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { REVENUE_CONCEPTS } from "@/lib/domain/finance";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export const CONCEPT_LABEL: Record<(typeof REVENUE_CONCEPTS)[number], string> = {
  setup: "Setup",
  monthly_fee: "Cuota mensual",
  commission: "Comisión",
  additional_commission: "Comisión adicional",
  other: "Otro",
};

function Feedback({ state, ok }: { state: ActionState; ok: string }) {
  if (state.error) return <p className="text-xs text-warn">{state.error}</p>;
  if (state.ok) return <p className="text-xs text-good">{ok}</p>;
  return null;
}

/** Limpia el formulario tras guardar con éxito (registro rápido, varios seguidos). */
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function ReceiptForm({ clients, today }: { clients: { id: string; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState(recordReceipt, initialActionState);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Cliente" htmlFor="rc-client">
          <Select id="rc-client" name="vant_client_id" defaultValue="">
            <option value="">— Otro (escribe quién pagó) —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quién pagó (si no es un cliente)" htmlFor="rc-cp">
          <Input id="rc-cp" name="counterparty" placeholder="Nombre" />
        </Field>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Monto recibido" htmlFor="rc-amount">
          <Input id="rc-amount" name="amount" type="number" inputMode="decimal" step="any" min="0" required />
        </Field>
        <Field label="Moneda" htmlFor="rc-cur">
          <Input id="rc-cur" name="currency" defaultValue="COP" maxLength={3} required />
        </Field>
        <Field label="Fecha" htmlFor="rc-date">
          <Input id="rc-date" name="date" type="date" defaultValue={today} max={today} required />
        </Field>
        <Field label="Hora" htmlFor="rc-time">
          <Input id="rc-time" name="time" type="time" defaultValue="12:00" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Concepto" htmlFor="rc-concept">
          <Select id="rc-concept" name="concept" defaultValue="monthly_fee">
            {REVENUE_CONCEPTS.map((c) => (
              <option key={c} value={c}>
                {CONCEPT_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Referencia (n.º de transacción; evita duplicados)" htmlFor="rc-ref">
          <Input id="rc-ref" name="reference" placeholder="Opcional" />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={pending}>{pending ? "Guardando…" : "Registrar pago recibido"}</Button>
        <Feedback state={state} ok="Pago registrado: ya cuenta para la meta." />
      </div>
    </form>
  );
}

export function ReverseReceiptForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reverseReceipt, initialActionState);
  return (
    <details>
      <summary className="cursor-pointer select-none text-[0.7rem] text-ink-dim hover:text-ink">Revertir</summary>
      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <Input name="reason" placeholder="Motivo (devolución, error…)" className="text-xs" required />
        <Button size="sm" variant="secondary" disabled={pending}>Revertir pago</Button>
        <Feedback state={state} ok="Revertido: deja de contar y queda en el historial." />
      </form>
    </details>
  );
}

export function FxRateForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(recordFxRate, initialActionState);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="1 unidad de" htmlFor="fx-base">
          <Input id="fx-base" name="base_currency" defaultValue="USD" maxLength={3} required />
        </Field>
        <Field label="Equivale a" htmlFor="fx-rate">
          <Input id="fx-rate" name="rate" type="number" inputMode="decimal" step="any" min="0" placeholder="3900" required />
        </Field>
        <Field label="Moneda" htmlFor="fx-quote">
          <Input id="fx-quote" name="quote_currency" defaultValue="COP" maxLength={3} required />
        </Field>
        <Field label="Fecha de la tasa" htmlFor="fx-date">
          <Input id="fx-date" name="rate_date" type="date" defaultValue={today} max={today} required />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fuente (obligatoria)" htmlFor="fx-source">
          <Input id="fx-source" name="source" placeholder="TRM Banco de la República" required />
        </Field>
        <Field label="Enlace o documento" htmlFor="fx-ref">
          <Input id="fx-ref" name="source_reference" placeholder="Opcional" />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={pending}>{pending ? "Guardando…" : "Registrar tasa"}</Button>
        <Feedback state={state} ok="Tasa registrada." />
      </div>
    </form>
  );
}
