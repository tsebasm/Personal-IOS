"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isConfigMode } from "./guard";
import type { ActionState } from "./types";

const schema = z
  .object({
    title: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
    area_id: z.string().uuid().optional(),
    goal_id: z.string().uuid().optional(),
    frequency: z.enum(["diaria", "semanal", "custom"]),
    target_per_period: z.string().optional(),
    days_of_week: z.array(z.coerce.number().int().min(0).max(6)),
    time_of_day: z.string().optional(),
  })
  .refine((d) => d.frequency !== "custom" || d.days_of_week.length > 0, "Elige al menos un día para un hábito de días específicos.");

function readForm(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    area_id: formData.get("area_id") || undefined,
    goal_id: formData.get("goal_id") || undefined,
    frequency: formData.get("frequency"),
    target_per_period: formData.get("target_per_period") || undefined,
    days_of_week: formData.getAll("days_of_week"),
    time_of_day: formData.get("time_of_day") || undefined,
  });
}

/** days_of_week solo aplica a 'custom'; target solo a 'semanal' (1..7). */
function toRow(d: z.infer<typeof schema>) {
  return {
    title: d.title,
    area_id: d.area_id || null,
    goal_id: d.goal_id || null,
    frequency: d.frequency,
    target_per_period: d.frequency === "semanal" ? Math.min(7, Math.max(1, Number(d.target_per_period) || 1)) : 1,
    days_of_week: d.frequency === "custom" ? [...new Set(d.days_of_week)].sort() : null,
    time_of_day: d.time_of_day || null,
  };
}

export async function createHabit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("habits").insert(toRow(d));
  if (error) return { ok: false, error: "No pudimos crear el hábito." };

  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateHabit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para editar hábitos." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Hábito inválido." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("habits")
    .update(toRow(d))
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el hábito." };

  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Marca/desmarca el cumplimiento de un hábito en una fecha — uso diario, no requiere modo configuración. */
export async function toggleHabitLog(habitId: string, date: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id, done")
    .eq("habit_id", habitId)
    .eq("date", date)
    .maybeSingle();

  const { error } = existing?.done
    ? await supabase.from("habit_logs").delete().eq("id", existing.id)
    : await supabase.from("habit_logs").upsert({ habit_id: habitId, date, done: true }, { onConflict: "habit_id,date" });
  if (error) return { ok: false, error: "No pudimos actualizar el registro del hábito." };

  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteHabit(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para eliminar hábitos." };
  }

  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el hábito." };

  revalidatePath("/dashboard/habits");
  revalidatePath("/dashboard");
  return { ok: true };
}
