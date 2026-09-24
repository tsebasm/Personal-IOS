"use client";

import { saveFunnelAssumptions, savePipelineSnapshot } from "@/lib/actions/plan";
import type { FunnelAssumptions, PipelineSnapshotSettings } from "@/lib/agencia/plan-settings";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const RATE_FIELDS = [
  { name: "reply_rate", label: "Tasa de respuesta (%)" },
  { name: "booking_rate", label: "Tasa de agendamiento (%)" },
  { name: "show_rate", label: "Tasa de asistencia (%)" },
  { name: "close_rate", label: "Tasa de cierre (%)" },
] as const;

const OTHER_FIELDS = [
  { name: "sales_cycle_days", label: "Ciclo de venta (días, contacto → cierre)", step: "1" },
  { name: "minutes_per_contact", label: "Minutos por contacto", step: "any" },
  { name: "outreach_days_per_week", label: "Días de prospección por semana", step: "1" },
  { name: "setup_fee", label: "Setup de la oferta (COP)", step: "any" },
  { name: "monthly_fee", label: "Fee mensual de la oferta (COP)", step: "any" },
] as const;

export function AssumptionsButton({ assumptions }: { assumptions: FunnelAssumptions }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(saveFunnelAssumptions);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Editar supuestos
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Supuestos del embudo (ESTIMACIÓN)">
        <form action={formAction} className="flex flex-col gap-3">
          <p className="text-xs text-ink-dim">
            Se usan solo mientras no haya muestra suficiente de datos reales. Vacío = no sé (el plan dirá qué falta).
          </p>
          <div className="grid grid-cols-2 gap-3">
            {RATE_FIELDS.map((f) => (
              <Field key={f.name} label={f.label} htmlFor={`assume-${f.name}`}>
                <Input
                  id={`assume-${f.name}`}
                  name={f.name}
                  type="number"
                  min="0.01"
                  max="100"
                  step="any"
                  defaultValue={assumptions[f.name] ?? ""}
                />
              </Field>
            ))}
            {OTHER_FIELDS.map((f) => (
              <Field key={f.name} label={f.label} htmlFor={`assume-${f.name}`}>
                <Input
                  id={`assume-${f.name}`}
                  name={f.name}
                  type="number"
                  min="0"
                  step={f.step}
                  defaultValue={assumptions[f.name] ?? ""}
                />
              </Field>
            ))}
          </div>
          <Field label="Fuente de estas estimaciones" htmlFor="assume-source">
            <Textarea
              id="assume-source"
              name="source"
              maxLength={500}
              defaultValue={assumptions.source ?? ""}
              placeholder="VANT_Brain/Core/Métricas Objetivo (v1), intuición, benchmark…"
            />
          </Field>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar supuestos"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function PipelineButton({ pipeline, today }: { pipeline: PipelineSnapshotSettings; today: string }) {
  const { open, setOpen, state, formAction, pending } = useModalForm(savePipelineSnapshot);
  const fields = [
    { name: "replied", label: "Respondieron (sin cita aún)" },
    { name: "booked", label: "Cita agendada (aún no ocurre)" },
    { name: "showed", label: "Asistieron (propuesta/decisión pendiente)" },
  ] as const;

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Actualizar pipeline
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Pipeline abierto hoy">
        <form action={formAction} className="flex flex-col gap-3">
          <p className="text-xs text-ink-dim">
            Oportunidades vivas (ni ganadas ni perdidas) según la última etapa que alcanzaron.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <Field key={f.name} label={f.label} htmlFor={`pipe-${f.name}`}>
                <Input id={`pipe-${f.name}`} name={f.name} type="number" min="0" step="1" defaultValue={pipeline[f.name]} />
              </Field>
            ))}
            <Field label="Fecha de corte" htmlFor="pipe-as-of">
              <Input id="pipe-as-of" name="as_of" type="date" required defaultValue={today} />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar pipeline"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
