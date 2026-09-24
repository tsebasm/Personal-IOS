"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isConfigMode } from "./guard";
import type { ActionState } from "./types";

const optionalNumber = z
  .string()
  .optional()
  .refine((v) => !v || Number.isFinite(Number(v)), "Valor numérico inválido.");

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(120),
  description: z.string().trim().max(2000).optional(),
  area_id: z.string().uuid().optional(),
  parent_goal_id: z.string().uuid().optional(),
  horizon: z.enum(["largo_plazo", "anual", "trimestral", "mensual"]),
  kind: z.enum(["metric", "milestone", "ongoing"]),
  priority: z.enum(["baja", "media", "alta"]),
  baseline_value: optionalNumber,
  target_value: optionalNumber,
  unit: z.string().trim().max(40).optional(),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
  is_north_star: z.boolean(),
});

function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    parent_goal_id: formData.get("parent_goal_id") || undefined,
    horizon: formData.get("horizon"),
    kind: formData.get("kind") || "milestone",
    priority: formData.get("priority"),
    baseline_value: formData.get("baseline_value") || undefined,
    target_value: formData.get("target_value") || undefined,
    unit: formData.get("unit") || undefined,
    start_date: formData.get("start_date") || undefined,
    deadline: formData.get("deadline") || undefined,
    is_north_star: formData.get("is_north_star") === "on",
  };
}

const num = (v: string | undefined) => (v ? Number(v) : null);

function toRow(d: z.infer<typeof schema>) {
  return {
    title: d.title,
    description: d.description || null,
    area_id: d.area_id || null,
    parent_goal_id: d.parent_goal_id || null,
    horizon: d.horizon,
    kind: d.kind,
    priority: d.priority,
    baseline_value: num(d.baseline_value),
    target_value: num(d.target_value),
    unit: d.unit || null,
    start_date: d.start_date || null,
    deadline: d.deadline || null,
  };
}

/**
 * La meta principal vive en profiles.north_star_goal_id (una sola a la vez).
 * Desmarcar solo limpia el perfil si esta meta era la principal.
 */
async function syncNorthStar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goalId: string,
  isNorthStar: boolean
) {
  if (isNorthStar) {
    await supabase.from("profiles").update({ north_star_goal_id: goalId }).eq("id", userId);
  } else {
    await supabase
      .from("profiles")
      .update({ north_star_goal_id: null })
      .eq("id", userId)
      .eq("north_star_goal_id", goalId);
  }
}

function revalidate() {
  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agencia");
}

export async function createGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse(readForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const row = toRow(d);

  const { data: created, error } = await supabase
    .from("goals")
    .insert({
      ...row,
      // Al crear, el valor actual es el Punto A: todavía no hay progreso propio.
      current_value: row.target_value !== null ? (row.baseline_value ?? 0) : null,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "No pudimos crear la meta." };

  if (d.is_north_star) await syncNorthStar(supabase, user.id, created.id, true);

  revalidate();
  return { ok: true };
}

const updateSchema = schema.extend({
  current_value: optionalNumber,
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
    ...readForm(formData),
    current_value: formData.get("current_value") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.parent_goal_id === id) return { ok: false, error: "Una meta no puede ser su propia meta padre." };

  const { error } = await supabase
    .from("goals")
    .update({ ...toRow(d), current_value: num(d.current_value), status: d.status })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la meta." };

  await syncNorthStar(supabase, user.id, id, d.is_north_star);

  revalidate();
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

  revalidate();
  return { ok: true };
}
