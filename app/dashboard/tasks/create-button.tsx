"use client";

import { createTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { TaskFormModal, type TaskFormOptions } from "./task-form";

export function CreateTaskButton(options: TaskFormOptions) {
  return (
    <TaskFormModal
      {...options}
      action={createTask}
      title="Nueva tarea"
      submitLabel="Crear tarea"
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nueva tarea
        </Button>
      )}
    />
  );
}
