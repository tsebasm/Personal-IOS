"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isConfigMode } from "./guard";
import type { ActionState } from "./types";

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(120),
  description: z.string().trim().max(2000).optional(),
  area_id: z.string().uuid().optional(),
  horizon: z.enum(["largo_plazo", "anual", "trimestral", "mensual"]),
  priority: z.enum(["baja", "media", "alta"]),
  target_value: z.string().optional(),
  unit: z.string().trim().max(40).optional(),
  deadline: z.string().optional(),
});

export async function createGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    horizon: formData.get("horizon"),
    priority: formData.get("priority"),
    target_value: formData.get("target_value") || undefined,
    unit: formData.get("unit") || undefined,
    deadline: formData.get("deadline") || undefined,
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("goals").insert({
    title: d.title,
    description: d.description || null,
    area_id: d.area_id || null,
    horizon: d.horizon,
    priority: d.priority,
    target_value: d.target_value ? Number(d.target_value) : null,
    current_value: d.target_value ? 0 : null,
    unit: d.unit || null,
    deadline: d.deadline || null,
  });
  if (error) return { ok: false, error: "No pudimos crear la meta." };

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

const updateSchema = schema.extend({
  current_value: z.string().optional(),
  status: z.enum(["activo", "pausado", "cumplido", "cancelado"]),
});

export async function updateGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para editar metas." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Meta inválida." };

  const parsed = updateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    horizon: formData.get("horizon"),
    priority: formData.get("priority"),
    target_value: formData.get("target_value") || undefined,
    current_value: formData.get("current_value") || undefined,
    unit: formData.get("unit") || undefined,
    deadline: formData.get("deadline") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("goals")
    .update({
      title: d.title,
      description: d.description || null,
      area_id: d.area_id || null,
      horizon: d.horizon,
      priority: d.priority,
      target_value: d.target_value ? Number(d.target_value) : null,
      current_value: d.current_value ? Number(d.current_value) : null,
      unit: d.unit || null,
      deadline: d.deadline || null,
      status: d.status,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la meta." };

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para eliminar metas." };
  }

  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la meta." };

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}
