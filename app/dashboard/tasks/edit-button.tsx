"use client";

import { Pencil } from "lucide-react";
import { updateTask } from "@/lib/actions/tasks";
import { TaskFormModal, type TaskFormOptions, type TaskFormValues } from "./task-form";

export function EditTaskButton({ task, ...options }: TaskFormOptions & { task: TaskFormValues }) {
  return (
    <TaskFormModal
      {...options}
      action={updateTask}
      title="Editar tarea"
      submitLabel="Guardar cambios"
      initial={task}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
