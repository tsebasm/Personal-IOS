"use client";

import { Pencil } from "lucide-react";
import { updateTask } from "@/lib/actions/tasks";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  energy_required?: string | null;
  estimated_minutes?: number | null;
  deadline: string | null;
  scheduled_date: string | null;
  area_id?: string | null;
  project_id?: string | null;
};

export function EditTaskButton({
  task,
  areas,
  projects,
}: {
  task: Task;
  areas: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateTask);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar tarea">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={task.id} />
          <Field label="Nombre" htmlFor="edit-task-title">
            <Input id="edit-task-title" name="title" required maxLength={120} defaultValue={task.title} />
          </Field>

          <Field label="Descripción" htmlFor="edit-task-description">
            <Textarea id="edit-task-description" name="description" maxLength={2000} defaultValue={task.description ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="edit-task-area">
              <Select id="edit-task-area" name="area_id" defaultValue={task.area_id ?? ""}>
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Proyecto" htmlFor="edit-task-project">
              <Select id="edit-task-project" name="project_id" defaultValue={task.project_id ?? ""}>
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado" htmlFor="edit-task-status">
              <Select id="edit-task-status" name="status" defaultValue={task.status}>
                <option value="inbox">Inbox</option>
                <option value="next">Next</option>
                <option value="today">Hoy</option>
                <option value="in_progress">En progreso</option>
                <option value="waiting">Esperando</option>
                <option value="done">Completada</option>
                <option value="cancelled">Cancelada</option>
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor="edit-task-priority">
              <Select id="edit-task-priority" name="priority" defaultValue={task.priority}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Energía" htmlFor="edit-task-energy">
              <Select id="edit-task-energy" name="energy_required" defaultValue={task.energy_required ?? ""}>
                <option value="">Sin especificar</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Duración estimada (min)" htmlFor="edit-task-duration">
              <Input
                id="edit-task-duration"
                name="estimated_minutes"
                type="number"
                min="0"
                step="1"
                defaultValue={task.estimated_minutes ?? ""}
              />
            </Field>

            <Field label="Fecha límite" htmlFor="edit-task-deadline">
              <Input id="edit-task-deadline" name="deadline" type="date" defaultValue={task.deadline ?? ""} />
            </Field>

            <Field label="Programar para" htmlFor="edit-task-scheduled">
              <Input id="edit-task-scheduled" name="scheduled_date" type="date" defaultValue={task.scheduled_date ?? ""} />
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
