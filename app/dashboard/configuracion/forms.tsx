"use client";

import { useActionState } from "react";
import { addPriorityRule, archivePriorityRule, loadStarterRules } from "@/lib/actions/priority-rules";
import { initialActionState } from "@/lib/actions/types";
import { TASK_LEVERS, TASK_LEVER_LABEL } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function RuleForm({ systems }: { systems: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(addPriorityRule, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Sistema" htmlFor="pr-sys">
          <Select id="pr-sys" name="system_id" defaultValue="">
            <option value="">Cualquiera</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Palanca" htmlFor="pr-lever">
          <Select id="pr-lever" name="lever" defaultValue="">
            <option value="">Cualquiera</option>
            {TASK_LEVERS.map((l) => (
              <option key={l} value={l}>
                {TASK_LEVER_LABEL[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nivel" htmlFor="pr-tier">
          <Select id="pr-tier" name="tier" defaultValue="p0">
            <option value="p0">P0 — crítico</option>
            <option value="p1">P1 — capacidad</option>
            <option value="p2">P2 — secundario</option>
          </Select>
        </Field>
      </div>
      <Field label="Por qué (opcional)" htmlFor="pr-note">
        <Input id="pr-note" name="note" maxLength={300} />
      </Field>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={pending}>Guardar regla</Button>
        {state.error && <p className="text-xs text-warn">{state.error}</p>}
      </div>
    </form>
  );
}

export function RuleArchive({ id }: { id: string }) {
  const [state, action, pending] = useActionState(archivePriorityRule, initialActionState);
  return (
    <form action={action} className="flex flex-col items-end">
      <input type="hidden" name="id" value={id} />
      <Button size="sm" variant="ghost" disabled={pending}>Archivar</Button>
      {state.error && <p className="text-[0.7rem] text-warn">{state.error}</p>}
    </form>
  );
}

export function StarterRules() {
  const [state, action, pending] = useActionState(loadStarterRules, initialActionState);
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <Button size="sm" variant="secondary" disabled={pending}>Cargar reglas sugeridas (por palanca)</Button>
      <p className="text-[0.7rem] text-ink-dim">Prospección, seguimiento, llamadas, propuestas y entrega → P0 · validación, construcción y estudio → P1 · contenido, administración y personal → P2. Puedes archivar o cambiar cualquiera.</p>
      {state.error && <p className="text-[0.7rem] text-warn">{state.error}</p>}
    </form>
  );
}
