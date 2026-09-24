"use client";

import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/actions/types";
import {
  HYPOTHESIS_STATUSES,
  HYPOTHESIS_STATUS_LABEL,
  HYPOTHESIS_TYPES,
  HYPOTHESIS_TYPE_LABEL,
  type Hypothesis,
} from "@/lib/agencia/hypotheses";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  submitLabel: string;
  trigger: (open: () => void) => React.ReactNode;
  /** Otras hipótesis, para marcar cuál reemplaza a esta (sin borrar el histórico). */
  others: Pick<Hypothesis, "id" | "statement">[];
  initial?: Hypothesis;
};

const SCORES = [
  { name: "urgency", label: "Urgencia del problema" },
  { name: "ability_to_pay", label: "Capacidad de pago" },
  { name: "competition", label: "Competencia (5 = mucha)" },
  { name: "offer_potential", label: "Potencial de oferta" },
] as const;

/** Formulario único para crear y editar — evita dos copias divergentes. */
export function HypothesisFormModal({ action, title, submitLabel, trigger, others, initial }: Props) {
  const { open, setOpen, state, formAction, pending } = useModalForm(action);
  const idPrefix = initial ? `hyp-${initial.id}` : "hyp-new";

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="flex flex-col gap-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor={`${idPrefix}-type`}>
              <Select id={`${idPrefix}-type`} name="type" defaultValue={initial?.type ?? "niche"}>
                {HYPOTHESIS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {HYPOTHESIS_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado" htmlFor={`${idPrefix}-status`}>
              <Select id={`${idPrefix}-status`} name="status" defaultValue={initial?.status ?? "untested"}>
                {HYPOTHESIS_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {HYPOTHESIS_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Hipótesis" htmlFor={`${idPrefix}-statement`}>
            <Textarea
              id={`${idPrefix}-statement`}
              name="statement"
              required
              maxLength={500}
              defaultValue={initial?.statement ?? ""}
              placeholder="Ej.: Abogados de familia en Colombia con $12M+/mes pagan por consultas calificadas."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mercado" htmlFor={`${idPrefix}-market`}>
              <Input id={`${idPrefix}-market`} name="market" maxLength={80} defaultValue={initial?.market ?? ""} placeholder="Colombia, USA…" />
            </Field>
            <Field label="Canal de adquisición" htmlFor={`${idPrefix}-channel`}>
              <Input id={`${idPrefix}-channel`} name="channel" maxLength={80} defaultValue={initial?.channel ?? ""} />
            </Field>
          </div>

          <Field label="ICP" htmlFor={`${idPrefix}-icp`}>
            <Input id={`${idPrefix}-icp`} name="icp" maxLength={500} defaultValue={initial?.icp ?? ""} />
          </Field>
          <Field label="Problema" htmlFor={`${idPrefix}-problem`}>
            <Input id={`${idPrefix}-problem`} name="problem" maxLength={500} defaultValue={initial?.problem ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            {SCORES.map((s) => (
              <Field key={s.name} label={`${s.label} (1-5)`} htmlFor={`${idPrefix}-${s.name}`}>
                <Input
                  id={`${idPrefix}-${s.name}`}
                  name={s.name}
                  type="number"
                  min="1"
                  max="5"
                  step="1"
                  defaultValue={initial?.[s.name] ?? ""}
                />
              </Field>
            ))}
            <Field label="Confianza (0-100)" htmlFor={`${idPrefix}-confidence`}>
              <Input
                id={`${idPrefix}-confidence`}
                name="confidence"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={initial?.confidence ?? ""}
              />
            </Field>
            <Field label="Fuente" htmlFor={`${idPrefix}-source`}>
              <Input
                id={`${idPrefix}-source`}
                name="source"
                maxLength={300}
                defaultValue={initial?.source ?? ""}
                placeholder="VANT_Brain/Core/…, llamada, dato"
              />
            </Field>
          </div>

          <Field label="Evidencia" htmlFor={`${idPrefix}-evidence`}>
            <Textarea
              id={`${idPrefix}-evidence`}
              name="evidence"
              maxLength={4000}
              defaultValue={initial?.evidence ?? ""}
              placeholder="Qué dato real la respalda o la contradice. Vacío = sin evidencia todavía."
            />
          </Field>

          {others.length > 0 && (
            <Field label="Reemplazada por" htmlFor={`${idPrefix}-superseded`}>
              <Select id={`${idPrefix}-superseded`} name="superseded_by" defaultValue={initial?.superseded_by ?? ""}>
                <option value="">— Ninguna —</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.statement.slice(0, 80)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

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
