"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEVICES, EXECUTION_MODES, TASK_LEVERS } from "@/lib/tasks";
import type { ActionState } from "./types";

const scale = z
  .string()
  .optional()
  .refine((v) => !v || [1, 2, 3, 4, 5].includes(Number(v)), "Usa una escala de 1 a 5.");

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(120),
  description: z.string().trim().max(2000).optional(),
  area_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional(),
  lever: z.enum(TASK_LEVERS).optional(),
  priority: z.enum(["baja", "media", "alta"]),
  impact_score: scale,
  effort: scale,
  execution_mode: z.enum(EXECUTION_MODES).optional(),
  device_required: z.enum(DEVICES).optional(),
  energy_required: z.enum(["baja", "media", "alta"]).optional(),
  estimated_minutes: z.string().optional(),
  deadline: z.string().optional(),
  scheduled_date: z.string().optional(),
});

function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    project_id: formData.get("project_id") || undefined,
    goal_id: formData.get("goal_id") || undefined,
    lever: formData.get("lever") || undefined,
    priority: formData.get("priority"),
    impact_score: formData.get("impact_score") || undefined,
    effort: formData.get("effort") || undefined,
    execution_mode: formData.get("execution_mode") || undefined,
    device_required: formData.get("device_required") || undefined,
    energy_required: formData.get("energy_required") || undefined,
    estimated_minutes: formData.get("estimated_minutes") || undefined,
    deadline: formData.get("deadline") || undefined,
    scheduled_date: formData.get("scheduled_date") || undefined,
  };
}

function toRow(d: z.infer<typeof schema>) {
  return {
    title: d.title,
    description: d.description || null,
    area_id: d.area_id || null,
    project_id: d.project_id || null,
    goal_id: d.goal_id || null,
    lever: d.lever || null,
    priority: d.priority,
    impact_score: d.impact_score ? Number(d.impact_score) : null,
    effort: d.effort ? Number(d.effort) : null,
    execution_mode: d.execution_mode || null,
    device_required: d.device_required || null,
    energy_required: d.energy_required || null,
    estimated_minutes: d.estimated_minutes ? Number(d.estimated_minutes) : null,
    deadline: d.deadline || null,
    scheduled_date: d.scheduled_date || null,
  };
}

function revalidate() {
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard");
}

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse(readForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("tasks").insert(toRow(parsed.data));
  if (error) return { ok: false, error: "No pudimos crear la tarea." };

  revalidate();
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

  const parsed = updateSchema.safeParse({ ...readForm(formData), status: formData.get("status") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("tasks")
    .update({
      ...toRow(d),
      status: d.status,
      completed_at: d.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la tarea." };

  revalidate();
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

  revalidate();
  return { ok: true };
}
