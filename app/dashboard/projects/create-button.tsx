"use client";

import { createProject } from "@/lib/actions/projects";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export function CreateProjectButton({
  areas,
  goals,
}: {
  areas: { id: string; name: string }[];
  goals: { id: string; title: string }[];
}) {
  const { open, setOpen, state, formAction, pending } = useModalForm(createProject);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nuevo proyecto
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo proyecto">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor="project-title">
            <Input id="project-title" name="title" required maxLength={120} placeholder="Conseguir primer cliente" />
          </Field>

          <Field label="Descripción" htmlFor="project-description">
            <Textarea id="project-description" name="description" maxLength={2000} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" htmlFor="project-area">
              <Select id="project-area" name="area_id" defaultValue="">
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Meta relacionada" htmlFor="project-goal">
              <Select id="project-goal" name="goal_id" defaultValue="">
                <option value="">Sin meta</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado" htmlFor="project-status">
              <Select id="project-status" name="status" defaultValue="planeado">
                <option value="planeado">Planeado</option>
                <option value="activo">Activo</option>
                <option value="pausado">En pausa</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </Field>

            <Field label="Prioridad" htmlFor="project-priority">
              <Select id="project-priority" name="priority" defaultValue="media">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>

            <Field label="Deadline" htmlFor="project-deadline">
              <Input id="project-deadline" name="deadline" type="date" />
            </Field>
          </div>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear proyecto"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
