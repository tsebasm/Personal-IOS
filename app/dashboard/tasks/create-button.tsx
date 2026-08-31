"use client";

import { createTask } from "@/lib/actions/tasks";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export function CreateTaskButton({
  areas,
  projects,
}: {
  areas: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(createTask);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva tarea
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva tarea">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor="task-title">
            <Input id="task-title" name="title" required maxLength={120} placeholder="Contactar 20 prospectos" />
          </Field>

          <Field label="Descripción" htmlFor="task-description">
            <Textarea id="task-description" name="description" maxLength={2000} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="task-area">
              <Select id="task-area" name="area_id" defaultValue="">
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Proyecto" htmlFor="task-project">
              <Select id="task-project" name="project_id" defaultValue="">
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor="task-priority">
              <Select id="task-priority" name="priority" defaultValue="media">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Energía" htmlFor="task-energy">
              <Select id="task-energy" name="energy_required" defaultValue="">
                <option value="">Sin especificar</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Duración estimada (min)" htmlFor="task-duration">
              <Input id="task-duration" name="estimated_minutes" type="number" min="0" step="1" />
            </Field>

            <Field label="Fecha límite" htmlFor="task-deadline">
              <Input id="task-deadline" name="deadline" type="date" />
            </Field>

            <Field label="Programar para" htmlFor="task-scheduled">
              <Input id="task-scheduled" name="scheduled_date" type="date" />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear tarea"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
