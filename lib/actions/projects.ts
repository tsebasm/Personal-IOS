"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(120),
  description: z.string().trim().max(2000).optional(),
  area_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional(),
  status: z.enum(["planeado", "activo", "pausado", "completado", "cancelado"]),
  priority: z.enum(["baja", "media", "alta"]),
  deadline: z.string().optional(),
});

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    goal_id: formData.get("goal_id") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("projects").insert({
    title: d.title,
    description: d.description || null,
    area_id: d.area_id || null,
    goal_id: d.goal_id || null,
    status: d.status,
    priority: d.priority,
    deadline: d.deadline || null,
  });
  if (error) return { ok: false, error: "No pudimos crear el proyecto." };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Proyecto inválido." };

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    goal_id: formData.get("goal_id") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("projects")
    .update({
      title: d.title,
      description: d.description || null,
      area_id: d.area_id || null,
      goal_id: d.goal_id || null,
      status: d.status,
      priority: d.priority,
      deadline: d.deadline || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el proyecto." };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el proyecto." };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}
