"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { createLead, logFollowup, updateLead } from "@/lib/actions/leads";
import type { ActionState } from "@/lib/actions/types";
import { LEAD_STAGES, LEAD_STAGE_LABEL, type Lead } from "@/lib/agencia/leads";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type HypothesisOption = { id: string; statement: string };

function LeadFormModal({
  action,
  title,
  submitLabel,
  trigger,
  initial,
  hypotheses,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  initial?: Lead;
  hypotheses: HypothesisOption[];
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const [stage, setStage] = useState(initial?.stage ?? "contacted");
  const p = initial ? `lead-${initial.id}` : "lead-new";

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="flex flex-col gap-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" htmlFor={`${p}-name`}>
              <Input id={`${p}-name`} name="name" required maxLength={120} defaultValue={initial?.name} />
            </Field>
            <Field label="Empresa / firma" htmlFor={`${p}-company`}>
              <Input id={`${p}-company`} name="company" maxLength={120} defaultValue={initial?.company ?? ""} />
            </Field>
            <Field label="Canal" htmlFor={`${p}-channel`}>
              <Input id={`${p}-channel`} name="channel" maxLength={80} defaultValue={initial?.channel ?? ""} placeholder="Instagram DM, email…" />
            </Field>
            <Field label="Etapa" htmlFor={`${p}-stage`}>
              <Select
                id={`${p}-stage`}
                name="stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as Lead["stage"])}
              >
                {LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STAGE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Próximo follow-up" htmlFor={`${p}-next`}>
              <Input id={`${p}-next`} name="next_followup_on" type="date" defaultValue={initial?.next_followup_on ?? ""} />
            </Field>
            <Field label="Valor estimado (COP)" htmlFor={`${p}-value`}>
              <Input id={`${p}-value`} name="est_value" type="number" min="0" step="any" defaultValue={initial?.est_value ?? ""} />
            </Field>
          </div>
          <Field label="Hipótesis (nicho/oferta) que representa" htmlFor={`${p}-hyp`}>
            <Select id={`${p}-hyp`} name="hypothesis_id" defaultValue={initial?.hypothesis_id ?? ""}>
              <option value="">— Sin atribuir —</option>
              {hypotheses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.statement.slice(0, 80)}
                </option>
              ))}
            </Select>
          </Field>
          {stage === "lost" && (
            <Field label="¿Por qué se perdió?" htmlFor={`${p}-lost`}>
              <Input id={`${p}-lost`} name="lost_reason" required maxLength={300} defaultValue={initial?.lost_reason ?? ""} />
            </Field>
          )}
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

export function CreateLeadButton({ hypotheses }: { hypotheses: HypothesisOption[] }) {
  return (
    <LeadFormModal
      action={createLead}
      title="Nuevo lead"
      submitLabel="Crear lead"
      hypotheses={hypotheses}
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nuevo lead
        </Button>
      )}
    />
  );
}

export function EditLeadButton({ lead, hypotheses }: { lead: Lead; hypotheses: HypothesisOption[] }) {
  return (
    <LeadFormModal
      action={updateLead}
      title="Editar lead"
      submitLabel="Guardar cambios"
      initial={lead}
      hypotheses={hypotheses}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}

/** "Hice el follow-up": suma uno y agenda el siguiente en N días (o ninguno). */
export function FollowupDoneButton({ leadId, today }: { leadId: string; today: string }) {
  const [pending, start] = useTransition();
  const [days, setDays] = useState("3");
  const next = (d: string) => {
    if (!d) return null;
    const [y, m, dd] = today.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, dd + Number(d)));
    return dt.toISOString().slice(0, 10);
  };
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={days}
        onChange={(e) => setDays(e.target.value)}
        aria-label="Próximo follow-up en"
        className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs text-ink"
      >
        <option value="1">+1 día</option>
        <option value="3">+3 días</option>
        <option value="7">+7 días</option>
        <option value="">sin próximo</option>
      </select>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(() => void logFollowup(leadId, next(days)))}>
        {pending ? "…" : "Follow-up hecho"}
      </Button>
    </div>
  );
}
