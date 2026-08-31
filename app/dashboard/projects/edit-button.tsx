"use client";

import { Pencil } from "lucide-react";
import { updateProject } from "@/lib/actions/projects";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  area_id?: string | null;
  goal_id?: string | null;
  priority?: string;
};

export function EditProjectButton({
  project,
  areas,
  goals,
}: {
  project: Project;
  areas: { id: string; name: string }[];
  goals: { id: string; title: string }[];
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(updateProject);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Editar" className="text-ink-dim hover:text-ink">
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar proyecto">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={project.id} />
          <Field label="Nombre" htmlFor="edit-project-title">
            <Input id="edit-project-title" name="title" required maxLength={120} defaultValue={project.title} />
          </Field>

          <Field label="Descripción" htmlFor="edit-project-description">
            <Textarea id="edit-project-description" name="description" maxLength={2000} defaultValue={project.description ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="edit-project-area">
              <Select id="edit-project-area" name="area_id" defaultValue={project.area_id ?? ""}>
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Meta" htmlFor="edit-project-goal">
              <Select id="edit-project-goal" name="goal_id" defaultValue={project.goal_id ?? ""}>
                <option value="">Sin meta</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado" htmlFor="edit-project-status">
              <Select id="edit-project-status" name="status" defaultValue={project.status}>
                <option value="planeado">Planeado</option>
                <option value="activo">Activo</option>
                <option value="pausado">En pausa</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor="edit-project-priority">
              <Select id="edit-project-priority" name="priority" defaultValue={project.priority ?? "media"}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Deadline" htmlFor="edit-project-deadline">
              <Input id="edit-project-deadline" name="deadline" type="date" defaultValue={project.deadline ?? ""} />
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
