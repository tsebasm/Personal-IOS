"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(120),
  description: z.string().trim().max(2000).optional(),
  area_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  priority: z.enum(["baja", "media", "alta"]),
  energy_required: z.enum(["baja", "media", "alta"]).optional(),
  estimated_minutes: z.string().optional(),
  deadline: z.string().optional(),
  scheduled_date: z.string().optional(),
});

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    project_id: formData.get("project_id") || undefined,
    priority: formData.get("priority"),
    energy_required: formData.get("energy_required") || undefined,
    estimated_minutes: formData.get("estimated_minutes") || undefined,
    deadline: formData.get("deadline") || undefined,
    scheduled_date: formData.get("scheduled_date") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("tasks").insert({
    title: d.title,
    description: d.description || null,
    area_id: d.area_id || null,
    project_id: d.project_id || null,
    priority: d.priority,
    energy_required: d.energy_required || null,
    estimated_minutes: d.estimated_minutes ? Number(d.estimated_minutes) : null,
    deadline: d.deadline || null,
    scheduled_date: d.scheduled_date || null,
  });
  if (error) return { ok: false, error: "No pudimos crear la tarea." };

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard");
  return { ok: true };
}

const updateSchema = schema.extend({
  status: z.enum(["inbox", "next", "today", "in_progress", "waiting", "done", "cancelled"]),
});

export async function updateTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Tarea inválida." };

  const parsed = updateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    project_id: formData.get("project_id") || undefined,
    priority: formData.get("priority"),
    energy_required: formData.get("energy_required") || undefined,
    estimated_minutes: formData.get("estimated_minutes") || undefined,
    deadline: formData.get("deadline") || undefined,
    scheduled_date: formData.get("scheduled_date") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("tasks")
    .update({
      title: d.title,
      description: d.description || null,
      area_id: d.area_id || null,
      project_id: d.project_id || null,
      priority: d.priority,
      energy_required: d.energy_required || null,
      estimated_minutes: d.estimated_minutes ? Number(d.estimated_minutes) : null,
      deadline: d.deadline || null,
      scheduled_date: d.scheduled_date || null,
      status: d.status,
      completed_at: d.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la tarea." };

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la tarea." };

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard");
  return { ok: true };
}
